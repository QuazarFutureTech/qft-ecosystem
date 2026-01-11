// Test script for custom commands API endpoints
const http = require('http');

const BASE_URL = 'http://localhost:3001/api/v1';
const TEST_GUILD_ID = '1234567890123456789';
// Use the real MASTER_ADMIN user's UUID
const TEST_TOKEN = 'QFT_IDENTITY_08f56d0b-52cd-436b-8c52-2729f89939ad';

// Helper to make authenticated requests
function apiCall(method, path, data = null) {
  return new Promise((resolve) => {
    const url = new URL(`${BASE_URL}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ success: res.statusCode < 400, data: parsed, status: res.statusCode });
        } catch (e) {
          resolve({ success: false, error: body, status: res.statusCode });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
    
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Custom Commands API with Dynamic Triggers\n');
  
  // Test 1: List commands (should be empty initially)
  console.log('1️⃣  GET /guilds/:guildId/commands');
  const listResult = await apiCall('GET', `/guilds/${TEST_GUILD_ID}/commands`);
  console.log('   Result:', JSON.stringify(listResult, null, 2));
  
  // Test 2: Create command trigger (text-based)
  console.log('\n2️⃣  POST /guilds/:guildId/commands (Command Trigger)');
  const createCmd = await apiCall('POST', `/guilds/${TEST_GUILD_ID}/commands`, {
    commandName: 'Welcome Command',
    commandCode: 'return "Welcome to the server!"',
    description: 'Welcomes users',
    triggerType: 'command',
    triggerData: {
      trigger: 'welcome'
    }
  });
  console.log('   Result:', JSON.stringify(createCmd, null, 2));
  
  // Test 3: Create reaction trigger with event type
  console.log('\n3️⃣  POST /guilds/:guildId/commands (Reaction Trigger)');
  const createReaction = await apiCall('POST', `/guilds/${TEST_GUILD_ID}/commands`, {
    commandName: 'Star Reaction Handler',
    commandCode: 'return "Someone starred the message!"',
    description: 'Responds to star reactions',
    triggerType: 'reaction',
    triggerData: {
      emoji: '⭐',
      reactionEventType: 'added'
    }
  });
  console.log('   Result:', JSON.stringify(createReaction, null, 2));
  
  // Test 4: Create slash command with trigger
  console.log('\n4️⃣  POST /guilds/:guildId/commands (Slash Command)');
  const createSlash = await apiCall('POST', `/guilds/${TEST_GUILD_ID}/commands`, {
    commandName: 'Ping Command',
    commandCode: 'return "Pong!"',
    description: 'Simple ping command',
    triggerType: 'slash',
    triggerData: {
      trigger: 'ping'
    }
  });
  console.log('   Result:', JSON.stringify(createSlash, null, 2));
  
  // Test 5: List all commands with trigger data
  console.log('\n5️⃣  GET /guilds/:guildId/commands (All Commands)');
  const listAll = await apiCall('GET', `/guilds/${TEST_GUILD_ID}/commands`);
  console.log('   Result:', JSON.stringify(listAll, null, 2));
  
  console.log('\n✅ Test suite completed!');
}

runTests().catch(console.error);
