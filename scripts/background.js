importScripts("config.js");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Simplix AI ready");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "invokeModel") {

      (async () => {
          try {
              const { prompt } = request;

              const resp = await fetch(SIMPLIX_CONFIG.MODEL_URL, {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${SIMPLIX_CONFIG.API_KEY}`
                  },
                  body: JSON.stringify({
                      model: SIMPLIX_CONFIG.MODEL,
                      messages: [
                          { role: "user", content: prompt }
                      ]
                  })
              });

              const data = await resp.json();

              if (!resp.ok) {
                  sendResponse({ ok: false, error: data });
                  return;
              }

              sendResponse({ ok: true, data });

          } catch (err) {
              sendResponse({ ok: false, error: err.message });
          }
      })();

      return true;
  }
});
