import fs from 'fs-extra';
import path from 'path';
import { Logger } from './logger.js';
import { VideoMetadata } from './download-manager.js';

export interface OrganizationScheme {
  [category: string]: string[];
}

export interface OrganizationOptions {
  organization_scheme?: 'emotion' | 'energy' | 'color' | 'duration' | 'custom';
  custom_rules?: OrganizationScheme;
}

export interface OrganizationResult {
  status: 'success' | 'failed';
  moved_files: number;
  categories_created: string[];
  errors: string[];
}

export class OrganizationManager {
  private logger: Logger;
  private organizationSchemes: { [key: string]: OrganizationScheme };

  constructor(logger: Logger) {
    this.logger = logger;
    this.organizationSchemes = {
      emotion: {
        calm: ['water', 'clouds', 'slow', 'peaceful', 'serene', 'gentle', 'soft', 'quiet'],
        energetic: ['fast', 'bright', 'motion', 'dynamic', 'active', 'vibrant', 'quick', 'rapid'],
        mysterious: ['dark', 'smoke', 'shadow', 'fog', 'night', 'mysterious', 'abstract', 'enigmatic'],
        happy: ['colorful', 'sunny', 'playful', 'light', 'bright', 'cheerful', 'joyful', 'positive'],
        dramatic: ['storm', 'lightning', 'intense', 'powerful', 'dramatic', 'bold', 'striking'],
      },
      energy: {
        high: ['fast', 'rapid', 'quick', 'dynamic', 'active', 'intense', 'powerful', 'energetic'],
        medium: ['moderate', 'steady', 'balanced', 'consistent', 'regular', 'normal'],
        low: ['slow', 'calm', 'peaceful', 'gentle', 'soft', 'quiet', 'relaxed', 'serene'],
      },
      color: {
        warm: ['red', 'orange', 'yellow', 'warm', 'sunset', 'fire', 'golden'],
        cool: ['blue', 'green', 'purple', 'cool', 'ocean', 'sky', 'ice'],
        neutral: ['black', 'white', 'gray', 'grey', 'monochrome', 'neutral'],
        vibrant: ['colorful', 'bright', 'vivid', 'saturated', 'rainbow', 'neon'],
      },
      duration: {
        short: [], // 0-15 seconds
        medium: [], // 15-45 seconds
        long: [], // 45+ seconds
      },
    };
  }

  async organizeByCategory(options: OrganizationOptions): Promise<OrganizationResult> {
    const result: OrganizationResult = {
      status: 'success',
      moved_files: 0,
      categories_created: [],
      errors: [],
    };

    try {
      // Get the organization scheme
      const scheme = options.organization_scheme || 'emotion';
      const rules = scheme === 'custom' ? options.custom_rules : this.organizationSchemes[scheme];

      if (!rules) {
        throw new Error(`Invalid organization scheme: ${scheme}`);
      }

      // Load video metadata
      const downloadPath = process.env.DOWNLOAD_PATH || './downloads';
      const metadataFile = path.join(downloadPath, 'metadata.json');
      
      if (!await fs.pathExists(metadataFile)) {
        throw new Error('No downloaded videos found');
      }

      const metadata: VideoMetadata[] = await fs.readJson(metadataFile);
      
      this.logger.info(`Starting organization of ${metadata.length} videos using ${scheme} scheme`);

      // Process each video
      for (const video of metadata) {
        try {
          const category = await this.categorizeVideo(video, rules, scheme);
          
          if (category) {
            const moved = await this.moveVideoToCategory(video, category, downloadPath);
            if (moved) {
              result.moved_files++;
              if (!result.categories_created.includes(category)) {
                result.categories_created.push(category);
              }
            }
          }
        } catch (error: any) {
          this.logger.error(`Error organizing video ${video.id}:`, error);
          result.errors.push(`Video ${video.id}: ${error.message}`);
        }
      }

      // Update metadata file
      await fs.writeJson(metadataFile, metadata, { spaces: 2 });

      this.logger.info(`Organization completed: ${result.moved_files} files moved into ${result.categories_created.length} categories`);
    } catch (error) {
      this.logger.error('Error during organization:', error);
      result.status = 'failed';
      result.errors.push(error.message);
    }

    return result;
  }

  private async categorizeVideo(
    video: VideoMetadata,
    rules: OrganizationScheme,
    scheme: string
  ): Promise<string | null> {
    // Special handling for duration-based categorization
    if (scheme === 'duration') {
      const duration = video.pexels_metadata.duration;
      if (duration <= 15) return 'short';
      if (duration <= 45) return 'medium';
      return 'long';
    }

    // For other schemes, use tag-based categorization
    const tags = video.pexels_metadata.tags || [];
    const allTags = tags.join(' ').toLowerCase();

    // Find the best matching category
    let bestCategory: string | null = null;
    let bestScore = 0;

    for (const [category, keywords] of Object.entries(rules)) {
      const score = this.calculateCategoryScore(allTags, keywords);
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    // Only return category if we have a reasonable confidence
    return bestScore > 0 ? bestCategory : null;
  }

  private calculateCategoryScore(tags: string, keywords: string[]): number {
    let score = 0;
    for (const keyword of keywords) {
      if (tags.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    return score;
  }

  private async moveVideoToCategory(
    video: VideoMetadata,
    category: string,
    downloadPath: string
  ): Promise<boolean> {
    try {
      const currentPath = video.local_path;
      const categoryDir = path.join(downloadPath, category);
      const newPath = path.join(categoryDir, video.filename);

      // Skip if already in the correct category
      if (currentPath === newPath) {
        return false;
      }

      // Ensure category directory exists
      await fs.ensureDir(categoryDir);

      // Move the file
      await fs.move(currentPath, newPath);

      // Update metadata
      video.local_path = newPath;
      video.category = category;

      this.logger.info(`Moved video ${video.id} to category: ${category}`);
      return true;
    } catch (error) {
      this.logger.error(`Error moving video ${video.id} to category ${category}:`, error);
      return false;
    }
  }

  getAvailableSchemes(): string[] {
    return Object.keys(this.organizationSchemes);
  }

  getSchemeDetails(scheme: string): OrganizationScheme | null {
    return this.organizationSchemes[scheme] || null;
  }

  // Add custom organization scheme
  addCustomScheme(name: string, scheme: OrganizationScheme): void {
    this.organizationSchemes[name] = scheme;
  }

  // Preview categorization without actually moving files
  async previewCategorization(
    options: OrganizationOptions
  ): Promise<{ [category: string]: VideoMetadata[] }> {
    const downloadPath = process.env.DOWNLOAD_PATH || './downloads';
    const metadataFile = path.join(downloadPath, 'metadata.json');
    
    if (!await fs.pathExists(metadataFile)) {
      return {};
    }

    const metadata: VideoMetadata[] = await fs.readJson(metadataFile);
    const scheme = options.organization_scheme || 'emotion';
    const rules = scheme === 'custom' ? options.custom_rules : this.organizationSchemes[scheme];

    if (!rules) {
      throw new Error(`Invalid organization scheme: ${scheme}`);
    }

    const preview: { [category: string]: VideoMetadata[] } = {};

    for (const video of metadata) {
      const category = await this.categorizeVideo(video, rules, scheme);
      if (category) {
        if (!preview[category]) {
          preview[category] = [];
        }
        preview[category].push(video);
      }
    }

    return preview;
  }
}