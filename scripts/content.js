/* content.js — FINAL STABLE VERSION */

// --- GUARD CLAUSE: Prevent Double Injection ---
if (window.simplixHasRun) {
  toggleSidebar();
  throw new Error("Simplix already running: Toggled sidebar.");
}
window.simplixHasRun = true;

// --- State Variables ---
let sidebarEl = null;
let cropOverlayEl = null;
let selectionRect = null; // {left, top, width, height}
let currentMode = "kid-friendly"; 
let currentTheme = "blue";
let isProcessing = false;

// We store the cleanup function for the crop tool globally so we can call it from anywhere
let cropCleanup = null; 

// --- Theme Definitions ---
const THEMES = {
  blue: {
    bg: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
    sidebarBg: "rgba(255, 255, 255, 0.95)",
    text: "#1e1b4b",
    subText: "#475569",
    accent: "#4F46E5",
    accentHover: "#4338ca",
    cardBg: "#f8fafc",
    border: "#e2e8f0",
    shadow: "0 10px 30px -5px rgba(79, 70, 229, 0.2)",
    glass: "backdrop-filter: blur(12px);"
  },
  light: {
    bg: "#ffffff",
    sidebarBg: "#ffffff",
    text: "#111827",
    subText: "#6b7280",
    accent: "#2563eb",
    accentHover: "#1d4ed8",
    cardBg: "#ffffff",
    border: "#e5e7eb",
    shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    glass: "none"
  },
  dark: {
    bg: "#0f172a",
    sidebarBg: "#1e293b",
    text: "#f8fafc",
    subText: "#94a3b8",
    accent: "#818cf8",
    accentHover: "#6366f1",
    cardBg: "#334155",
    border: "#475569",
    shadow: "0 10px 30px -5px rgba(0, 0, 0, 0.5)",
    glass: "none"
  }
};

// --- 1. Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleSidebar") {
    toggleSidebar();
    sendResponse({ ok: true });
  }
});

