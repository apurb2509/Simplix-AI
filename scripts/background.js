// background.js
importScripts("config.js");

chrome.runtime.onInstalled.addListener(() => {
    console.log("Simplix AI background ready.");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // --- 1. OpenAI Text Generation ---
    if (request.action === "invokeModel") {
        (async () => {
            try {
                const resp = await fetch(SIMPLIX_CONFIG.MODEL_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${SIMPLIX_CONFIG.API_KEY}`
                    },
                    body: JSON.stringify({
                        model: SIMPLIX_CONFIG.MODEL,
                        messages: [{ role: "user", content: request.prompt }],
                        max_tokens: 2000
                    })
                });

                const data = await resp.json();
                if (!resp.ok) return sendResponse({ ok: false, error: data.error || data });
                return sendResponse({ ok: true, data });
            } catch (err) {
                return sendResponse({ ok: false, error: { message: err.message } });
            }
        })();
        return true;
    }

    // --- 2. OpenAI Image Generation ---
    if (request.action === "invokeImage") {
        (async () => {
            try {
                const imgResp = await fetch("https://api.openai.com/v1/images/generations", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${SIMPLIX_CONFIG.API_KEY}`
                    },
                    body: JSON.stringify({
                        prompt: request.prompt,
                        size: "512x512",
                        n: 1
                    })
                });

                const data = await imgResp.json();
                if (!imgResp.ok) return sendResponse({ ok: false, error: data.error || data });
                return sendResponse({ ok: true, data });
            } catch (err) {
                return sendResponse({ ok: false, error: { message: err.message } });
            }
        })();
        return true;
    }

    // --- 3. GROQ API (SimplixBot) ---
    if (request.action === "invokeGroq") {
        (async () => {
            try {
                const resp = await fetch(SIMPLIX_CONFIG.GROQ_MODEL_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${SIMPLIX_CONFIG.GROQ_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: SIMPLIX_CONFIG.GROQ_MODEL,
                        messages: request.messages,
                        max_tokens: 1024,
                        temperature: 0.7
                    })
                });

                const data = await resp.json();
                if (!resp.ok) return sendResponse({ ok: false, error: data.error || data });
                return sendResponse({ ok: true, data });
            } catch (err) {
                return sendResponse({ ok: false, error: { message: err.message } });
            }
        })();
        return true;
    }

});