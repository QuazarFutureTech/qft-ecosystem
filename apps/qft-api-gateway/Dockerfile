FROM node:18-slim
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev
COPY . .

# Ensure we have a default
ENV PORT=8080 
EXPOSE 8080

# Make sure this matches your actual file name!
CMD [ "node", "index.js" ]