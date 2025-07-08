# 🎬 Pexels MCP Server - Usage Examples

## Example 1: Search and Download Satisfying Videos

```javascript
// First, search for satisfying videos
await use_mcp_tool("pexels-media-server", "search_videos", {
  query: "satisfying loop abstract",
  orientation: "portrait",
  min_duration: 10,
  max_duration: 60,
  per_page: 20
});

// Then batch download the best ones
await use_mcp_tool("pexels-media-server", "batch_download", {
  search_params: {
    query: "satisfying loop abstract",
    orientation: "portrait",
    min_duration: 10,
    max_duration: 60
  },
  max_videos: 10,
  quality: "hd",
  category: "satisfying"
});
```

## Example 2: Build a Categorized Video Library

```javascript
const categories = ["calm", "energetic", "mysterious", "happy"];

for (const category of categories) {
  await use_mcp_tool("pexels-media-server", "batch_download", {
    search_params: {
      query: `${category} background loop`,
      min_duration: 15,
      max_duration: 60,
      orientation: "landscape"
    },
    max_videos: 5,
    quality: "hd",
    category: category
  });
}
```

## Example 3: Content Creation Workflow

```javascript
// Step 1: Search for specific content
await use_mcp_tool("pexels-media-server", "search_videos", {
  query: "urban city timelapse",
  orientation: "landscape",
  size: "large",
  min_duration: 20,
  max_duration: 120,
  per_page: 50
});

// Step 2: Download high-quality versions
await use_mcp_tool("pexels-media-server", "batch_download", {
  search_params: {
    query: "urban city timelapse",
    orientation: "landscape",
    size: "large"
  },
  max_videos: 15,
  quality: "hd",
  category: "urban",
  filter_criteria: {
    min_width: 1920,
    min_height: 1080,
    preferred_fps: 30
  }
});

// Step 3: Organize by energy level
await use_mcp_tool("pexels-media-server", "organize_by_category", {
  organization_scheme: "energy"
});
```

## Example 4: Social Media Content Library

```javascript
// Portrait videos for social media
await use_mcp_tool("pexels-media-server", "batch_download", {
  search_params: {
    query: "lifestyle aesthetic",
    orientation: "portrait",
    min_duration: 5,
    max_duration: 30
  },
  max_videos: 20,
  quality: "hd",
  category: "social_media"
});

// Square videos for Instagram
await use_mcp_tool("pexels-media-server", "batch_download", {
  search_params: {
    query: "minimalist abstract",
    orientation: "square",
    min_duration: 3,
    max_duration: 15
  },
  max_videos: 15,
  quality: "hd",
  category: "instagram"
});
```

## Example 5: Presentation Backgrounds

```javascript
// Professional presentation backgrounds
await use_mcp_tool("pexels-media-server", "batch_download", {
  search_params: {
    query: "professional corporate",
    orientation: "landscape",
    min_duration: 30,
    max_duration: 300
  },
  max_videos: 25,
  quality: "hd",
  category: "presentations",
  filter_criteria: {
    min_width: 1920,
    min_height: 1080
  }
});
```

## Example 6: Monitor Usage and Organize

```javascript
// Check your API usage
await use_mcp_tool("pexels-media-server", "get_usage_stats", {
  period: "day"
});

// List all downloaded videos
await use_mcp_tool("pexels-media-server", "list_downloaded", {
  sort_by: "date",
  limit: 100
});

// Organize everything by color scheme
await use_mcp_tool("pexels-media-server", "organize_by_category", {
  organization_scheme: "color"
});
```

## Example 7: Advanced Search with Exclusions

```javascript
// Search with specific exclusions
await use_mcp_tool("pexels-media-server", "batch_download", {
  search_params: {
    query: "nature forest",
    orientation: "landscape",
    min_duration: 20,
    max_duration: 90
  },
  max_videos: 12,
  quality: "hd",
  category: "nature",
  filter_criteria: {
    min_width: 1280,
    min_height: 720,
    preferred_fps: 24,
    exclude_ids: [1234567, 7654321] // Skip these video IDs
  }
});
```

## Example 8: Reddit Stories Workflow

```javascript
// Download background videos for Reddit stories
const storyCategories = [
  "abstract motion",
  "satisfying loop",
  "calming water",
  "urban nighttime",
  "cosmic space"
];

for (const category of storyCategories) {
  await use_mcp_tool("pexels-media-server", "batch_download", {
    search_params: {
      query: category,
      orientation: "portrait",
      min_duration: 60,
      max_duration: 300
    },
    max_videos: 8,
    quality: "hd",
    category: "reddit_stories"
  });
}

// Organize by emotion for easy selection
await use_mcp_tool("pexels-media-server", "organize_by_category", {
  organization_scheme: "emotion"
});
```

## Natural Language Examples

You can also use natural language with Claude:

### Basic Requests
- "Search for relaxing ocean videos"
- "Download 10 abstract loop videos in portrait format"
- "Find energetic workout videos under 30 seconds"

### Advanced Requests
- "Build me a library of calm meditation videos, each 2-5 minutes long, in HD quality"
- "Search for satisfying manufacturing process videos and download the top 15"
- "Find colorful abstract videos perfect for social media backgrounds"

### Organization Requests
- "Organize my downloaded videos by emotion"
- "Show me all my calm category videos sorted by duration"
- "Create categories based on color themes"

### Analytics Requests
- "Show me my Pexels API usage for this week"
- "How many videos have I downloaded today?"
- "What's my remaining rate limit?"

## Tips for Best Results

1. **Use specific keywords** for better search results
2. **Set duration filters** to match your use case
3. **Use batch downloads** for efficiency
4. **Organize regularly** to maintain your library
5. **Monitor usage** to stay within rate limits
6. **Use quality filters** to ensure good video quality

## Error Handling

The server includes robust error handling for:
- API rate limits
- Network failures
- Invalid video IDs
- Disk space issues
- File permission problems

All errors are logged and returned with helpful messages for debugging.