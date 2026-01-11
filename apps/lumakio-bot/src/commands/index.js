const moderation = require('./moderation');
const utility = require('./utility');

// Aggregate all commands here
const commands = [
  ...moderation,
  ...utility,
];

// Build a map for quick lookup by name
const commandMap = new Map(commands.map(cmd => [cmd.name, cmd]));

module.exports = {
  commands,
  commandMap,
};
