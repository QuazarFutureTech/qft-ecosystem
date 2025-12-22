const Jimp = require('jimp');
const path = require('path');
const https = require('https');
const fs = require('fs');

/**
 * Welcome Image Generator using Jimp
 * Generates a welcome card with preset background, user avatar, and custom text
 */
class WelcomeImageGenerator {
    constructor() {
        this.width = 1024;
        this.height = 450;
        this.backgroundsPath = path.join(__dirname, '../assets/backgrounds');
        this.defaultBackground = 'default.png';
    }

    /**
     * Download an image from URL
     * @param {string} url - Image URL
     * @returns {Promise<Buffer>} Image buffer
     */
    downloadImage(url) {
        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => resolve(Buffer.concat(chunks)));
                response.on('error', reject);
            }).on('error', reject);
        });
    }

    /**
     * Generate a welcome image
     * @param {Object} options - Configuration options
     * @param {string} options.username - Discord username
     * @param {string} options.serverName - Server/Guild name
     * @param {string} options.avatarUrl - URL to user's avatar
     * @param {string} options.welcomeMessage - Custom welcome message
     * @param {string} options.background - Background template name
     * @param {string} options.textColor - Text color (hex)
     * @param {boolean} options.circularAvatar - Use circular avatar mask
     * @returns {Promise<Buffer>} PNG image buffer
     */
    async generate(options = {}) {
        const {
            username = 'User',
            serverName = 'Server',
            avatarUrl = null,
            welcomeMessage = 'Welcome to the server!',
            background = this.defaultBackground,
            textColor = '#FFFFFF',
            circularAvatar = true,
            memberCount = null
        } = options;

        try {
            // Load or create background
            const image = await this.loadBackground(background);

            // Add avatar if provided
            if (avatarUrl) {
                await this.drawAvatar(image, avatarUrl, circularAvatar);
            }

            // Add text overlay
            await this.drawText(image, {
                username,
                serverName,
                welcomeMessage,
                textColor,
                memberCount
            });

            // Return as PNG buffer
            return await image.getBufferAsync(Jimp.MIME_PNG);
        } catch (error) {
            console.error('Failed to generate welcome image:', error);
            throw error;
        }
    }

    /**
     * Load background image
     */
    async loadBackground(backgroundName) {
        const backgroundPath = path.join(this.backgroundsPath, backgroundName);
        
        try {
            // Try to load the specified background
            if (fs.existsSync(backgroundPath)) {
                return await Jimp.read(backgroundPath);
            }
        } catch (error) {
            console.warn(`Failed to load background ${backgroundName}:`, error.message);
        }

        // Fallback: create gradient background
        return this.createGradientBackground();
    }

    /**
     * Create a default gradient background
     */
    async createGradientBackground() {
        const image = new Jimp(this.width, this.height);
        
        // Create a vertical gradient from dark blue to lighter blue
        for (let y = 0; y < this.height; y++) {
            const ratio = y / this.height;
            const r = Math.floor(30 + (70 * ratio));
            const g = Math.floor(40 + (100 * ratio));
            const b = Math.floor(80 + (140 * ratio));
            const color = Jimp.rgbaToInt(r, g, b, 255);
            
            for (let x = 0; x < this.width; x++) {
                image.setPixelColor(color, x, y);
            }
        }
        
        return image;
    }

    /**
     * Draw user avatar on the image
     */
    async drawAvatar(image, avatarUrl, circular = true) {
        try {
            // Download avatar
            const avatarBuffer = await this.downloadImage(avatarUrl);
            const avatar = await Jimp.read(avatarBuffer);

            // Resize avatar
            const avatarSize = 200;
            avatar.resize(avatarSize, avatarSize);

            if (circular) {
                // Apply circular mask
                avatar.mask(this.createCircleMask(avatarSize), 0, 0);
            }

            // Position avatar (left side, vertically centered)
            const x = 80;
            const y = Math.floor((this.height - avatarSize) / 2);
            
            image.composite(avatar, x, y);
        } catch (error) {
            console.error('Failed to draw avatar:', error);
            // Continue without avatar
        }
    }

    /**
     * Create a circular mask
     */
    createCircleMask(size) {
        const mask = new Jimp(size, size, 0x00000000);
        const center = size / 2;
        const radius = size / 2;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - center;
                const dy = y - center;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= radius) {
                    mask.setPixelColor(0xFFFFFFFF, x, y);
                }
            }
        }

        return mask;
    }

    /**
     * Draw text on the image
     */
    async drawText(image, options) {
        const { username, welcomeMessage, textColor } = options;

        try {
            // Load font (Jimp has built-in fonts)
            const fontLarge = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
            const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

            // Calculate text position (right side of avatar)
            const textX = 320;
            const centerY = this.height / 2;

            // Draw welcome message
            image.print(
                fontLarge,
                textX,
                centerY - 60,
                {
                    text: welcomeMessage,
                    alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT,
                    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
                },
                this.width - textX - 40
            );

            // Draw username
            const usernameText = this.truncateText(username, 25);
            image.print(
                fontMedium,
                textX,
                centerY + 20,
                {
                    text: usernameText,
                    alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT,
                    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
                },
                this.width - textX - 40
            );

        } catch (error) {
            console.error('Failed to draw text:', error);
        }
    }

    /**
     * Truncate text to max length
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Get available background templates
     */
    getAvailableBackgrounds() {
        try {
            if (!fs.existsSync(this.backgroundsPath)) {
                return [this.defaultBackground];
            }
            
            const files = fs.readdirSync(this.backgroundsPath);
            return files.filter(file => 
                file.endsWith('.png') || 
                file.endsWith('.jpg') || 
                file.endsWith('.jpeg')
            );
        } catch (error) {
            console.error('Failed to list backgrounds:', error);
            return [this.defaultBackground];
        }
    }
}

module.exports = new WelcomeImageGenerator();