// --- 2. Sidebar UI ---
function toggleSidebar() {
  if (sidebarEl) {
    sidebarEl.remove();
    sidebarEl = null;
    // Force close crop tool if sidebar closes
    if (cropCleanup) cropCleanup(); 
    return;
  }

  // Create Sidebar
  sidebarEl = document.createElement('div');
  sidebarEl.id = 'simplix-sidebar';
  applySidebarStyles(sidebarEl);

  sidebarEl.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <div style="display:flex; align-items:center; gap:10px;">
        <div style="width:28px; height:28px; background:var(--accent); border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:16px;">S</div>
        <h2 style="margin:0; font-size:18px; color:var(--text); font-weight:700; letter-spacing:-0.5px;">Simplix AI</h2>
      </div>
      <div style="display:flex; gap:8px;">
        <button id="sb-theme-toggle" title="Change Theme" style="background:transparent; border:none; cursor:pointer; font-size:18px; padding:4px; border-radius:4px; transition:0.2s;">🎨</button>
        <button id="sb-close" style="background:transparent; border:none; cursor:pointer; font-size:20px; color:var(--subText); padding:4px; border-radius:4px; transition:0.2s;">&times;</button>
      </div>
    </div>

    <div class="sb-card" style="background:var(--cardBg); padding:16px; border-radius:12px; border:1px solid var(--border); margin-bottom:16px; transition:0.3s;">
      <div style="font-size:11px; font-weight:700; color:var(--subText); margin-bottom:10px; text-transform:uppercase; letter-spacing:0.5px;">Step 1: Select Content</div>
      <button id="sb-crop-btn" style="width:100%; padding:10px; background:transparent; border:1px dashed var(--accent); color:var(--accent); border-radius:8px; cursor:pointer; font-weight:600; font-size:13px; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:6px;">
        <span>✂</span> Set Crop Area
      </button>
      <div id="sb-crop-status" style="font-size:12px; color:var(--accent); margin-top:8px; display:none; font-weight:500; text-align:center;">
        <span style="margin-right:4px;">✅</span> Area Selected
      </div>
      <div style="font-size:10px; color:var(--subText); margin-top:6px; text-align:center; opacity:0.8;">(Scroll page to select more)</div>
    </div>

    <div class="sb-card" style="background:var(--cardBg); padding:16px; border-radius:12px; border:1px solid var(--border); margin-bottom:16px; transition:0.3s;">
      <div style="font-size:11px; font-weight:700; color:var(--subText); margin-bottom:10px; text-transform:uppercase; letter-spacing:0.5px;">Step 2: Choose Mode</div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
        ${createModeBtn('kid-friendly', '🧸 Kid Friendly')}
        ${createModeBtn('story', '📖 Story Mode')}
        ${createModeBtn('exam', '🎓 Exam Mode')}
        ${createModeBtn('step-by-step', '👣 Step-by-Step')}
        ${createModeBtn('summary', '⚡ Summary')}
        ${createModeBtn('formal', '💼 Formal')}
      </div>
    </div>

    <div style="margin-top:auto;">
      <button id="sb-generate-btn" style="width:100%; padding:14px; background:var(--accent); color:white; border:none; border-radius:10px; font-size:15px; font-weight:600; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.1); transition:all 0.3s; display:flex; align-items:center; justify-content:center; gap:8px;">
        <span>✨</span> Generate Result
      </button>
    </div>
  `;

  document.body.appendChild(sidebarEl);

  // --- Listeners ---
  sidebarEl.querySelector('#sb-close').onclick = toggleSidebar;
  sidebarEl.querySelector('#sb-crop-btn').onclick = toggleCropTool;
  sidebarEl.querySelector('#sb-theme-toggle').onclick = cycleTheme;
  const genBtn = sidebarEl.querySelector('#sb-generate-btn');
  genBtn.onclick = handleGenerateClick;

  // Mode Selection
  const modeBtns = sidebarEl.querySelectorAll('.sb-mode-btn');
  modeBtns.forEach(btn => {
    btn.onclick = () => {
      modeBtns.forEach(b => {
        b.style.background = 'transparent'; b.style.color = 'var(--text)'; 
        b.style.borderColor = 'var(--border)'; b.style.boxShadow = 'none';
      });
      btn.style.background = 'var(--accent)'; btn.style.color = 'white'; 
      btn.style.borderColor = 'var(--accent)'; btn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
      currentMode = btn.dataset.mode;
      
      if(!isProcessing) {
        genBtn.style.background = 'var(--accent)'; 
        genBtn.innerHTML = "<span>✨</span> Generate Result";
      }
    };
  });

  // Set Default Mode
  const defaultBtn = sidebarEl.querySelector(`button[data-mode="${currentMode}"]`);
  if(defaultBtn) defaultBtn.click();
}

function applySidebarStyles(el) {
  const t = THEMES[currentTheme];
  el.style.setProperty('--bg', t.bg);
  el.style.setProperty('--sidebarBg', t.sidebarBg);
  el.style.setProperty('--text', t.text);
  el.style.setProperty('--subText', t.subText);
  el.style.setProperty('--accent', t.accent);
  el.style.setProperty('--cardBg', t.cardBg);
  el.style.setProperty('--border', t.border);
  el.style.setProperty('--shadow', t.shadow);

  el.style.cssText += `
    position: fixed; top: 0; right: 0; bottom: 0; width: 320px;
    background: var(--sidebarBg); ${t.glass}
    box-shadow: -10px 0 30px rgba(0,0,0,0.1);
    z-index: 2147483647; padding: 24px; box-sizing: border-box;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    display: flex; flex-direction: column; 
    transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    border-left: 1px solid var(--border);
  `;
}

function cycleTheme() {
  if (currentTheme === 'blue') currentTheme = 'light';
  else if (currentTheme === 'light') currentTheme = 'dark';
  else currentTheme = 'blue';
  
  if (sidebarEl) {
    applySidebarStyles(sidebarEl);
    const activeBtn = sidebarEl.querySelector(`button[data-mode="${currentMode}"]`);
    if(activeBtn) activeBtn.click();
  }
}

function createModeBtn(mode, label) {
  return `<button class="sb-mode-btn" data-mode="${mode}" style="
    padding:10px; border:1px solid var(--border); background:transparent; border-radius:8px; 
    cursor:pointer; font-size:12px; font-weight:600; color:var(--text); transition:all 0.2s;
    text-align:center; display:flex; align-items:center; justify-content:center; gap:4px;
  ">${label}</button>`;
}

