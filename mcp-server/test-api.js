#!/usr/bin/env node

// Simple test to verify Pexels API connection
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function testPexelsAPI() {
  console.log('🧪 Testing Pexels API connection...');
  
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error('❌ PEXELS_API_KEY not found in .env file');
    process.exit(1);
  }
  
  try {
    const response = await axios.get('https://api.pexels.com/videos/search', {
      params: {
        query: 'test',
        per_page: 1,
      },
      headers: {
        'Authorization': apiKey,
        'User-Agent': 'Pexels-MCP-Server/1.0.0',
      },
      timeout: 10000,
    });
    
    console.log('✅ Pexels API connection successful!');
    console.log(`📊 API Response: ${response.status}`);
    console.log(`🎥 Videos available: ${response.data.total_results}`);
    console.log(`⏱️  Rate limit remaining: ${response.headers['x-ratelimit-remaining'] || 'Unknown'}`);
    
  } catch (error) {
    console.error('❌ Pexels API test failed:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${error.response.data?.error || 'Unknown error'}`);
    }
    process.exit(1);
  }
}

// Run the test
testPexelsAPI().catch(console.error);