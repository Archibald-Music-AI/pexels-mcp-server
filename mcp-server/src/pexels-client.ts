import axios, { AxiosInstance } from 'axios';
import { Logger } from './logger.js';

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  image: string;
  avg_color: string;
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: Array<{
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    fps: number;
    link: string;
  }>;
  tags: string[];
}

export interface PexelsSearchResponse {
  status: string;
  data: {
    total_results: number;
    page: number;
    per_page: number;
    videos: PexelsVideo[];
    rate_limit: {
      remaining: number;
      reset_in: number;
    };
  };
}

export interface SearchParams {
  query: string;
  orientation?: 'landscape' | 'portrait' | 'square';
  size?: 'large' | 'medium' | 'small';
  min_duration?: number;
  max_duration?: number;
  per_page?: number;
  page?: number;
}

export class PexelsClient {
  private client: AxiosInstance;
  private logger: Logger;
  private rateLimit: {
    remaining: number;
    resetTime: number;
  };

  constructor(apiKey: string, logger: Logger) {
    this.logger = logger;
    this.rateLimit = {
      remaining: 200,
      resetTime: Date.now() + 3600000, // 1 hour from now
    };

    this.client = axios.create({
      baseURL: 'https://api.pexels.com',
      headers: {
        'Authorization': apiKey,
        'User-Agent': 'Pexels-MCP-Server/1.0.0',
      },
      timeout: 30000,
    });

    // Add response interceptor to track rate limits
    this.client.interceptors.response.use(
      (response) => {
        const remaining = response.headers['x-ratelimit-remaining'];
        const reset = response.headers['x-ratelimit-reset'];
        
        if (remaining) {
          this.rateLimit.remaining = parseInt(remaining);
        }
        if (reset) {
          this.rateLimit.resetTime = parseInt(reset) * 1000;
        }
        
        return response;
      },
      (error) => {
        if (error.response?.status === 429) {
          this.logger.warn('Rate limit exceeded');
        }
        return Promise.reject(error);
      }
    );
  }

  private checkRateLimit() {
    if (this.rateLimit.remaining <= 0 && Date.now() < this.rateLimit.resetTime) {
      const waitTime = Math.ceil((this.rateLimit.resetTime - Date.now()) / 1000);
      throw new Error(`Rate limit exceeded. Reset in ${waitTime} seconds`);
    }
  }

  async searchVideos(params: SearchParams): Promise<PexelsSearchResponse> {
    this.checkRateLimit();
    
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('query', params.query);
      
      if (params.orientation) searchParams.append('orientation', params.orientation);
      if (params.size) searchParams.append('size', params.size);
      if (params.min_duration) searchParams.append('min_duration', params.min_duration.toString());
      if (params.max_duration) searchParams.append('max_duration', params.max_duration.toString());
      if (params.per_page) searchParams.append('per_page', params.per_page.toString());
      if (params.page) searchParams.append('page', params.page.toString());

      this.logger.info(`Searching videos with query: ${params.query}`);
      
      const response = await this.client.get(`/videos/search?${searchParams.toString()}`);
      
      const result: PexelsSearchResponse = {
        status: 'success',
        data: {
          total_results: response.data.total_results,
          page: response.data.page,
          per_page: response.data.per_page,
          videos: response.data.videos.map((video: any) => ({
            id: video.id,
            width: video.width,
            height: video.height,
            duration: video.duration,
            url: video.url,
            image: video.image,
            avg_color: video.avg_color,
            user: video.user,
            video_files: video.video_files,
            tags: video.tags || [],
          })),
          rate_limit: {
            remaining: this.rateLimit.remaining,
            reset_in: Math.ceil((this.rateLimit.resetTime - Date.now()) / 1000),
          },
        },
      };

      this.logger.info(`Found ${result.data.total_results} videos`);
      return result;
    } catch (error) {
      this.logger.error('Error searching videos:', error);
      throw this.handleError(error);
    }
  }

  async getVideoDetails(videoId: number): Promise<any> {
    this.checkRateLimit();
    
    try {
      this.logger.info(`Getting video details for ID: ${videoId}`);
      
      const response = await this.client.get(`/videos/${videoId}`);
      
      const result = {
        status: 'success',
        data: {
          id: response.data.id,
          width: response.data.width,
          height: response.data.height,
          duration: response.data.duration,
          url: response.data.url,
          image: response.data.image,
          avg_color: response.data.avg_color,
          user: response.data.user,
          video_files: response.data.video_files,
          tags: response.data.tags || [],
          rate_limit: {
            remaining: this.rateLimit.remaining,
            reset_in: Math.ceil((this.rateLimit.resetTime - Date.now()) / 1000),
          },
        },
      };

      return result;
    } catch (error) {
      this.logger.error('Error getting video details:', error);
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          return new Error('INVALID_API_KEY: Invalid or missing Pexels API key');
        case 429:
          return new Error('RATE_LIMIT_EXCEEDED: Pexels API rate limit exceeded');
        case 404:
          return new Error('VIDEO_NOT_FOUND: Requested video not found');
        default:
          return new Error(`API_ERROR: ${error.response.status} ${error.response.statusText}`);
      }
    } else if (error.request) {
      return new Error('NETWORK_ERROR: Failed to connect to Pexels API');
    } else {
      return new Error(`UNKNOWN_ERROR: ${error.message}`);
    }
  }

  getRateLimit() {
    return {
      remaining: this.rateLimit.remaining,
      resetTime: this.rateLimit.resetTime,
    };
  }
}