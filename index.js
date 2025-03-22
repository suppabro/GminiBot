const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuration (Replace with your own details if needed)
const OPENROUTER_API_KEY = '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';
const SITE_URL = 'http://localhost:3000';
const SITE_NAME = 'WhatsApp Gemini Bot';

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth()
});

// Initialize Gemini AI
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

// Handle incoming messages
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

        // Handle text messages
        const result = await model.generateContent(message.body);

        // Debugging log (to check AI response)
        console.log('🔹 AI Response:', JSON.stringify(result, null, 2));

        if (result && result.response && result.response.text) {
            message.reply(result.response.text());
        } else {
            message.reply('⚠️ AI did not return a valid response.');
        }
    } catch (error) {
        console.error('❌ API Error:', error.response?.data || error.message);
        message.reply('🚨 An error occurred: ' + (error.response?.data?.error || error.message));
    }
});

// Start the WhatsApp client
client.initialize();