// --- 3. Scrollable Crop Tool (Fixed) ---
function toggleCropTool() {
  // 1. Clean up existing if open
  if (cropOverlayEl || cropCleanup) {
    if (cropCleanup) cropCleanup(); // Run the cleanup function
    return;
  }

  const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  const t = THEMES[currentTheme];

  cropOverlayEl = document.createElement('div');
  cropOverlayEl.style = `
    position: absolute; top:0; left:0; width:100%; height:${docHeight}px;
    z-index: 2147483646; cursor: crosshair;
    background: rgba(0,0,0,0.3); backdrop-filter: blur(2px);
  `;

  // Scroll handler
  const wheelHandler = (e) => {
    window.scrollBy({ top: e.deltaY, behavior: 'auto' });
  };
  cropOverlayEl.addEventListener('wheel', wheelHandler, { passive: true });

  const startTop = window.scrollY + (window.innerHeight * 0.2);
  const startLeft = (window.innerWidth - 400) / 2;

  const box = document.createElement('div');
  box.id = 'simplix-crop-box';
  box.style = `
    position: absolute; left: ${startLeft}px; top: ${startTop}px; 
    width: 400px; height: 300px;
    border: 2px dashed ${t.accent}; 
    box-shadow: 0 0 0 99999px rgba(0,0,0,0.6); 
    background: rgba(255,255,255,0.05); cursor: move;
  `;
  
  ['nw', 'ne', 'sw', 'se'].forEach(dir => {
    const h = document.createElement('div');
    h.className = 'crop-handle'; h.dataset.dir = dir;
    h.style = `position:absolute; width:12px; height:12px; background:${t.accent}; border:2px solid white; border-radius:50%; z-index:10; box-shadow:0 2px 4px rgba(0,0,0,0.2);`;
    if(dir.includes('n')) h.style.top = '-6px'; else h.style.bottom = '-6px';
    if(dir.includes('w')) h.style.left = '-6px'; else h.style.right = '-6px';
    h.style.cursor = (dir === 'nw' || dir === 'se') ? 'nwse-resize' : 'nesw-resize';
    box.appendChild(h);
  });

  const help = document.createElement('div');
  help.innerHTML = `<span style='background:${t.accent}; color:white; padding:6px 10px; border-radius:6px; font-weight:600; box-shadow:0 4px 6px rgba(0,0,0,0.2);'>Drag to Move • Corners to Resize</span>`;
  help.style = "position:absolute; top:-40px; left:0; font-size:12px; white-space:nowrap; font-family:sans-serif;";
  box.appendChild(help);

  cropOverlayEl.appendChild(box);
  document.body.appendChild(cropOverlayEl);

  // --- Drag & Resize Logic (With Distinct Variables) ---
  let isResizing = false;
  let isMoving = false;
  let currentHandle = null;

  // We declare these outside to ensure they persist during drag
  let dragStartX = 0, dragStartY = 0;
  let dragStartLeft = 0, dragStartTop = 0;
  let dragStartW = 0, dragStartH = 0;

  const onMouseDown = (e) => {
    if (e.target.classList.contains('crop-handle')) {
      isResizing = true; currentHandle = e.target.dataset.dir;
    } else if (e.target === box || e.target.parentNode === box) {
      isMoving = true;
    } else return;
    
    e.preventDefault(); e.stopPropagation();
    
    dragStartX = e.pageX; 
    dragStartY = e.pageY;
    dragStartLeft = box.offsetLeft; 
    dragStartTop = box.offsetTop;
    dragStartW = box.offsetWidth; 
    dragStartH = box.offsetHeight;
  };

  const onMouseMove = (e) => {
    if (!isMoving && !isResizing) return;
    
    const dx = e.pageX - dragStartX; 
    const dy = e.pageY - dragStartY;

    if (isMoving) {
      // Ensure dragStartLeft is defined
      if (typeof dragStartLeft === 'undefined') return; 
      box.style.left = (dragStartLeft + dx) + 'px'; 
      box.style.top = (dragStartTop + dy) + 'px';
      box.style.boxShadow = `0 0 0 99999px rgba(0,0,0,0.6)`;
    } else if (isResizing) {
      let newW = dragStartW, newH = dragStartH, newL = dragStartLeft, newT = dragStartTop;
      
      if (currentHandle.includes('e')) newW = dragStartW + dx;
      if (currentHandle.includes('w')) { newW = dragStartW - dx; newL = dragStartLeft + dx; }
      if (currentHandle.includes('s')) newH = dragStartH + dy;
      if (currentHandle.includes('n')) { newH = dragStartH - dy; newT = dragStartTop + dy; }
      
      if (newW > 20) { box.style.width = newW + 'px'; box.style.left = newL + 'px'; }
      if (newH > 20) { box.style.height = newH + 'px'; box.style.top = newT + 'px'; }
    }
  };

  const onMouseUp = () => {
    if (isMoving || isResizing) {
      selectionRect = { left: box.offsetLeft, top: box.offsetTop, width: box.offsetWidth, height: box.offsetHeight };
      if (sidebarEl) {
        sidebarEl.querySelector('#sb-crop-status').style.display = 'block';
        sidebarEl.querySelector('#sb-crop-btn').innerHTML = "<span>✅</span> Area Set";
        sidebarEl.querySelector('#sb-crop-btn').style.borderColor = 'var(--accent)';
        sidebarEl.querySelector('#sb-crop-btn').style.background = 'rgba(79, 70, 229, 0.05)';
      }
    }
    isMoving = false; isResizing = false;
  };

  const onDblClick = (e) => { 
    if(e.target === cropOverlayEl) {
        if (cropCleanup) cropCleanup();
    }
  };

  // Attach listeners
  cropOverlayEl.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  cropOverlayEl.addEventListener('dblclick', onDblClick);

  // --- DEFINE CLEANUP FUNCTION ---
  // This removes the specific listeners we added to window
  cropCleanup = () => {
    if (cropOverlayEl) {
      cropOverlayEl.remove();
      cropOverlayEl = null;
    }
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    cropCleanup = null; // Clear the function itself
  };
}

