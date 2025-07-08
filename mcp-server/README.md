# Pexels MCP Server

A Model Context Protocol (MCP) server that enables Claude Desktop and other AI assistants to programmatically search, download, and organize video content from Pexels API.

## 🚀 Features

- **Advanced Video Search**: Search Pexels with sophisticated filtering options
- **Batch Downloads**: Download multiple videos efficiently with concurrency control
- **Smart Organization**: Automatically categorize videos by emotion, energy, color, or duration
- **Intelligent Caching**: Reduce API calls with smart caching strategies
- **Usage Tracking**: Monitor API usage and rate limits
- **Error Handling**: Robust error handling with detailed logging

## 🛠️ Installation

### Prerequisites

- Node.js >= 18.0.0
- Claude Desktop application
- Pexels API key (get one at https://www.pexels.com/api/)

### Quick Install

```bash
# Clone the repository
git clone https://github.com/yourusername/pexels-mcp-server.git
cd pexels-mcp-server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Pexels API key

# Build the server
npm run build

# Install globally for Claude Desktop
npm link
```

### Manual Build

```bash
# Development mode
npm run dev

# Production build
npm run build

# Start the server
npm start
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Pexels API Configuration
PEXELS_API_KEY=your_pexels_api_key_here

# Download Configuration
DOWNLOAD_PATH=./downloads
CACHE_DURATION=3600
RATE_LIMIT_PER_HOUR=200
MAX_CONCURRENT_DOWNLOADS=3

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/pexels-mcp-server.log

# MCP Server Configuration
MCP_SERVER_NAME=pexels-media-server
MCP_SERVER_VERSION=1.0.0
```

### Claude Desktop Configuration

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pexels-media-server": {
      "command": "node",
      "args": ["/path/to/pexels-mcp-server/dist/index.js"],
      "env": {
        "PEXELS_API_KEY": "your-api-key-here",
        "DOWNLOAD_PATH": "/path/to/downloads"
      }
    }
  }
}
```

## 🔧 Available Tools

### 1. search_videos
Search Pexels for videos matching specific criteria.

```javascript
{
  "query": "abstract loop",
  "orientation": "portrait",
  "size": "large",
  "min_duration": 10,
  "max_duration": 60,
  "per_page": 20,
  "page": 1
}
```

### 2. get_video_details
Get detailed information about a specific video.

```javascript
{
  "video_id": 1234567
}
```

### 3. download_video
Download a single video from Pexels.

```javascript
{
  "video_id": 1234567,
  "quality": "hd",
  "filename": "custom_name.mp4",
  "category": "satisfying"
}
```

### 4. batch_download
Download multiple videos based on search criteria.

```javascript
{
  "search_params": {
    "query": "satisfying loop",
    "orientation": "portrait"
  },
  "max_videos": 10,
  "quality": "hd",
  "category": "satisfying"
}
```

### 5. list_downloaded
List all downloaded videos with metadata.

```javascript
{
  "category": "satisfying",
  "sort_by": "date",
  "limit": 50
}
```

### 6. organize_by_category
Organize videos into category folders.

```javascript
{
  "organization_scheme": "emotion",
  "custom_rules": {
    "calm": ["water", "peaceful"],
    "energetic": ["fast", "dynamic"]
  }
}
```

### 7. get_usage_stats
Get API usage statistics and limits.

```javascript
{
  "period": "hour"
}
```

## 📖 Usage Examples

### Example 1: Search and Download Satisfying Videos

```javascript
// Search for satisfying videos
await use_mcp_tool("pexels-media-server", "search_videos", {
  query: "satisfying loop abstract",
  orientation: "portrait",
  min_duration: 10,
  max_duration: 60,
  per_page: 20
});

// Batch download the best ones
await use_mcp_tool("pexels-media-server", "batch_download", {
  search_params: {
    query: "satisfying loop abstract",
    orientation: "portrait"
  },
  max_videos: 10,
  quality: "hd",
  category: "satisfying"
});
```

### Example 2: Build a Categorized Video Library

```javascript
const categories = ["calm", "energetic", "mysterious", "happy"];

for (const category of categories) {
  await use_mcp_tool("pexels-media-server", "batch_download", {
    search_params: {
      query: `${category} background loop`,
      min_duration: 15,
      max_duration: 60
    },
    max_videos: 5,
    category: category
  });
}
```

### Example 3: Organize Existing Downloads

```javascript
await use_mcp_tool("pexels-media-server", "organize_by_category", {
  organization_scheme: "emotion"
});
```

## 🏗️ Project Structure

```
pexels-mcp-server/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── pexels-client.ts      # Pexels API client
│   ├── download-manager.ts   # Download management
│   ├── cache-manager.ts      # Intelligent caching
│   ├── organization-manager.ts # Video organization
│   ├── usage-tracker.ts      # Usage statistics
│   ├── logger.ts             # Logging utilities
│   └── schemas.ts            # Input/output schemas
├── dist/                     # Compiled JavaScript
├── logs/                     # Log files
├── downloads/                # Downloaded videos
├── package.json
├── tsconfig.json
└── README.md
```

## 🔒 Security & Rate Limiting

- **API Key Protection**: API keys are never logged or exposed
- **Rate Limiting**: Respects Pexels API rate limits (200 requests/hour free tier)
- **Path Validation**: All file paths are sanitized and validated
- **Download Validation**: File types are verified before saving
- **Circuit Breaker**: Prevents API abuse with automatic backoff

## 📊 Smart Features

### Intelligent Caching
- Search results cached for 1 hour
- Video metadata cached locally
- Duplicate download prevention

### Organization Schemes
- **Emotion**: calm, energetic, mysterious, happy, dramatic
- **Energy**: high, medium, low
- **Color**: warm, cool, neutral, vibrant
- **Duration**: short (0-15s), medium (15-45s), long (45s+)

### Usage Tracking
- API call monitoring
- Download statistics
- Storage usage tracking
- Rate limit monitoring

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📝 Development

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Clean build artifacts
npm run clean

# Rebuild everything
npm run rebuild
```

## 🐛 Troubleshooting

### Common Issues

1. **Invalid API Key**: Ensure your Pexels API key is correct and active
2. **Rate Limit Exceeded**: Wait for the rate limit to reset or upgrade your Pexels plan
3. **Download Failures**: Check network connectivity and disk space
4. **Claude Desktop Connection**: Verify the server path in your Claude Desktop config

### Debug Mode

Set `LOG_LEVEL=debug` in your `.env` file for detailed logging.

### Log Files

Check the following log files for debugging:
- `logs/pexels-mcp-server.log` - General application logs
- `logs/error.log` - Error logs only

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Create an issue on GitHub for bug reports
- Start a discussion for feature requests
- Check the logs for detailed error information

## 🚀 What's Next?

- **AI-Powered Selection**: Use Claude to analyze video content
- **Duplicate Detection**: Perceptual hashing for similar videos
- **Preview Generation**: Create thumbnails and previews
- **FFmpeg Integration**: Built-in video processing
- **Multi-Source Support**: Extend to other video platforms

---

**Made with ❤️ for the Claude Desktop ecosystem**