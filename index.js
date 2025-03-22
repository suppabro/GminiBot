client.on('message', async (message) => {
    const chat = await message.getChat();
    const command = message.body.toLowerCase();

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

    if (!aiEnabled.get(chat.id._serialized)) return;

    try {
        const model = genAI.getGenerativeModel({ model: 'google/gemini-pro' });

        const result = await model.generateContent(message.body);
        
        // DEBUG: Log API response
        console.log('🔹 API Response:', JSON.stringify(result, null, 2));

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
