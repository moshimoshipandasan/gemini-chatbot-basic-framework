// Web App エントリーポイント
function doGet() {
    return HtmlService.createTemplateFromFile('index')
        .evaluate()
        .setTitle('チャットボット')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// HTMLインクルード用
function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// メッセージ処理
function processMessage(userMessage) {
    try {
        // APIキー取得
        const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
        if (!apiKey) throw new Error('APIキーが未設定です');

        // プロンプト取得（エラー時はデフォルト使用）
        let systemPrompt = getSystemPrompt();

        // Gemini API呼び出し
        const response = callGeminiAPI(apiKey, systemPrompt, userMessage);

        // ログ記録（エラーが出ても続行）
        try {
            logToSheet(userMessage, response);
        } catch (logError) {
            console.error('ログ記録エラー:', logError);
        }

        return response;
    } catch (error) {
        console.error('処理エラー:', error);
        return 'すみません、一時的な問題が発生しています。しばらくしてからもう一度お試しください。';
    }
}

// Gemini API呼び出し
function callGeminiAPI(apiKey, systemPrompt, userMessage) {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{
            role: "user",
            parts: [{
                text: `${systemPrompt}\n\nユーザー: ${userMessage}`
            }]
        }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
        }
    };

    const response = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());

    if (result.error) {
        throw new Error(result.error.message);
    }

    return result.candidates[0].content.parts[0].text;
}

// システムプロンプト取得
function getSystemPrompt() {
    try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('プロンプトシート');
        if (sheet) {
            const prompt = sheet.getRange('A1').getValue();
            if (prompt) return prompt;
        }
    } catch (error) {
        console.error('プロンプト取得エラー:', error);
    }

    // デフォルトプロンプト
    return 'あなたは優しい相談相手です。親身になって会話をしてください。200文字程度';
}

// ログ記録
function logToSheet(userMessage, botResponse) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ログシート');
    if (!sheet) return;

    sheet.appendRow([
        new Date(),
        userMessage,
        botResponse
    ]);
}
