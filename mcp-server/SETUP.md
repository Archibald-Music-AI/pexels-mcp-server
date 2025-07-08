# Pexels MCP Server - Claude Desktop Setup Guide

## Quick Setup for Claude Desktop

### 1. Get Your Pexels API Key
1. Go to https://www.pexels.com/api/
2. Sign up or log in
3. Generate your API key
4. Copy the key (it looks like: `LH7VQwCOa43KNcDRP2wczvcyCryqBi4kNyoyeDcomAHpUrELq323hqY7`)

### 2. Install the Server

```bash
# Navigate to the server directory
cd /app/mcp-server

# Install dependencies (already done)
npm install

# Build the server (already done)
npm run build

# Test the server
npm start
```

### 3. Configure Claude Desktop

Add this to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pexels-media-server": {
      "command": "node",
      "args": ["/app/mcp-server/dist/index.js"],
      "env": {
        "PEXELS_API_KEY": "LH7VQwCOa43KNcDRP2wczvcyCryqBi4kNyoyeDcomAHpUrELq323hqY7",
        "DOWNLOAD_PATH": "/app/mcp-server/downloads"
      }
    }
  }
}
```

### 4. Test the Integration

After configuring Claude Desktop, restart it and try these commands:

```
Can you search for "abstract loop" videos on Pexels?
```

```
Please download the top 5 satisfying videos in portrait orientation.
```

```
Organize my downloaded videos by emotion categories.
```

### 5. Available Commands

Once configured, you can ask Claude to:

- **Search videos**: "Search for relaxing nature videos"
- **Download videos**: "Download the best 10 meditation videos"
- **Organize files**: "Organize my videos by color scheme"
- **Get statistics**: "Show me my Pexels usage stats"
- **List downloads**: "List all my downloaded calm videos"

## Directory Structure

```
/app/mcp-server/
├── dist/               # Compiled server (ready to run)
├── src/                # Source code
├── downloads/          # Your downloaded videos will go here
├── logs/               # Server logs
├── .env               # Configuration (API key set)
├── package.json       # Dependencies
└── README.md          # Documentation
```

## Server Status

✅ **Server Built**: TypeScript compiled successfully
✅ **API Key Set**: Your Pexels API key is configured
✅ **Dependencies Installed**: All required packages ready
✅ **Ready for Claude Desktop**: Configuration provided

## Next Steps

1. **Configure Claude Desktop** with the JSON config above
2. **Restart Claude Desktop** to load the new server
3. **Test the integration** by asking Claude to search for videos
4. **Start building your video library** with automated downloads!

## Features You'll Have

- 🎥 **Search 1000s of videos** with advanced filters
- 📥 **Batch download** multiple videos efficiently  
- 🗂️ **Auto-organize** by emotion, energy, color, duration
- 📊 **Track usage** and respect rate limits
- 🔄 **Smart caching** to reduce API calls
- 📝 **Detailed logging** for troubleshooting

Your Pexels MCP Server is ready to give Claude autonomous access to high-quality video content! 🚀