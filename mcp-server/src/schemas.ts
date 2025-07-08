import { z } from 'zod';

export const searchVideosSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Search query (e.g., "abstract loop", "satisfying")',
    },
    orientation: {
      type: 'string',
      enum: ['landscape', 'portrait', 'square'],
      description: 'Video orientation filter',
    },
    size: {
      type: 'string',
      enum: ['large', 'medium', 'small'],
      description: 'Video size filter',
    },
    min_duration: {
      type: 'number',
      description: 'Minimum video duration in seconds',
    },
    max_duration: {
      type: 'number',
      description: 'Maximum video duration in seconds',
    },
    per_page: {
      type: 'number',
      default: 15,
      maximum: 80,
      description: 'Results per page',
    },
    page: {
      type: 'number',
      default: 1,
      description: 'Page number for pagination',
    },
  },
  required: ['query'],
};

export const getVideoDetailsSchema = {
  type: 'object',
  properties: {
    video_id: {
      type: 'number',
      description: 'Pexels video ID',
    },
  },
  required: ['video_id'],
};

export const downloadVideoSchema = {
  type: 'object',
  properties: {
    video_id: {
      type: 'number',
      description: 'Pexels video ID',
    },
    quality: {
      type: 'string',
      enum: ['hd', 'sd', 'mobile'],
      default: 'hd',
      description: 'Video quality to download',
    },
    filename: {
      type: 'string',
      description: 'Custom filename (optional)',
    },
    category: {
      type: 'string',
      description: 'Category folder for organization',
    },
  },
  required: ['video_id'],
};

export const batchDownloadSchema = {
  type: 'object',
  properties: {
    search_params: {
      type: 'object',
      description: 'Same as search_videos parameters',
    },
    max_videos: {
      type: 'number',
      default: 10,
      description: 'Maximum videos to download',
    },
    quality: {
      type: 'string',
      enum: ['hd', 'sd', 'mobile'],
      default: 'hd',
    },
    category: {
      type: 'string',
      description: 'Category for all downloads',
    },
    filter_criteria: {
      type: 'object',
      properties: {
        min_width: { type: 'number' },
        min_height: { type: 'number' },
        preferred_fps: { type: 'number' },
        exclude_ids: { type: 'array', items: { type: 'number' } },
      },
    },
  },
  required: ['search_params'],
};

export const listDownloadedSchema = {
  type: 'object',
  properties: {
    category: {
      type: 'string',
      description: 'Filter by category (optional)',
    },
    sort_by: {
      type: 'string',
      enum: ['date', 'size', 'duration', 'name'],
      default: 'date',
    },
    limit: {
      type: 'number',
      default: 50,
    },
  },
};

export const organizeByCategorySchema = {
  type: 'object',
  properties: {
    organization_scheme: {
      type: 'string',
      enum: ['emotion', 'energy', 'color', 'duration', 'custom'],
      default: 'emotion',
    },
    custom_rules: {
      type: 'object',
      description: 'Custom categorization rules',
    },
  },
};

export const getUsageStatsSchema = {
  type: 'object',
  properties: {
    period: {
      type: 'string',
      enum: ['hour', 'day', 'month'],
      default: 'hour',
    },
  },
};

// Zod schemas for runtime validation
export const SearchVideosInput = z.object({
  query: z.string(),
  orientation: z.enum(['landscape', 'portrait', 'square']).optional(),
  size: z.enum(['large', 'medium', 'small']).optional(),
  min_duration: z.number().optional(),
  max_duration: z.number().optional(),
  per_page: z.number().max(80).default(15),
  page: z.number().default(1),
});

export const GetVideoDetailsInput = z.object({
  video_id: z.number(),
});

export const DownloadVideoInput = z.object({
  video_id: z.number(),
  quality: z.enum(['hd', 'sd', 'mobile']).default('hd'),
  filename: z.string().optional(),
  category: z.string().optional(),
});

export const BatchDownloadInput = z.object({
  search_params: z.object({
    query: z.string(),
    orientation: z.enum(['landscape', 'portrait', 'square']).optional(),
    size: z.enum(['large', 'medium', 'small']).optional(),
    min_duration: z.number().optional(),
    max_duration: z.number().optional(),
    per_page: z.number().max(80).default(15),
    page: z.number().default(1),
  }),
  max_videos: z.number().default(10),
  quality: z.enum(['hd', 'sd', 'mobile']).default('hd'),
  category: z.string().optional(),
  filter_criteria: z.object({
    min_width: z.number().optional(),
    min_height: z.number().optional(),
    preferred_fps: z.number().optional(),
    exclude_ids: z.array(z.number()).optional(),
  }).optional(),
});

export const ListDownloadedInput = z.object({
  category: z.string().optional(),
  sort_by: z.enum(['date', 'size', 'duration', 'name']).default('date'),
  limit: z.number().default(50),
});

export const OrganizeByCategoryInput = z.object({
  organization_scheme: z.enum(['emotion', 'energy', 'color', 'duration', 'custom']).default('emotion'),
  custom_rules: z.object({}).optional(),
});

export const GetUsageStatsInput = z.object({
  period: z.enum(['hour', 'day', 'month']).default('hour'),
});