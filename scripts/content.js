/* content.js — LIVE SCROLL + STRONG OUTPUT + IMAGE GENERATION
   FIX: mode-specific prompt builder so non-visual modes are NOT told to return mermaid.
*/

let overlay = null;
let lastVisibleHash = null;
let currentMode = "simplified";

// Create floating overlay
function ensureOverlay() {
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "simplix-overlay";
    overlay.style = `
        position: fixed;
        left: 50%;
        top: 10%;
        transform: translateX(-50%);
        z-index: 999999999;
        width: 80%;
        max-width: 900px;
        font-family: Inter, system-ui;
    `;
    overlay.innerHTML = `
        <div style="background:#fff; padding:18px; border-radius:10px; box-shadow:0 4px 20px rgba(0,0,0,0.25);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-weight:600; font-size:18px; color:#4F46E5;">Simplix AI</div>
                <button id="simplix-close" style="border:none; background:none; font-size:20px; cursor:pointer;">×</button>
            </div>
            <div id="simplix-content" style="margin-top:12px; min-height:80px;">
                <div style="text-align:center; color:#666;">Analyzing visible content...</div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById("simplix-close").onclick = () => {
        overlay.remove();
        overlay = null;
    };

    return overlay;
}

// Extract visible section of webpage
function extractVisibleText() {
    const elements = Array.from(document.querySelectorAll("p, h1, h2, h3, li, article"));
    const visible = [];
    const vh = window.innerHeight;

    for (const el of elements) {
        const r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) {
            const t = el.innerText.trim();
            if (t.length > 20) visible.push(t);
        }
    }

    return visible.join("\n\n").slice(0, 6000);
}

// Hash for detecting change
function simpleHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return String(h);
}

// ---------- FIXED: Mode-specific prompt builder ----------
function buildPrompt(text, mode) {
    const commonHeader = `You are Simplix AI. Analyze ONLY the following visible text from the page and produce output strictly following the instructions for the chosen mode.

Page content:
${text}

`;

    // Define per-mode instructions (NO visual/mermaid text unless mode === 'visual')
    switch (mode) {
        case "simplified":
            return commonHeader + `
Mode: simplified

Instructions:
- Produce 10–15 crisp bullet points that cover the visible content.
- Produce 20 question-answer pairs (short Q and short A) covering the visible content.
- Keep language concise and accurate.
- Do NOT include mermaid, code fences, or any markdown formatting — plain text only.
`;
        case "kid-friendly":
            return commonHeader + `
Mode: kid-friendly

Instructions:
- Explain the visible content as if to a 10-year-old, using simple analogies.
- Provide 8–12 mini quiz questions with answers (Q then A).
- Keep tone friendly and simple.
- Plain text only; do NOT include code fences or diagrams.
`;
        case "story":
            return commonHeader + `
Mode: story

Instructions:
- Convert the visible content into a single engaging narrative of 300–450 words.
- Include a short title (3-4 words) at top.
- Use descriptive language but keep factual accuracy to the visible content.
- Plain text only; no code fences or diagrams.
`;
        case "step-by-step":
            return commonHeader + `
Mode: step-by-step

Instructions:
- Break the visible content into 10–20 numbered steps that explain the key ideas or procedures.
- After the steps, include 6 quick-check questions with short answers.
- Plain text only.
`;
        case "exam":
            return commonHeader + `
Mode: exam

Instructions:
- Produce up to 6 detailed flashcards (Front / Back).
  For each flashcard, after the back side include an image_prompt: one-sentence description suitable for generating an illustrative image.
- Produce 15–20 multiple choice questions (each with 4 options) plus answers.
- Also include 5 short-answer and 5 long-answer practice questions with answers (if content supports it).
- Plain text only; do NOT use code fences or diagrams.
`;
        case "visual":
            // ONLY in visual mode do we instruct mermaid output
            return commonHeader + `
Mode: visual

Instructions:
- Return ONLY a mermaid diagram inside a fenced code block that begins with \`\`\`mermaid and ends with \`\`\`.
- Do NOT include any text before or after the fenced block.
- The mermaid diagram should be a valid Mermaid flowchart (for example: 'flowchart TD').
- The diagram should summarize the visible content as nodes and labeled connections.
- No extra markdown, no backticks outside the single fenced block.
`;
        default:
            return commonHeader + `
Mode: simplified (fallback)

Instructions:
- Produce 8–12 bullet points summarizing the visible content and 6 Q/A pairs.
- Plain text only.
`;
    }
}
// ---------------------------------------------------------

// Ask background to call API
async function requestModel(text, mode) {
    return await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            { action: "invokeModel", prompt: buildPrompt(text, mode) },
            (resp) => {
                if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                else resolve(resp);
            }
        );
    });
}

