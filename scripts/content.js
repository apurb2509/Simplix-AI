let overlay = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "processPage") {
        showLoadingOverlay();
        const content = extractPageContent();
        processContent(content, request.mode);
    }
});

function extractPageContent() {
    const article = document.querySelector('article') || document.querySelector('main');
    const content = article ? article.innerText : document.body.innerText;
    return content.slice(0, 4000).replace(/\s+/g, ' ').trim();
}

function showLoadingOverlay() {
    if (overlay) {
        try { document.body.removeChild(overlay); } catch (e) {}
    }

    overlay = document.createElement('div');
    overlay.id = 'simplix-overlay';
    overlay.innerHTML = `
        <div class="simplix-card">
            <div class="simplix-header">
                <div class="simplix-logo">Simplix AI</div>
                <button id="simplix-close">×</button>
            </div>
            <div class="simplix-body" id="simplix-content">
                <div class="simplix-loader"></div>
                <p style="text-align:center; color:#666;">Analyzing content...</p>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('simplix-close').addEventListener('click', () => {
        if (overlay) document.body.removeChild(overlay);
        overlay = null;
    });
}

async function processContent(text, mode) {
    const prompts = {
        "simplified": "Rewrite this text to be easy for a beginner. Remove jargon:\n\n",
        "kid-friendly": "Explain this to a 5th grader using fun analogies:\n\n",
        "story": "Convert this information into an engaging narrative story:\n\n",
        "step-by-step": "Break this down into a numbered step-by-step process:\n\n",
        "exam": "Create 3 flashcards and 1 quiz question based on this:\n\n",
        "visual": "Create a mermaid.js flowchart. " +
                  "Return ONLY code inside ```mermaid``` blocks. " +
                  "Do not explain. Text:\n\n"
                };

                const promptBase = prompts[mode] || prompts["simplified"];
                const prompt = promptBase + text;
            
                try {
                    // Uses SIMPLIX_CONFIG constants from scripts/config.js
                    const backgroundResponse = await new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage(
                          { action: 'invokeModel', prompt },
                          (resp) => {
                            if (chrome.runtime.lastError) {
                              reject(new Error(chrome.runtime.lastError.message));
                            } else {
                              resolve(resp);
                            }
                          }
                        );
                      });
                      
                      if (!backgroundResponse) {
                        throw new Error('No response from background.');
                      }
                      
                      if (!backgroundResponse.ok) {
                        const errDetail = backgroundResponse.error || JSON.stringify(backgroundResponse);
                        throw new Error("Model error: " + JSON.stringify(errDetail, null, 2));
                      }
                      
                      // backgroundResponse.data is the JSON returned by Hugging Face
                      const data = backgroundResponse.data;
            
                    if (data.error) {
                        throw new Error(data.error.message || data.error);
                    }
            
                    // Some model endpoints return an array, others an object. This handles both.
                    const result = data?.choices?.[0]?.message?.content?.trim() || "";

            
                    if (!result) {
                        throw new Error("No response generated.");
                    }
            
                    renderResult(result, mode);
            
                } catch (error) {
                    const contentDiv = document.getElementById('simplix-content');
                    if (contentDiv) {
                        contentDiv.innerHTML = `
                            <p style="color:red; text-align:center;">Error: ${error.message}</p>
                            <p style="text-align:center; font-size:12px;">Check your scripts/config.js file and network.</p>
                        `;
                    }
                    console.error("Simplix error:", error);
                }
            }
            
            function renderResult(text, mode) {
                const contentDiv = document.getElementById('simplix-content');
                if (!contentDiv) return;
            
                contentDiv.innerHTML = '';
            
                if (mode === 'visual') {
                    // Try to extract mermaid code block if present
                    const mermaidMatch = text.match(/```mermaid\s*([\s\S]*?)```/) || text.match(/```([\s\S]*?)```/);
                    const code = mermaidMatch ? mermaidMatch[1].trim() : text.trim();
            
                    // Create a container for the diagram
                    const graphDiv = document.createElement('div');
                    graphDiv.className = 'mermaid';
                    graphDiv.textContent = code;
                    contentDiv.appendChild(graphDiv);
            
                    // Load mermaid script from extension lib
                    const existing = document.querySelector('script[data-simplix-mermaid]');
                    if (!existing) {
                        const script = document.createElement('script');
                        script.setAttribute('data-simplix-mermaid', '1');
                        script.src = chrome.runtime.getURL('lib/mermaid.min.js');
                        script.onload = () => {
                            try {
                                // initialize mermaid for newly added elements
                                if (window.mermaid && typeof window.mermaid.initialize === 'function') {
                                    window.mermaid.initialize({ startOnLoad: false });
                                    window.mermaid.init(undefined, ".mermaid");
                                }
                            } catch (e) {
                                console.error("Mermaid init error:", e);
                                graphDiv.textContent = "Mermaid rendering failed. Showing code:\n\n" + code;
                                graphDiv.style.whiteSpace = 'pre-wrap';
                            }
                        };
                        script.onerror = () => {
                            graphDiv.textContent = "Failed to load mermaid library. Showing code:\n\n" + code;
                            graphDiv.style.whiteSpace = 'pre-wrap';
                        };
                        document.head.appendChild(script);
                    } else {
                        // mermaid already loaded — initialize immediately
                        try {
                            if (window.mermaid && typeof window.mermaid.init === 'function') {
                                window.mermaid.init(undefined, ".mermaid");
                            }
                        } catch (e) {
                            console.error("Mermaid init error:", e);
                        }
                    }
            
                } else {
                    const formattedText = text.replace(/\n/g, '<br>');
                    contentDiv.innerHTML = `<div class="simplix-text">${formattedText}</div>`;
                }
            }