// QFT Agent - Prebuilt Embed Templates V1
// Common embed templates for Discord bot commands

module.exports = {
  // ===== WELCOME/GREETING EMBEDS =====
  welcome: {
    title: '👋 Welcome to {guild}!',
    description: 'Hey {user}, welcome to our community! We\'re glad to have you here.',
    color: 0x5865F2, // Discord Blurple
    fields: [
      { name: '📜 Rules', value: 'Please read our rules in <#rules-channel>', inline: false },
      { name: '💬 Get Started', value: 'Introduce yourself in <#introductions>', inline: false },
      { name: '❓ Need Help?', value: 'Ask questions in <#support>', inline: false }
    ],
    footer: { text: 'Enjoy your stay!' },
    timestamp: true
  },

  welcomeDM: {
    title: '👋 Welcome!',
    description: 'Thanks for joining **{guild}**!',
    color: 0x5865F2,
    fields: [
      { name: 'Server Information', value: 'You\'ve joined a community of {memberCount} members!', inline: false },
      { name: 'What\'s Next?', value: 'Head over to the server and say hello!', inline: false }
    ],
    thumbnail: '{guildIcon}',
    timestamp: true
  },

  goodbye: {
    title: '👋 Farewell',
    description: '{user} has left the server.',
    color: 0xED4245, // Discord Red
    footer: { text: 'We hope to see you again!' },
    timestamp: true
  },

  // ===== ANNOUNCEMENT EMBEDS =====
  announcement: {
    title: '📢 Announcement',
    description: '{content}',
    color: 0xFEE75C, // Discord Yellow
    author: {
      name: '{author}',
      iconURL: '{authorAvatar}'
    },
    footer: { text: 'Server Announcement' },
    timestamp: true
  },

  updateLog: {
    title: '🔔 Update Log',
    description: '**What\'s New:**\n{changes}',
    color: 0x57F287, // Discord Green
    fields: [
      { name: '✨ New Features', value: '{features}', inline: false },
      { name: '🐛 Bug Fixes', value: '{fixes}', inline: false },
      { name: '📝 Notes', value: '{notes}', inline: false }
    ],
    footer: { text: 'Version {version}' },
    timestamp: true
  },

  maintenance: {
    title: '🔧 Maintenance Notice',
    description: 'The server will undergo maintenance.',
    color: 0xFEE75C,
    fields: [
      { name: '📅 Start Time', value: '{startTime}', inline: true },
      { name: '⏱️ Duration', value: '{duration}', inline: true },
      { name: '📋 Details', value: '{details}', inline: false }
    ],
    footer: { text: 'We appreciate your patience' },
    timestamp: true
  },

  // ===== MODERATION EMBEDS =====
  modWarning: {
    title: '⚠️ Warning',
    description: 'You have received a warning.',
    color: 0xFEE75C,
    fields: [
      { name: 'Reason', value: '{reason}', inline: false },
      { name: 'Moderator', value: '{moderator}', inline: true },
      { name: 'Date', value: '{date}', inline: true },
      { name: 'Warning #', value: '{warnCount}', inline: true }
    ],
    footer: { text: 'Please review the server rules' },
    timestamp: true
  },

  modKick: {
    title: '🚪 Member Kicked',
    description: '{user} has been kicked from the server.',
    color: 0xFEE75C,
    fields: [
      { name: 'Reason', value: '{reason}', inline: false },
      { name: 'Moderator', value: '{moderator}', inline: true }
    ],
    footer: { text: 'Moderation Action' },
    timestamp: true
  },

  modBan: {
    title: '🔨 Member Banned',
    description: '{user} has been banned from the server.',
    color: 0xED4245,
    fields: [
      { name: 'Reason', value: '{reason}', inline: false },
      { name: 'Moderator', value: '{moderator}', inline: true },
      { name: 'Duration', value: '{duration}', inline: true }
    ],
    footer: { text: 'Moderation Action' },
    timestamp: true
  },

  modMute: {
    title: '🔇 Member Muted',
    description: '{user} has been muted.',
    color: 0xFEE75C,
    fields: [
      { name: 'Reason', value: '{reason}', inline: false },
      { name: 'Duration', value: '{duration}', inline: true },
      { name: 'Moderator', value: '{moderator}', inline: true }
    ],
    footer: { text: 'Moderation Action' },
    timestamp: true
  },

  modUnmute: {
    title: '🔊 Member Unmuted',
    description: '{user} has been unmuted.',
    color: 0x57F287,
    fields: [
      { name: 'Moderator', value: '{moderator}', inline: true }
    ],
    footer: { text: 'Moderation Action' },
    timestamp: true
  },

  modLog: {
    title: '📋 Moderation Log',
    description: 'Moderation action taken.',
    color: 0x5865F2,
    fields: [
      { name: 'Action', value: '{action}', inline: true },
      { name: 'Target', value: '{target}', inline: true },
      { name: 'Moderator', value: '{moderator}', inline: true },
      { name: 'Reason', value: '{reason}', inline: false }
    ],
    footer: { text: 'Case #{caseId}' },
    timestamp: true
  },

  // ===== INFO/HELP EMBEDS =====
  serverInfo: {
    title: '🏰 Server Information',
    description: 'Information about {guildName}',
    color: 0x5865F2,
    thumbnail: '{guildIcon}',
    fields: [
      { name: '👥 Members', value: '{memberCount}', inline: true },
      { name: '📅 Created', value: '{createdAt}', inline: true },
      { name: '👑 Owner', value: '{owner}', inline: true },
      { name: '🎭 Roles', value: '{roleCount}', inline: true },
      { name: '💬 Channels', value: '{channelCount}', inline: true },
      { name: '🔰 Boost Level', value: '{boostLevel}', inline: true }
    ],
    footer: { text: 'Server ID: {guildId}' },
    timestamp: true
  },

  userInfo: {
    title: '👤 User Information',
    description: 'Information about {username}',
    color: 0x5865F2,
    thumbnail: '{userAvatar}',
    fields: [
      { name: 'Username', value: '{username}#{discriminator}', inline: true },
      { name: 'ID', value: '{userId}', inline: true },
      { name: 'Joined', value: '{joinedAt}', inline: true },
      { name: 'Account Created', value: '{createdAt}', inline: true },
      { name: 'Roles', value: '{roles}', inline: false }
    ],
    footer: { text: 'User Profile' },
    timestamp: true
  },

  helpMenu: {
    title: '❓ Help Menu',
    description: 'Here are the available commands:',
    color: 0x5865F2,
    fields: [
      { name: '📝 Utility Commands', value: '{utilityCommands}', inline: false },
      { name: '🎮 Fun Commands', value: '{funCommands}', inline: false },
      { name: '🛡️ Moderation Commands', value: '{modCommands}', inline: false },
      { name: '⚙️ Configuration', value: '{configCommands}', inline: false }
    ],
    footer: { text: 'Use /help <command> for more info' },
    timestamp: true
  },

  // ===== STATUS/FEEDBACK EMBEDS =====
  success: {
    title: '✅ Success',
    description: '{message}',
    color: 0x57F287,
    timestamp: true
  },

  error: {
    title: '❌ Error',
    description: '{message}',
    color: 0xED4245,
    timestamp: true
  },

  warning: {
    title: '⚠️ Warning',
    description: '{message}',
    color: 0xFEE75C,
    timestamp: true
  },

  info: {
    title: 'ℹ️ Information',
    description: '{message}',
    color: 0x5865F2,
    timestamp: true
  },

  loading: {
    title: '⏳ Processing...',
    description: '{message}',
    color: 0x5865F2,
    timestamp: true
  },

  // ===== EVENT EMBEDS =====
  levelUp: {
    title: '🎉 Level Up!',
    description: 'Congratulations {user}! You reached level **{level}**!',
    color: 0x57F287,
    thumbnail: '{userAvatar}',
    fields: [
      { name: 'Current XP', value: '{currentXP}', inline: true },
      { name: 'Next Level', value: '{nextLevel}', inline: true }
    ],
    footer: { text: 'Keep chatting to level up!' },
    timestamp: true
  },

  giveaway: {
    title: '🎁 Giveaway!',
    description: '{prize}',
    color: 0xFEE75C,
    fields: [
      { name: '⏰ Ends', value: '{endTime}', inline: true },
      { name: '🎟️ Entries', value: '{entries}', inline: true },
      { name: 'Host', value: '{host}', inline: false }
    ],
    footer: { text: 'React with 🎉 to enter!' },
    timestamp: true
  },

  poll: {
    title: '📊 Poll',
    description: '{question}',
    color: 0x5865F2,
    fields: [
      { name: 'Option 1', value: '1️⃣ {option1}', inline: false },
      { name: 'Option 2', value: '2️⃣ {option2}', inline: false },
      { name: 'Option 3', value: '3️⃣ {option3}', inline: false },
      { name: 'Option 4', value: '4️⃣ {option4}', inline: false }
    ],
    footer: { text: 'React to vote! | Ends {endTime}' },
    timestamp: true
  }
};
