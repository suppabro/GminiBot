const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const qrcode = require('qrcode');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize WhatsApp client
const { Client, LocalAuth } = require('whatsapp-web.js');
const client = new Client({
    authStrategy: new LocalAuth()
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected');
    socket.emit('loading');
});

// Generate QR code
client.on('qr', async (qr) => {
    console.log('Generating QR code...');
    try {
        const qrSvg = await qrcode.toString(qr, {
            type: 'svg',
            margin: 2
        });
        io.emit('qr', qrSvg);
    } catch (err) {
        console.error('QR Code generation error:', err);
    }
});

client.on('ready', () => {
    console.log('WhatsApp bot is ready!');
    io.emit('ready');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Initialize WhatsApp client
    client.initialize();
});

// Handle WhatsApp messages
client.on('message', async (message) => {
    const chat = await message.getChat();
    const command = message.body.toLowerCase();

    // Handle AI toggle commands
    if (command === '.ai on') {
        aiEnabled.set(chat.id._serialized, true);
        message.reply('AI chat is now enabled! 🤖');
        return;
    }
    if (command === '.ai off') {
        aiEnabled.set(chat.id._serialized, false);
        message.reply('AI chat is now disabled! 👋');
        return;
    }

    // Check if AI is enabled for this chat
    if (!aiEnabled.get(chat.id._serialized)) {
        return;
    }

    try {
        // Handle image messages
        if (message.hasMedia) {
            const media = await message.downloadMedia();
            if (media.mimetype.startsWith('image/')) {
                const model = genAI.getGenerativeModel({ model: 'google/gemini-2.0-pro-exp-02-05:free' });
                const result = await model.generateContent([
                    { type: 'text', text: 'What is in this image?' },
                    { type: 'image_url', image_url: { url: `data:${media.mimetype};base64,${media.data}` } }
                ]);
                message.reply(result.response.text());
                return;
            }
        }

        // Handle text messages
        const model = genAI.getGenerativeModel({ model: 'google/gemini-2.0-pro-exp-02-05:free' });
        const result = await model.generateContent(message.body);
        message.reply(result.response.text());
    } catch (error) {
        console.error('Error processing message:', error);
        message.reply('Sorry, I encountered an error while processing your request. 😔');
    }
});