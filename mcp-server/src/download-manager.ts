import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import pLimit from 'p-limit';
import { fileTypeFromBuffer } from 'file-type';
import { Logger } from './logger.js';
import { PexelsVideo } from './pexels-client.js';

export interface DownloadOptions {
  video_id: number;
  quality?: 'hd' | 'sd' | 'mobile';
  filename?: string;
  category?: string;
}

export interface BatchDownloadOptions {
  max_videos?: number;
  quality?: 'hd' | 'sd' | 'mobile';
  category?: string;
  filter_criteria?: {
    min_width?: number;
    min_height?: number;
    preferred_fps?: number;
    exclude_ids?: number[];
  };
}

export interface DownloadResult {
  video_id: number;
  local_path: string;
  file_size: number;
  download_time: number;
  metadata: {
    width: number;
    height: number;
    duration: number;
    fps: number;
    codec: string;
    bitrate: string;
  };
  status: 'success' | 'failed';
  error?: string;
}

export interface VideoMetadata {
  id: number;
  filename: string;
  local_path: string;
  file_size: number;
  download_date: string;
  category?: string;
  pexels_metadata: {
    width: number;
    height: number;
    duration: number;
    url: string;
    tags: string[];
    user: {
      id: number;
      name: string;
      url: string;
    };
  };
}

type LimitFunction = ReturnType<typeof pLimit>;

export class DownloadManager {
  private downloadPath: string;
  private concurrencyLimit: LimitFunction;
  private logger: Logger;
  private metadataFile: string;
  private downloadedVideos: Set<number>;

  constructor(downloadPath: string, maxConcurrent: number, logger: Logger) {
    this.downloadPath = downloadPath;
    this.concurrencyLimit = pLimit(maxConcurrent);
    this.logger = logger;
    this.metadataFile = path.join(downloadPath, 'metadata.json');
    this.downloadedVideos = new Set();
    
    this.initialize();
  }

  private async initialize() {
    // Ensure download directory exists
    await fs.ensureDir(this.downloadPath);
    
    // Load existing metadata
    await this.loadMetadata();
  }

  private async loadMetadata() {
    try {
      if (await fs.pathExists(this.metadataFile)) {
        const metadata = await fs.readJson(this.metadataFile);
        metadata.forEach((video: VideoMetadata) => {
          this.downloadedVideos.add(video.id);
        });
        this.logger.info(`Loaded metadata for ${this.downloadedVideos.size} videos`);
      }
    } catch (error) {
      this.logger.error('Error loading metadata:', error);
    }
  }

  private async saveMetadata(videoMetadata: VideoMetadata) {
    try {
      let metadata: VideoMetadata[] = [];
      
      if (await fs.pathExists(this.metadataFile)) {
        metadata = await fs.readJson(this.metadataFile);
      }
      
      // Remove existing entry if it exists
      metadata = metadata.filter(video => video.id !== videoMetadata.id);
      
      // Add new entry
      metadata.push(videoMetadata);
      
      await fs.writeJson(this.metadataFile, metadata, { spaces: 2 });
      this.downloadedVideos.add(videoMetadata.id);
      
      this.logger.info(`Saved metadata for video ${videoMetadata.id}`);
    } catch (error) {
      this.logger.error('Error saving metadata:', error);
    }
  }

  async downloadVideo(videoDetails: any, options: DownloadOptions): Promise<DownloadResult> {
    const startTime = Date.now();
    const videoId = options.video_id;
    
    try {
      // Check if already downloaded
      if (this.downloadedVideos.has(videoId)) {
        this.logger.info(`Video ${videoId} already downloaded`);
        return this.getExistingDownloadResult(videoId);
      }

      // Find the best quality video file
      const videoFile = this.selectBestQuality(videoDetails.data.video_files, options.quality || 'hd');
      
      if (!videoFile) {
        throw new Error(`No suitable video file found for quality: ${options.quality}`);
      }

      // Generate filename
      const filename = options.filename || this.generateFilename(videoDetails.data, options.category);
      const categoryPath = options.category ? path.join(this.downloadPath, options.category) : this.downloadPath;
      const localPath = path.join(categoryPath, filename);

      // Ensure category directory exists
      await fs.ensureDir(categoryPath);

      // Download the video
      this.logger.info(`Downloading video ${videoId} to ${localPath}`);
      
      const response = await axios({
        method: 'GET',
        url: videoFile.link,
        responseType: 'stream',
        timeout: 60000,
      });

      const writer = fs.createWriteStream(localPath);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', reject);
      });

      const stats = await fs.stat(localPath);
      const downloadTime = (Date.now() - startTime) / 1000;

      // Save metadata
      const metadata: VideoMetadata = {
        id: videoId,
        filename,
        local_path: localPath,
        file_size: stats.size,
        download_date: new Date().toISOString(),
        category: options.category,
        pexels_metadata: {
          width: videoDetails.data.width,
          height: videoDetails.data.height,
          duration: videoDetails.data.duration,
          url: videoDetails.data.url,
          tags: videoDetails.data.tags || [],
          user: videoDetails.data.user,
        },
      };

      await this.saveMetadata(metadata);

      const result: DownloadResult = {
        video_id: videoId,
        local_path: localPath,
        file_size: stats.size,
        download_time: downloadTime,
        metadata: {
          width: videoFile.width,
          height: videoFile.height,
          duration: videoDetails.data.duration,
          fps: videoFile.fps,
          codec: this.extractCodec(videoFile.file_type),
          bitrate: this.estimateBitrate(stats.size, videoDetails.data.duration),
        },
        status: 'success',
      };

