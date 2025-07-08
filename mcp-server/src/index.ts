#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PexelsClient } from './pexels-client.js';
import { DownloadManager } from './download-manager.js';
import { CacheManager } from './cache-manager.js';
import { Logger } from './logger.js';
import { 
  searchVideosSchema, 
  getVideoDetailsSchema, 
  downloadVideoSchema,
  batchDownloadSchema,
  listDownloadedSchema,
  organizeByCategorySchema,
  getUsageStatsSchema
} from './schemas.js';
import { OrganizationManager } from './organization-manager.js';
import { UsageTracker } from './usage-tracker.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

class PexelsMCPServer {
  private server: Server;
  private pexelsClient: PexelsClient;
  private downloadManager: DownloadManager;
  private cacheManager: CacheManager;
  private organizationManager: OrganizationManager;
  private usageTracker: UsageTracker;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.server = new Server(
      {
        name: process.env.MCP_SERVER_NAME || 'pexels-media-server',
        version: process.env.MCP_SERVER_VERSION || '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.pexelsClient = new PexelsClient(process.env.PEXELS_API_KEY!, this.logger);
    this.cacheManager = new CacheManager(Number(process.env.CACHE_DURATION) || 3600);
    this.downloadManager = new DownloadManager(
      process.env.DOWNLOAD_PATH || './downloads',
      Number(process.env.MAX_CONCURRENT_DOWNLOADS) || 3,
      this.logger
    );
    this.organizationManager = new OrganizationManager(this.logger);
    this.usageTracker = new UsageTracker(this.logger);

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_videos',
            description: 'Search Pexels for videos matching criteria',
            inputSchema: searchVideosSchema,
          },
          {
            name: 'get_video_details',
            description: 'Get detailed information about a specific video',
            inputSchema: getVideoDetailsSchema,
          },
          {
            name: 'download_video',
            description: 'Download a video from Pexels',
            inputSchema: downloadVideoSchema,
          },
          {
            name: 'batch_download',
            description: 'Download multiple videos based on search criteria',
            inputSchema: batchDownloadSchema,
          },
          {
            name: 'list_downloaded',
            description: 'List all downloaded videos with metadata',
            inputSchema: listDownloadedSchema,
          },
          {
            name: 'organize_by_category',
            description: 'Organize videos into category folders based on metadata',
            inputSchema: organizeByCategorySchema,
          },
          {
            name: 'get_usage_stats',
            description: 'Get API usage statistics and limits',
            inputSchema: getUsageStatsSchema,
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_videos':
            return await this.handleSearchVideos(args);
          case 'get_video_details':
            return await this.handleGetVideoDetails(args);
          case 'download_video':
            return await this.handleDownloadVideo(args);
          case 'batch_download':
            return await this.handleBatchDownload(args);
          case 'list_downloaded':
            return await this.handleListDownloaded(args);
          case 'organize_by_category':
            return await this.handleOrganizeByCategory(args);
          case 'get_usage_stats':
            return await this.handleGetUsageStats(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        this.logger.error('Error handling tool request:', error);
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
      }
    });
  }

  private async handleSearchVideos(args: any) {
    const cacheKey = `search_${JSON.stringify(args)}`;
    const cached = this.cacheManager.get(cacheKey);
    
    if (cached) {
      this.logger.info('Returning cached search results');
      return { content: [{ type: 'text', text: JSON.stringify(cached, null, 2) }] };
    }

    const results = await this.pexelsClient.searchVideos(args);
    this.cacheManager.set(cacheKey, results);
    this.usageTracker.recordApiCall('search_videos');
    
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }

  private async handleGetVideoDetails(args: any) {
    const cacheKey = `video_${args.video_id}`;
    const cached = this.cacheManager.get(cacheKey);
    
    if (cached) {
      this.logger.info('Returning cached video details');
      return { content: [{ type: 'text', text: JSON.stringify(cached, null, 2) }] };
    }

    const details = await this.pexelsClient.getVideoDetails(args.video_id);
    this.cacheManager.set(cacheKey, details);
    this.usageTracker.recordApiCall('get_video_details');
    
    return { content: [{ type: 'text', text: JSON.stringify(details, null, 2) }] };
  }

  private async handleDownloadVideo(args: any) {
    const videoDetails = await this.pexelsClient.getVideoDetails(args.video_id);
    const result = await this.downloadManager.downloadVideo(videoDetails, args);
    this.usageTracker.recordDownload();
    
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleBatchDownload(args: any) {
    const searchResults = await this.pexelsClient.searchVideos(args.search_params);
    const downloadResults = await this.downloadManager.batchDownload(searchResults.data.videos, args);
    this.usageTracker.recordBatchDownload(downloadResults.length);
    
    return { content: [{ type: 'text', text: JSON.stringify(downloadResults, null, 2) }] };
  }

  private async handleListDownloaded(args: any) {
    const files = await this.downloadManager.listDownloaded(args);
    return { content: [{ type: 'text', text: JSON.stringify(files, null, 2) }] };
  }

  private async handleOrganizeByCategory(args: any) {
    const result = await this.organizationManager.organizeByCategory(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  private async handleGetUsageStats(args: any) {
    const stats = this.usageTracker.getStats(args.period);
    return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('Pexels MCP Server running on stdio');
  }
}

// Start the server
const logger = new Logger();
const server = new PexelsMCPServer(logger);
server.run().catch((error: any) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});