import fs from 'fs-extra';
import path from 'path';
import { Logger } from './logger.js';

export interface UsageStats {
  period: 'hour' | 'day' | 'month';
  api_calls: {
    search_videos: number;
    get_video_details: number;
    total: number;
  };
  downloads: {
    individual: number;
    batch: number;
    total: number;
  };
  storage: {
    total_files: number;
    total_size_bytes: number;
    total_size_mb: number;
  };
  rate_limits: {
    current_remaining: number;
    last_reset: string;
    hits_per_hour: number;
  };
  timestamps: {
    first_call: string;
    last_call: string;
    period_start: string;
  };
}

export interface UsageData {
  timestamp: number;
  type: 'api_call' | 'download' | 'batch_download';
  details: {
    action?: string;
    count?: number;
    size?: number;
  };
}

export class UsageTracker {
  private logger: Logger;
  private usageFile: string;
  private usageData: UsageData[];

  constructor(logger: Logger) {
    this.logger = logger;
    this.usageFile = path.join(process.env.DOWNLOAD_PATH || './downloads', 'usage.json');
    this.usageData = [];
    this.initialize();
  }

  private async initialize() {
    try {
      if (await fs.pathExists(this.usageFile)) {
        this.usageData = await fs.readJson(this.usageFile);
        this.logger.info(`Loaded ${this.usageData.length} usage records`);
      }
    } catch (error) {
      this.logger.error('Error loading usage data:', error);
    }
  }

  private async saveUsage() {
    try {
      await fs.writeJson(this.usageFile, this.usageData, { spaces: 2 });
    } catch (error) {
      this.logger.error('Error saving usage data:', error);
    }
  }

  recordApiCall(action: string) {
    const usage: UsageData = {
      timestamp: Date.now(),
      type: 'api_call',
      details: { action },
    };

    this.usageData.push(usage);
    this.logger.debug(`Recorded API call: ${action}`);
    this.saveUsage();
  }

  recordDownload(size?: number) {
    const usage: UsageData = {
      timestamp: Date.now(),
      type: 'download',
      details: { size },
    };

    this.usageData.push(usage);
    this.logger.debug('Recorded download');
    this.saveUsage();
  }

  recordBatchDownload(count: number) {
    const usage: UsageData = {
      timestamp: Date.now(),
      type: 'batch_download',
      details: { count },
    };

    this.usageData.push(usage);
    this.logger.debug(`Recorded batch download: ${count} files`);
    this.saveUsage();
  }

  getStats(period: 'hour' | 'day' | 'month' = 'hour'): UsageStats {
    const now = Date.now();
    const periodMs = this.getPeriodMs(period);
    const periodStart = now - periodMs;

    // Filter data for the specified period
    const periodData = this.usageData.filter(usage => usage.timestamp >= periodStart);

    // Calculate API calls
    const apiCalls = periodData.filter(usage => usage.type === 'api_call');
    const searchCalls = apiCalls.filter(call => call.details.action === 'search_videos').length;
    const detailsCalls = apiCalls.filter(call => call.details.action === 'get_video_details').length;

    // Calculate downloads
    const downloads = periodData.filter(usage => usage.type === 'download').length;
    const batchDownloads = periodData.filter(usage => usage.type === 'batch_download');
    const batchCount = batchDownloads.reduce((sum, batch) => sum + (batch.details.count || 0), 0);

    // Calculate storage stats
    const storageStats = this.calculateStorageStats();

    // Calculate rate limit stats
    const hourlyData = this.usageData.filter(usage => usage.timestamp >= now - 3600000);
    const hitsPerHour = hourlyData.filter(usage => usage.type === 'api_call').length;

    // Find timestamps
    const allTimestamps = this.usageData.map(usage => usage.timestamp);
    const firstCall = allTimestamps.length > 0 ? Math.min(...allTimestamps) : now;
    const lastCall = allTimestamps.length > 0 ? Math.max(...allTimestamps) : now;

    const stats: UsageStats = {
      period,
      api_calls: {
        search_videos: searchCalls,
        get_video_details: detailsCalls,
        total: apiCalls.length,
      },
      downloads: {
        individual: downloads,
        batch: batchCount,
        total: downloads + batchCount,
      },
      storage: storageStats,
      rate_limits: {
        current_remaining: Math.max(0, 200 - hitsPerHour), // Assuming 200/hour limit
        last_reset: new Date(Math.ceil(now / 3600000) * 3600000).toISOString(),
        hits_per_hour: hitsPerHour,
      },
      timestamps: {
        first_call: new Date(firstCall).toISOString(),
        last_call: new Date(lastCall).toISOString(),
        period_start: new Date(periodStart).toISOString(),
      },
    };

    return stats;
  }

  private getPeriodMs(period: 'hour' | 'day' | 'month'): number {
    switch (period) {
      case 'hour':
        return 3600000; // 1 hour
      case 'day':
        return 86400000; // 24 hours
      case 'month':
        return 2592000000; // 30 days
      default:
        return 3600000;
    }
  }

  private calculateStorageStats(): UsageStats['storage'] {
    try {
      const downloadPath = process.env.DOWNLOAD_PATH || './downloads';
      const metadataFile = path.join(downloadPath, 'metadata.json');
      
      if (!fs.pathExistsSync(metadataFile)) {
        return { total_files: 0, total_size_bytes: 0, total_size_mb: 0 };
      }

      const metadata = fs.readJsonSync(metadataFile);
      const totalSize = metadata.reduce((sum: number, video: any) => sum + (video.file_size || 0), 0);

      return {
        total_files: metadata.length,
        total_size_bytes: totalSize,
        total_size_mb: Math.round(totalSize / (1024 * 1024) * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Error calculating storage stats:', error);
      return { total_files: 0, total_size_bytes: 0, total_size_mb: 0 };
    }
  }

  // Clean up old usage data (keep last 30 days)
  async cleanup() {
    const cutoff = Date.now() - 2592000000; // 30 days
    const originalLength = this.usageData.length;
    
    this.usageData = this.usageData.filter(usage => usage.timestamp > cutoff);
    
    if (this.usageData.length < originalLength) {
      this.logger.info(`Cleaned up ${originalLength - this.usageData.length} old usage records`);
      await this.saveUsage();
    }
  }

  // Get detailed usage breakdown
  getDetailedStats(): {
    daily_breakdown: { [date: string]: number };
    hourly_pattern: { [hour: string]: number };
    most_active_day: string;
    most_active_hour: string;
  } {
    const dailyBreakdown: { [date: string]: number } = {};
    const hourlyPattern: { [hour: string]: number } = {};

    for (const usage of this.usageData) {
      const date = new Date(usage.timestamp);
      const dayKey = date.toISOString().split('T')[0];
      const hourKey = date.getHours().toString().padStart(2, '0');

      dailyBreakdown[dayKey] = (dailyBreakdown[dayKey] || 0) + 1;
      hourlyPattern[hourKey] = (hourlyPattern[hourKey] || 0) + 1;
    }

    const mostActiveDay = Object.keys(dailyBreakdown).reduce((a, b) => 
      dailyBreakdown[a] > dailyBreakdown[b] ? a : b, ''
    );

    const mostActiveHour = Object.keys(hourlyPattern).reduce((a, b) => 
      hourlyPattern[a] > hourlyPattern[b] ? a : b, ''
    );

    return {
      daily_breakdown: dailyBreakdown,
      hourly_pattern: hourlyPattern,
      most_active_day: mostActiveDay,
      most_active_hour: mostActiveHour,
    };
  }
}