      this.logger.info(`Successfully downloaded video ${videoId}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Error downloading video ${videoId}:`, error);
      
      return {
        video_id: videoId,
        local_path: '',
        file_size: 0,
        download_time: (Date.now() - startTime) / 1000,
        metadata: {
          width: 0,
          height: 0,
          duration: 0,
          fps: 0,
          codec: '',
          bitrate: '',
        },
        status: 'failed',
        error: error.message,
      };
    }
  }

  async batchDownload(videos: PexelsVideo[], options: BatchDownloadOptions): Promise<DownloadResult[]> {
    const filteredVideos = this.filterVideos(videos, options);
    const maxVideos = options.max_videos || 10;
    const videosToDownload = filteredVideos.slice(0, maxVideos);

    this.logger.info(`Starting batch download of ${videosToDownload.length} videos`);

    const downloadPromises = videosToDownload.map(video =>
      this.concurrencyLimit(() =>
        this.downloadVideo(
          { data: video },
          {
            video_id: video.id,
            quality: options.quality,
            category: options.category,
          }
        )
      )
    );

    const results = await Promise.all(downloadPromises);
    const successCount = results.filter(r => r.status === 'success').length;
    
    this.logger.info(`Batch download completed: ${successCount}/${results.length} successful`);
    
    return results;
  }

  private filterVideos(videos: PexelsVideo[], options: BatchDownloadOptions): PexelsVideo[] {
    let filtered = videos;

    if (options.filter_criteria) {
      const criteria = options.filter_criteria;
      
      filtered = filtered.filter(video => {
        // Filter by dimensions
        if (criteria.min_width && video.width < criteria.min_width) return false;
        if (criteria.min_height && video.height < criteria.min_height) return false;
        
        // Filter by FPS
        if (criteria.preferred_fps) {
          const hasPreferredFps = video.video_files.some(file => file.fps === criteria.preferred_fps);
          if (!hasPreferredFps) return false;
        }
        
        // Exclude specific IDs
        if (criteria.exclude_ids && criteria.exclude_ids.includes(video.id)) return false;
        
        // Skip already downloaded videos
        if (this.downloadedVideos.has(video.id)) return false;
        
        return true;
      });
    }

    return filtered;
  }

  private selectBestQuality(videoFiles: any[], quality: string) {
    const qualityOrder = {
      hd: ['hd', 'sd', 'mobile'],
      sd: ['sd', 'hd', 'mobile'],
      mobile: ['mobile', 'sd', 'hd'],
    };

    const preferredQualities = qualityOrder[quality] || ['hd', 'sd', 'mobile'];
    
    for (const preferredQuality of preferredQualities) {
      const file = videoFiles.find(f => f.quality === preferredQuality);
      if (file) return file;
    }

    // Fallback to first available file
    return videoFiles[0];
  }

  private generateFilename(videoData: any, category?: string): string {
    const sanitizeTitle = (title: string) => {
      return title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').toLowerCase();
    };

    const tags = videoData.tags && videoData.tags.length > 0 ? videoData.tags.slice(0, 2).join('_') : 'video';
    const sanitizedTags = sanitizeTitle(tags);
    const videoId = videoData.id;
    const timestamp = Date.now();

    return `${sanitizedTags}_${videoId}_${timestamp}.mp4`;
  }

  private extractCodec(fileType: string): string {
    if (fileType.includes('mp4')) return 'h264';
    if (fileType.includes('webm')) return 'vp8';
    return 'unknown';
  }

  private estimateBitrate(fileSize: number, duration: number): string {
    if (duration === 0) return 'unknown';
    const bitrate = Math.round((fileSize * 8) / duration / 1000); // kbps
    return `${bitrate}kbps`;
  }

  private async getExistingDownloadResult(videoId: number): Promise<DownloadResult> {
    try {
      const metadata = await fs.readJson(this.metadataFile);
      const videoMetadata = metadata.find((v: VideoMetadata) => v.id === videoId);
      
      if (videoMetadata) {
        return {
          video_id: videoId,
          local_path: videoMetadata.local_path,
          file_size: videoMetadata.file_size,
          download_time: 0,
          metadata: {
            width: videoMetadata.pexels_metadata.width,
            height: videoMetadata.pexels_metadata.height,
            duration: videoMetadata.pexels_metadata.duration,
            fps: 0,
            codec: 'unknown',
            bitrate: 'unknown',
          },
          status: 'success',
        };
      }
    } catch (error) {
      this.logger.error('Error getting existing download result:', error);
    }

    throw new Error(`Video ${videoId} not found in downloads`);
  }

  async listDownloaded(options: any = {}): Promise<VideoMetadata[]> {
    try {
      if (!await fs.pathExists(this.metadataFile)) {
        return [];
      }

      let metadata: VideoMetadata[] = await fs.readJson(this.metadataFile);

      // Filter by category if specified
      if (options.category) {
        metadata = metadata.filter(video => video.category === options.category);
      }

      // Sort by specified criteria
      const sortBy = options.sort_by || 'date';
      metadata.sort((a, b) => {
        switch (sortBy) {
          case 'date':
            return new Date(b.download_date).getTime() - new Date(a.download_date).getTime();
          case 'size':
            return b.file_size - a.file_size;
          case 'duration':
            return b.pexels_metadata.duration - a.pexels_metadata.duration;
          case 'name':
            return a.filename.localeCompare(b.filename);
          default:
            return 0;
        }
      });

      // Limit results
      const limit = options.limit || 50;
      return metadata.slice(0, limit);
    } catch (error) {
      this.logger.error('Error listing downloaded videos:', error);
      return [];
    }
  }
}