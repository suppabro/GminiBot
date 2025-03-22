const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// WhatsApp Bot Configuration (Hardcoded)
const OPENROUTER_API_KEY = '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';
const SITE_URL = 'http://localhost:3000';
const SITE_NAME = 'WhatsApp Gemini Bot';

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth()
});

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(OPENROUTER_API_KEY, {
    baseURL: 'https://openrouter.ai/api/v1',
    headers: {
        'HTTP-Referer': SITE_URL,
        'X-Title': SITE_NAME
    }
});

// Store AI state for each chat
const aiEnabled = new Map();

// Generate QR code for WhatsApp Web
client.on('qr', (qr) => {
    console.log('Scan this QR code with WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp bot is ready!');
});

client.on('message', async (message) => {
    const chat = await message.getChat();
    const command = message.body.toLowerCase();

    // Handle AI activation
    if (command === '.ai on') {
        aiEnabled.set(chat.id._serialized, true);
        message.reply('🤖 AI chat is now enabled!');
        return;
    }
    if (command === '.ai off') {
        aiEnabled.set(chat.id._serialized, false);
        message.reply('👋 AI chat is now disabled!');
        return;
    }

    // Check if AI is enabled for the chat
    if (!aiEnabled.get(chat.id._serialized)) return;

    try {
        const model = genAI.getGenerativeModel({ model: 'google/gemini-pro' });

        // Handle image messages
        if (message.hasMedia) {
            const media = await message.downloadMedia();
            if (media.mimetype.startsWith('image/')) {
                const result = await model.generateContent([
                    { type: 'text', text: 'Describe this image.' },
                    { type: 'image_url', image_url: { url: `data:${media.mimetype};base64,${media.data}` } }
                ]);
                message.reply(result.response.text() || '⚠️ Could not process the image.');
                return;
            }
        }

        // Handle text messages
        const result = await model.generateContent(message.body);
        message.reply(result.response.text() || '⚠️ AI did not return a response.');
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        message.reply('🚨 Sorry, an error occurred while processing your request.');
    }
});

// Start the WhatsApp client
client.initialize();