// Render result into overlay (same as before with mermaid handling)
function renderResult(result, mode) {
    const overlayEl = ensureOverlay();
    const box = overlayEl.querySelector("#simplix-content");
    box.innerHTML = "";

    let raw = (typeof result === "string") ? result : JSON.stringify(result, null, 2);

    // If non-visual, remove code fences and stray backticks (makes story/qa clean)
    if (mode !== "visual") {
        raw = raw.replace(/```(?:[\w-]*)\n([\s\S]*?)```/g, (m, inner) => inner.trim());
        raw = raw.replace(/`{1,3}/g, "");
        raw = raw.trim();
    }

    if (mode === "visual") {
        const match = raw.match(/```mermaid\s*([\s\S]*?)```/);
        if (match) {
            const code = match[1].trim();
            const div = document.createElement("div");
            div.className = "mermaid";
            div.textContent = code;
            box.appendChild(div);

            let existing = document.querySelector("script[data-simplix-mermaid]");
            if (!existing) {
                const script = document.createElement("script");
                script.src = chrome.runtime.getURL("lib/mermaid.min.js");
                script.setAttribute("data-simplix-mermaid", "1");
                script.onload = () => {
                    try {
                        window.mermaid.initialize({ startOnLoad: false });
                        window.mermaid.init(undefined, ".mermaid");
                    } catch (e) {
                        console.error("Mermaid init error", e);
                        div.style.whiteSpace = "pre-wrap";
                    }
                };
                document.head.appendChild(script);
            } else {
                try {
                    window.mermaid.initialize({ startOnLoad: false });
                    window.mermaid.init(undefined, ".mermaid");
                } catch (e) {
                    console.error("Mermaid re-init error", e);
                }
            }
            return;
        } else {
            box.innerHTML = `<div style="color:#b33; white-space:pre-wrap;">No valid mermaid block returned by the model. Raw output:\n\n${escapeHtml(raw)}</div>`;
            return;
        }
    }

    // Non-visual: show sanitized text
    const textBlock = document.createElement("div");
    textBlock.style = "white-space:pre-wrap; max-height:450px; overflow:auto;";
    textBlock.innerHTML = escapeHtml(raw).replace(/\n/g, "<br>");
    box.appendChild(textBlock);

    // If image_prompt lines present, try to generate images (up to 4)
    const prompts = raw.match(/image_prompt:\s*(.+)/gi) || [];
    if (prompts.length) {
        const container = document.createElement("div");
        container.style = "display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;";
        box.appendChild(container);

        prompts.slice(0, 4).forEach((p) => {
            const idx = p.indexOf(":");
            const text = idx >= 0 ? p.slice(idx + 1).trim() : p.trim();
            const ph = document.createElement("div");
            ph.innerHTML = "Loading image...";
            ph.style = "width:120px; height:80px; background:#ddd; display:flex; justify-content:center; align-items:center;";
            container.appendChild(ph);

            chrome.runtime.sendMessage(
                { action: "invokeImage", prompt: text },
                (resp) => {
                    if (resp?.ok && resp.data?.data?.[0]?.url) {
                        const img = document.createElement("img");
                        img.src = resp.data.data[0].url;
                        img.style = "width:120px; height:80px; object-fit:cover;";
                        ph.replaceWith(img);
                    } else {
                        ph.innerHTML = "Image failed";
                    }
                }
            );
        });
    }
}

// escape utility
function escapeHtml(s = "") {
    return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

// Scroll watcher
const updateVisible = async () => {
    const text = extractVisibleText();
    if (!text) return;

    const hash = simpleHash(text + currentMode);
    if (hash === lastVisibleHash) return;
    lastVisibleHash = hash;

    ensureOverlay();
    const overlayEl = document.getElementById("simplix-content");
    overlayEl.innerHTML = "<center>Processing visible content...</center>";

    let resp;
    try {
        resp = await requestModel(text, currentMode);
    } catch (err) {
        overlayEl.innerHTML = `<span style="color:red">Error: ${escapeHtml(err.message || String(err))}</span>`;
        console.error("requestModel failed", err);
        return;
    }

    if (!resp || !resp.ok) {
        const err = resp?.error?.message || JSON.stringify(resp?.error || resp);
        overlayEl.innerHTML = `<span style="color:red">Error: ${escapeHtml(err)}</span>`;
        return;
    }

    const result = resp.data?.choices?.[0]?.message?.content
                || resp.data?.generated_text
                || (typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data));

    renderResult(result, currentMode);
};

// Debounce scroll events
let debounceTimer = null;
window.addEventListener("scroll", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateVisible, 400);
});
window.addEventListener("resize", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateVisible, 400);
});

// Popup triggers
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === "setMode") {
        currentMode = req.mode;
        sendResponse({ ok: true });
    }
    if (req.action === "startLive") {
        updateVisible();
        sendResponse({ ok: true });
    }
});