// --- 4. Generation Logic ---
async function handleGenerateClick() {
  if (isProcessing) return;
  const btn = document.getElementById('sb-generate-btn');
  
  isProcessing = true;
  btn.innerHTML = "<span>⏳</span> Analyzing...";
  btn.style.opacity = "0.8"; btn.style.cursor = "wait";

  try {
    const text = extractVisibleText(selectionRect);
    if (!text || text.length < 5) throw new Error("No text found. Please set a crop area first.");
    const resp = await requestModelForVisibleText(text, currentMode);
    renderResult(resp, currentMode);
  } catch (err) {
    alert("Simplix Error: " + err.message);
  } finally {
    isProcessing = false;
    btn.innerHTML = "<span>✨</span> Generate Result"; 
    btn.style.opacity = "1"; btn.style.cursor = "pointer";
  }
}

// --- 5. Utilities ---
function extractVisibleText(docRect) {
  if (!docRect) return document.body.innerText.slice(0, 5000); 
  const rect = { left: docRect.left, top: docRect.top - window.scrollY, width: docRect.width, height: docRect.height };
  const els = document.querySelectorAll('p, h1, h2, h3, h4, li, span, div');
  let gathered = [];
  rect.left = Math.max(0, rect.left); 

  for (let el of els) {
    if(el.children.length > 2 && el.tagName === 'DIV') continue; 
    const r = el.getBoundingClientRect(); 
    if (r.width === 0 || r.height === 0) continue;
    const intersects = !(r.right < rect.left || r.left > (rect.left + rect.width) || r.bottom < rect.top || r.top > (rect.top + rect.height));
    if (intersects) {
      const txt = el.innerText.trim();
      if (txt.length > 10) gathered.push(txt);
    }
  }
  return [...new Set(gathered)].join("\n\n").slice(0, 8000);
}

// --- 6. Prompt Engineering ---
function buildPrompt(text, mode) {
  let instructions = "";
  if (mode === 'exam') {
    return `You are an strict Exam Generator. 
    Analyze the text provided below and generate a structured exam in strictly VALID JSON format. 
    Do NOT include any markdown formatting (like \`\`\`json), just the raw JSON object.
    
    The JSON structure must be:
    {
      "mcqs": [
        { "id": 1, "question": "Question text?", "options": ["A", "B", "C", "D"], "correctIndex": 0 }
        ... (generate 5-8 questions)
      ],
      "short_answer": [
        { "question": "Question text (3 Marks)", "answer_points": ["Point 1", "Point 2", "Point 3"] }
        ... (generate 2 questions)
      ],
      "long_answer": [
        { "question": "Question text (5 Marks)", "answer_points": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"] }
        ... (generate 1 question)
      ]
    }
    
    Content to analyze:
    ${text}`;
  }

  switch(mode) {
    case 'kid-friendly': instructions = "Explain this text for a 5-year-old. Use emojis, very simple analogies (like toys or animals), and short sentences. Make it fun and enthusiastic!"; break;
    case 'story': instructions = "Rewrite this text as an engaging short story. Create characters (e.g., Detective Data or Captain Logic) and a plot. Ensure the key concepts of the text are explained through the plot events."; break;
    case 'step-by-step': instructions = "Convert this text into a rigorous, Step-by-Step implementation guide. Use bold headers for steps (Step 1, Step 2). If applicable, include code snippets or prerequisites."; break;
    case 'summary': instructions = "Provide a high-level Executive Summary. Then provide a 'Key Takeaways' bulleted list. Finally, conclude with a 'Why this matters' section."; break;
    case 'formal': instructions = "Rewrite this text in highly professional, academic, and formal English. Use sophisticated vocabulary and passive voice where appropriate for a research paper tone."; break;
  }

  return `You are Simplix AI. ${instructions} [CONTENT START] ${text} [CONTENT END]`;
}

