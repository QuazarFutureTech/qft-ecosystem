# Use a lightweight Node image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the bot code
COPY . .

# Expose the correct port
ENV PORT=3002
EXPOSE 3002

# ✅ THE FIX: Use npm start
# This reads your package.json and runs "node src/AgentCore.js" automatically.
CMD ["npm", "start"]