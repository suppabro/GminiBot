require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth()
});

// Initialize Gemini Pro client
const genAI = new GoogleGenerativeAI(process.env.OPENROUTER_API_KEY, {
    baseURL: 'https://openrouter.ai/api/v1',
    headers: {
        'HTTP-Referer': process.env.SITE_URL,
        'X-Title': process.env.SITE_NAME
    }
});

// Store AI state for each chat
const aiEnabled = new Map();

// Generate QR code for WhatsApp Web
client.on('qr', (qr) => {
    console.log('Generating QR code...');
    qrcode.generate(qr, {
        small: true,
        scale: 4,
        errorCorrectionLevel: 'L'
    });
    console.log('QR code generated. Scan it with WhatsApp.');
});

client.on('ready', () => {
    console.log('WhatsApp bot is ready!');
});

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

// Start the WhatsApp client
client.initialize();