async function requestModelForVisibleText(text, mode) {
  const prompt = buildPrompt(text, mode);
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "invokeModel", prompt }, (r) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      resolve(r);
    });
  });
}

// --- 7. Renderer (Visuals + Exam Engine) ---
function renderResult(modelData, mode) {
  let overlay = document.getElementById('simplix-result-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'simplix-result-overlay';
    const t = THEMES[currentTheme];
    overlay.style = `
      position: fixed; left: 50%; top: 5%; transform: translateX(-50%);
      width: 65%; height: 90vh; background: ${t.cardBg}; z-index: 2147483648;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5); border-radius: 16px; border: 1px solid ${t.border};
      display: flex; flex-direction: column; overflow: hidden; font-family: 'Inter', sans-serif;
      animation: slidedown 0.3s ease-out;
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `@keyframes slidedown { from { opacity:0; transform:translate(-50%, -20px); } to { opacity:1; transform:translate(-50%, 0); } }`;
    document.head.appendChild(styleSheet);
    document.body.appendChild(overlay);
  }

  const t = THEMES[currentTheme];
  let contentRaw = "";
  if (typeof modelData === "string") contentRaw = modelData;
  else if (modelData?.data?.choices) contentRaw = modelData.data.choices[0].message.content;
  else contentRaw = JSON.stringify(modelData);

  let html = `
    <div style="background:${t.accent}; color:white; padding:16px 24px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
      <div style="font-weight:700; font-size:18px; display:flex; align-items:center; gap:8px;">
        <span>📝</span> Simplix Result: ${mode.toUpperCase()}
      </div>
      <button id="res-close" style="background:rgba(255,255,255,0.2); border:none; color:white; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center;">&times;</button>
    </div>
    <div style="padding:30px; overflow-y:auto; flex-grow:1; line-height:1.7; color:${t.text}; font-size:16px; background:${t.bg};">
  `;

  if (mode === 'exam') {
    try {
      const cleanJson = contentRaw.replace(/```json/g, '').replace(/```/g, '').trim();
      const examData = JSON.parse(cleanJson);
      html += renderInteractiveExam(examData, t);
    } catch (e) {
      console.error("JSON Parse Error", e);
      html += `<div style="color:#ef4444; font-weight:bold; padding:20px; background:#fee2e2; border-radius:8px;">Error parsing exam data. Showing raw text:<br><br>${escapeHtml(contentRaw)}</div>`;
    }
  } else {
    html += escapeHtml(contentRaw).replace(/\n/g, '<br>');
  }

  html += `</div>`;
  overlay.innerHTML = html;
  overlay.querySelector('#res-close').onclick = () => overlay.remove();

  if (mode === 'exam') attachExamListeners(overlay, t);
}

function renderInteractiveExam(data, t) {
  let h = `<div style="max-width:800px; margin:0 auto;">`;
  h += `
    <div style="background:${t.cardBg}; padding:20px; border-radius:12px; margin-bottom:24px; border:1px solid ${t.border}; display:flex; justify-content:space-between; align-items:center; box-shadow:${t.shadow};">
      <h3 style="margin:0; color:${t.accent}; font-size:20px;">🎓 Interactive Exam</h3>
      <div style="font-weight:800; color:${t.accent}; font-size:18px;">Score: <span id="exam-score">0</span> / ${data.mcqs.length}</div>
    </div>
  `;

  if(data.mcqs && data.mcqs.length > 0) {
    h += `<h3 style="border-bottom:2px solid ${t.border}; padding-bottom:8px; margin-bottom:16px; color:${t.text};">Part A: Multiple Choice</h3>`;
    data.mcqs.forEach((q, idx) => {
      h += `
        <div class="exam-mcq" data-correct="${q.correctIndex}" style="margin-bottom:20px; background:${t.cardBg}; border:1px solid ${t.border}; padding:20px; border-radius:12px; transition:0.2s;">
          <div style="font-weight:600; margin-bottom:12px; color:${t.text}; font-size:17px;">${idx+1}. ${q.question}</div>
          <div style="display:grid; gap:10px;">
            ${q.options.map((opt, i) => `
              <button class="exam-opt-btn" data-idx="${i}" style="text-align:left; padding:12px 16px; border:1px solid ${t.border}; background:${t.bg}; color:${t.text}; border-radius:8px; cursor:pointer; transition:all 0.2s; font-size:15px;">
                <span style="font-weight:bold; opacity:0.6; margin-right:8px;">${String.fromCharCode(65+i)}</span> ${opt}
              </button>
            `).join('')}
          </div>
          <div class="exam-feedback" style="margin-top:12px; font-size:14px; font-weight:700; display:none;"></div>
        </div>`;
    });
  }
  
  if(data.short_answer && data.short_answer.length > 0) {
    h += `<h3 style="border-bottom:2px solid ${t.border}; padding-bottom:8px; margin-bottom:16px; margin-top:30px; color:${t.text};">Part B: Short Answer</h3>`;
    data.short_answer.forEach((q, idx) => {
      h += `
        <div style="margin-bottom:20px; color:${t.text};">
          <div style="font-weight:600; font-size:16px;">Q${idx+1}. ${q.question}</div>
          <details style="margin-top:8px; background:${t.bg}; padding:10px; border-radius:8px; border:1px solid ${t.border};">
            <summary style="cursor:pointer; color:${t.accent}; font-weight:600;">Show Answer Key</summary>
            <ul style="margin:10px 0 0 20px; color:${t.subText};">${q.answer_points.map(p => `<li>${p}</li>`).join('')}</ul>
          </details>
        </div>`;
    });
  }

  if(data.long_answer && data.long_answer.length > 0) {
    h += `<h3 style="border-bottom:2px solid ${t.border}; padding-bottom:8px; margin-bottom:16px; margin-top:30px; color:${t.text};">Part C: Long Answer</h3>`;
    data.long_answer.forEach((q, idx) => {
      h += `
        <div style="margin-bottom:20px; color:${t.text};">
          <div style="font-weight:600; font-size:16px;">Q${idx+1}. ${q.question}</div>
          <details style="margin-top:8px; background:${t.bg}; padding:10px; border-radius:8px; border:1px solid ${t.border};">
            <summary style="cursor:pointer; color:${t.accent}; font-weight:600;">Show Answer Key</summary>
            <ul style="margin:10px 0 0 20px; color:${t.subText};">${q.answer_points.map(p => `<li>${p}</li>`).join('')}</ul>
          </details>
        </div>`;
    });
  }

  h += `</div>`;
  return h;
}

function attachExamListeners(overlay, t) {
  const mcqContainers = overlay.querySelectorAll('.exam-mcq');
  let score = 0;
  const scoreEl = overlay.querySelector('#exam-score');

  mcqContainers.forEach(container => {
    const buttons = container.querySelectorAll('.exam-opt-btn');
    const correctIdx = parseInt(container.dataset.correct);
    const feedback = container.querySelector('.exam-feedback');
    let answered = false;

    buttons.forEach(btn => {
      btn.onclick = () => {
        if (answered) return; 
        answered = true;
        const selectedIdx = parseInt(btn.dataset.idx);
        
        if (selectedIdx === correctIdx) {
          btn.style.background = "#dcfce7"; btn.style.borderColor = "#16a34a"; btn.style.color = "#14532d";
          feedback.innerText = "Correct! +1"; feedback.style.color = "#16a34a";
          score++;
          if(scoreEl) scoreEl.innerText = score;
        } else {
          btn.style.background = "#fee2e2"; btn.style.borderColor = "#ef4444"; btn.style.color = "#7f1d1d";
          feedback.innerText = "Incorrect."; feedback.style.color = "#ef4444";
          if(buttons[correctIdx]) {
             buttons[correctIdx].style.background = "#dcfce7"; buttons[correctIdx].style.borderColor = "#16a34a"; buttons[correctIdx].style.color = "#14532d";
          }
        }
        feedback.style.display = "block";
      };
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}