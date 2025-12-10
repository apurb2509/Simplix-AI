/* content.js — FINAL STABLE VERSION (UI UPGRADE + FIXES) */

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
let cropCleanup = null; 

// --- ICONS (Professional Vector Set) ---
const ICONS = {
  logo: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path><path d="M8.5 8.5v.01"></path><path d="M16 15.5v.01"></path><path d="M12 12v.01"></path></svg>`,
  close: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  theme: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>`,
  crop: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"></path><path d="M18 22V8a2 2 0 0 0-2-2H2"></path></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  magic: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`
};

// --- Theme Definitions ---
const THEMES = {
  blue: {
    // Richer Blue Gradient for background
    bg: "linear-gradient(135deg, #e0f2fe 0%, #bfdbfe 100%)",
    // Slight blue tint for sidebar
    sidebarBg: "rgba(240, 249, 255, 0.95)", 
    text: "#0c4a6e", // Dark Blue text
    subText: "#64748b",
    accent: "#0284c7", // Sky Blue Accent
    accentHover: "#0369a1",
    accentText: "#ffffff", // White text on blue button
    cardBg: "#ffffff",
    border: "#bae6fd", // Light blue border
    shadow: "0 20px 25px -5px rgba(14, 165, 233, 0.15)",
    glass: "backdrop-filter: blur(12px);"
  },
  light: {
    bg: "#f3f4f6",
    sidebarBg: "#ffffff",
    text: "#111827",
    subText: "#6b7280",
    accent: "#000000", 
    accentHover: "#333333",
    accentText: "#ffffff", // White text on black button
    cardBg: "#fafafa",
    border: "#e5e7eb",
    shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
    glass: "none"
  },
  dark: {
    bg: "#000000",
    sidebarBg: "#000000", 
    text: "#e2e2e2",
    subText: "#a1a1a1",
    accent: "#ffffff", 
    accentHover: "#d4d4d4",
    accentText: "#000000", // BUG FIX: Black text on White button
    cardBg: "#111111",
    border: "#333333",
    shadow: "0 10px 30px -5px rgba(255, 255, 255, 0.1)",
    glass: "none"
  }
};

// --- Internal CSS Injection ---
function injectStyles() {
  if (document.getElementById('simplix-global-styles')) return;
  const style = document.createElement('style');
  style.id = 'simplix-global-styles';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    #simplix-sidebar, #simplix-result-overlay { font-family: 'Inter', sans-serif; box-sizing: border-box; }
    #simplix-sidebar *, #simplix-result-overlay * { box-sizing: border-box; }
    
    .sx-btn-icon { background: transparent; border: none; cursor: pointer; color: var(--subText); padding: 6px; border-radius: 6px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; }
    .sx-btn-icon:hover { background: var(--border); color: var(--text); }
    
    .sx-card { background: var(--cardBg); padding: 16px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 16px; transition: all 0.3s ease; }
    .sx-label { font-size: 10px; font-weight: 700; color: var(--subText); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.8px; display: flex; align-items: center; gap: 6px; }
    
    .sx-crop-btn { width: 100%; padding: 12px; background: transparent; border: 1px dashed var(--border); color: var(--text); border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 13px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .sx-crop-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--cardBg); }
    .sx-crop-btn.active { border-style: solid; border-color: var(--accent); background: var(--bg); color: var(--accent); }
    
    .sx-mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .sx-mode-btn { padding: 8px 10px; border: 1px solid transparent; background: var(--bg); border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; color: var(--subText); transition: all 0.2s; text-align: center; }
    .sx-mode-btn:hover { background: var(--border); color: var(--text); }
    
    /* Active State uses --accentText to fix Dark Mode contrast issues */
    .sx-mode-btn.active { background: var(--accent); color: var(--accentText) !important; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: translateY(-1px); border-color: var(--accent); }
    
    .sx-gen-btn { width: 100%; padding: 14px; background: var(--accent); color: var(--accentText); border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: var(--shadow); transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .sx-gen-btn:hover { background: var(--accentHover); transform: translateY(-1px); }
    .sx-gen-btn:active { transform: translateY(0); }
    
    /* Scrollbar */
    #simplix-result-content::-webkit-scrollbar { width: 6px; }
    #simplix-result-content::-webkit-scrollbar-track { background: transparent; }
    #simplix-result-content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    #simplix-result-content::-webkit-scrollbar-thumb:hover { background: var(--subText); }
    
    @keyframes sx-slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes sx-fade-up { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
    @keyframes sx-pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
  `;
  document.head.appendChild(style);
}

// --- 1. Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleSidebar") {
    toggleSidebar();
    sendResponse({ ok: true });
  }
});

// --- 2. Sidebar UI ---
function toggleSidebar() {
  injectStyles();
  
  if (sidebarEl) {
    sidebarEl.style.transform = 'translateX(100%)';
    setTimeout(() => {
        if(sidebarEl) sidebarEl.remove();
        sidebarEl = null;
    }, 300);
    if (cropCleanup) cropCleanup(); 
    return;
  }

  // Create Sidebar
  sidebarEl = document.createElement('div');
  sidebarEl.id = 'simplix-sidebar';
  applySidebarStyles(sidebarEl);

  sidebarEl.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="color:var(--accent);">${ICONS.logo}</div>
        <h2 style="margin:0; font-size:16px; color:var(--text); font-weight:700; letter-spacing:-0.3px;">Simplix AI</h2>
      </div>
      <div style="display:flex; gap:4px;">
        <button id="sb-theme-toggle" class="sx-btn-icon" title="Change Theme">${ICONS.theme}</button>
        <button id="sb-close" class="sx-btn-icon" title="Close">${ICONS.close}</button>
      </div>
    </div>

    <div class="sx-card">
      <div class="sx-label"><span>1</span> Content Source</div>
      <button id="sb-crop-btn" class="sx-crop-btn">
        ${ICONS.crop} Select Area
      </button>
      <div id="sb-crop-status" style="font-size:11px; color:var(--accent); margin-top:8px; display:none; font-weight:600; text-align:center; align-items:center; justify-content:center; gap:4px;">
        ${ICONS.check} Area Selected
      </div>
    </div>

    <div class="sx-card">
      <div class="sx-label"><span>2</span> Output Mode</div>
      <div class="sx-mode-grid">
        ${createModeBtn('kid-friendly', 'Kid Friendly')}
        ${createModeBtn('story', 'Story Mode')}
        ${createModeBtn('exam', 'Exam Gen')}
        ${createModeBtn('step-by-step', 'Step-by-Step')}
        ${createModeBtn('summary', 'Summary')}
        ${createModeBtn('formal', 'Formal')}
      </div>
    </div>

    <div style="margin-top:auto; padding-top:20px;">
      <button id="sb-generate-btn" class="sx-gen-btn">
        ${ICONS.magic} <span>Generate Result</span>
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
  const modeBtns = sidebarEl.querySelectorAll('.sx-mode-btn');
  modeBtns.forEach(btn => {
    btn.onclick = () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      
      if(!isProcessing) {
        genBtn.innerHTML = `${ICONS.magic} <span>Generate Result</span>`;
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
  el.style.setProperty('--accentHover', t.accentHover);
  el.style.setProperty('--accentText', t.accentText); // Inject contrast text color
  el.style.setProperty('--cardBg', t.cardBg);
  el.style.setProperty('--border', t.border);
  el.style.setProperty('--shadow', t.shadow);

  el.style.cssText += `
    position: fixed; top: 0; right: 0; bottom: 0; width: 340px;
    background: var(--sidebarBg); ${t.glass}
    box-shadow: -10px 0 40px rgba(0,0,0,0.1);
    z-index: 2147483647; padding: 24px;
    display: flex; flex-direction: column; 
    border-left: 1px solid var(--border);
    animation: sx-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  `;
}

function cycleTheme() {
  if (currentTheme === 'blue') currentTheme = 'light';
  else if (currentTheme === 'light') currentTheme = 'dark';
  else currentTheme = 'blue';
  
  if (sidebarEl) {
    applySidebarStyles(sidebarEl);
  }
}

function createModeBtn(mode, label) {
  return `<button class="sx-mode-btn" data-mode="${mode}">${label}</button>`;
}

// --- 3. Scrollable Crop Tool ---
function toggleCropTool() {
  if (cropOverlayEl || cropCleanup) {
    if (cropCleanup) cropCleanup();
    return;
  }

  const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  const t = THEMES[currentTheme];

  cropOverlayEl = document.createElement('div');
  cropOverlayEl.style = `
    position: absolute; top:0; left:0; width:100%; height:${docHeight}px;
    z-index: 2147483646; cursor: crosshair;
    background: rgba(0,0,0,0.4); 
  `;

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
    border: 1px solid white; outline: 1px dashed ${t.text};
    box-shadow: 0 0 0 9999px rgba(0,0,0,0.5); 
    background: transparent; cursor: move;
  `;
  
  ['nw', 'ne', 'sw', 'se'].forEach(dir => {
    const h = document.createElement('div');
    h.className = 'crop-handle'; h.dataset.dir = dir;
    h.style = `position:absolute; width:10px; height:10px; background:white; border:1px solid #000; z-index:10;`;
    if(dir.includes('n')) h.style.top = '-5px'; else h.style.bottom = '-5px';
    if(dir.includes('w')) h.style.left = '-5px'; else h.style.right = '-5px';
    h.style.cursor = (dir === 'nw' || dir === 'se') ? 'nwse-resize' : 'nesw-resize';
    box.appendChild(h);
  });

  const help = document.createElement('div');
  help.innerHTML = `<span style='background:#111; color:white; padding:6px 12px; border-radius:4px; font-weight:500;'>Drag to Move • DblClick to Close</span>`;
  help.style = "position:absolute; top:-35px; left:0; font-size:11px; white-space:nowrap; font-family:sans-serif;";
  box.appendChild(help);

  cropOverlayEl.appendChild(box);
  document.body.appendChild(cropOverlayEl);

  // --- Drag & Resize Logic ---
  let isResizing = false;
  let isMoving = false;
  let currentHandle = null;
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
      if (typeof dragStartLeft === 'undefined') return; 
      box.style.left = (dragStartLeft + dx) + 'px'; 
      box.style.top = (dragStartTop + dy) + 'px';
      box.style.boxShadow = `0 0 0 9999px rgba(0,0,0,0.5)`;
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
        sidebarEl.querySelector('#sb-crop-status').style.display = 'flex';
        const btn = sidebarEl.querySelector('#sb-crop-btn');
        btn.innerHTML = `${ICONS.check} Area Set`;
        btn.classList.add('active');
      }
    }
    isMoving = false; isResizing = false;
  };

  const onDblClick = (e) => { 
    if(e.target === cropOverlayEl) {
        if (cropCleanup) cropCleanup();
    }
  };

  cropOverlayEl.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  cropOverlayEl.addEventListener('dblclick', onDblClick);

  cropCleanup = () => {
    if (cropOverlayEl) {
      cropOverlayEl.remove();
      cropOverlayEl = null;
    }
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    cropCleanup = null;
  };
}

// --- 4. Generation Logic ---
async function handleGenerateClick() {
  if (isProcessing) return;
  const btn = document.getElementById('sb-generate-btn');
  
  isProcessing = true;
  btn.innerHTML = `<span style="color:var(--accentText); animation:sx-pulse 1s infinite">Analyzing...</span>`;
  btn.style.cursor = "wait";

  try {
    const text = extractVisibleText(selectionRect);
    if (!text || text.length < 5) throw new Error("No text found. Please set a crop area first.");
    const resp = await requestModelForVisibleText(text, currentMode);
    renderResult(resp, currentMode);
  } catch (err) {
    alert("Simplix Error: " + err.message);
  } finally {
    isProcessing = false;
    btn.innerHTML = `${ICONS.magic} <span>Generate Result</span>`; 
    btn.style.cursor = "pointer";
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
  // Global instruction to avoid markdown artifacts
  const formattingRules = "IMPORTANT: Do NOT use asterisks (*) or markdown bolding/italics in the output. Keep the text clean and plain.";

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
    case 'kid-friendly': instructions = "Explain this text for a 5-year-old. Use very simple analogies (like toys or animals), and short sentences. Make it fun and enthusiastic!"; break;
    case 'story': instructions = "Rewrite this text as an engaging short story. Create characters (e.g., Detective Data or Captain Logic) and a plot. Ensure the key concepts of the text are explained through the plot events."; break;
    case 'step-by-step': instructions = "Convert this text into a rigorous, Step-by-Step implementation guide. Use Numbered Lists for steps (1., 2.). If applicable, include code snippets or prerequisites."; break;
    case 'summary': instructions = "Provide a high-level Executive Summary. Then provide a 'Key Takeaways' list. Finally, conclude with a 'Why this matters' section."; break;
    case 'formal': instructions = "Rewrite this text in highly professional, academic, and formal English. Use sophisticated vocabulary and passive voice where appropriate for a research paper tone."; break;
  }

  return `You are Simplix AI. ${instructions} ${formattingRules} [CONTENT START] ${text} [CONTENT END]`;
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
      box-shadow: 0 50px 100px -20px rgba(0,0,0,0.5); border-radius: 16px; border: 1px solid ${t.border};
      display: flex; flex-direction: column; overflow: hidden; font-family: 'Inter', sans-serif;
      animation: sx-fade-up 0.3s ease-out forwards;
    `;
    document.body.appendChild(overlay);
  }

  const t = THEMES[currentTheme];
  // Ensure the overlay uses the current theme colors immediately
  overlay.style.background = t.cardBg;
  overlay.style.borderColor = t.border;
  overlay.style.color = t.text;

  let contentRaw = "";
  if (typeof modelData === "string") contentRaw = modelData;
  else if (modelData?.data?.choices) contentRaw = modelData.data.choices[0].message.content;
  else contentRaw = JSON.stringify(modelData);

  let html = `
    <div style="background:${t.bg}; border-bottom:1px solid ${t.border}; padding:16px 24px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
      <div style="font-weight:700; font-size:16px; display:flex; align-items:center; gap:8px; color:${t.text};">
        <span style="color:${t.accent}">${ICONS.magic}</span> Result: <span style="opacity:0.7">${mode.toUpperCase().replace('-', ' ')}</span>
      </div>
      <button id="res-close" style="background:transparent; border:none; color:${t.subText}; cursor:pointer; padding:8px; border-radius:6px; display:flex;">
        ${ICONS.close}
      </button>
    </div>
    <div id="simplix-result-content" style="padding:40px; overflow-y:auto; flex-grow:1; line-height:1.7; color:${t.text}; font-size:16px; background:${t.bg};">
  `;

  if (mode === 'exam') {
    try {
      const cleanJson = contentRaw.replace(/```json/g, '').replace(/```/g, '').trim();
      const examData = JSON.parse(cleanJson);
      html += renderInteractiveExam(examData, t);
    } catch (e) {
      console.error("JSON Parse Error", e);
      html += `<div style="color:#ef4444; font-weight:bold; padding:20px; background:rgba(239, 68, 68, 0.1); border-radius:8px;">Error parsing exam data. Showing raw text:<br><br>${escapeHtml(contentRaw)}</div>`;
    }
  } else {
    // Add simple paragraph formatting for non-markdown text
    const formatted = escapeHtml(contentRaw).split('\n').map(line => line.trim() ? `<p style="margin-bottom:1em">${line}</p>` : '').join('');
    html += formatted;
  }

  html += `</div>`;
  overlay.innerHTML = html;
  overlay.querySelector('#res-close').onclick = () => overlay.remove();

  if (mode === 'exam') attachExamListeners(overlay, t);
}

function renderInteractiveExam(data, t) {
  let h = `<div style="max-width:800px; margin:0 auto;">`;
  h += `
    <div style="background:${t.cardBg}; padding:24px; border-radius:12px; margin-bottom:32px; border:1px solid ${t.border}; display:flex; justify-content:space-between; align-items:center;">
      <h3 style="margin:0; color:${t.text}; font-size:20px; font-weight:700;">Interactive Exam</h3>
      <div style="font-weight:600; color:${t.accent}; font-size:18px; padding:6px 12px; background:${t.bg}; border-radius:8px; border:1px solid ${t.border};">Score: <span id="exam-score">0</span> / ${data.mcqs.length}</div>
    </div>
  `;

  if(data.mcqs && data.mcqs.length > 0) {
    h += `<div style="font-size:12px; font-weight:700; color:${t.subText}; text-transform:uppercase; margin-bottom:16px; letter-spacing:1px;">Part A: Multiple Choice</div>`;
    data.mcqs.forEach((q, idx) => {
      h += `
        <div class="exam-mcq" data-correct="${q.correctIndex}" style="margin-bottom:24px; background:${t.cardBg}; border:1px solid ${t.border}; padding:24px; border-radius:12px; transition:0.2s;">
          <div style="font-weight:600; margin-bottom:16px; color:${t.text}; font-size:17px;">${idx+1}. ${q.question}</div>
          <div style="display:grid; gap:10px;">
            ${q.options.map((opt, i) => `
              <button class="exam-opt-btn" data-idx="${i}" style="text-align:left; padding:14px 16px; border:1px solid ${t.border}; background:${t.bg}; color:${t.text}; border-radius:8px; cursor:pointer; transition:all 0.2s; font-size:15px; font-weight:500;">
                <span style="opacity:0.5; margin-right:8px; font-weight:normal;">${String.fromCharCode(65+i)}</span> ${opt}
              </button>
            `).join('')}
          </div>
          <div class="exam-feedback" style="margin-top:16px; font-size:14px; font-weight:600; display:none;"></div>
        </div>`;
    });
  }
  
  if(data.short_answer && data.short_answer.length > 0) {
    h += `<div style="font-size:12px; font-weight:700; color:${t.subText}; text-transform:uppercase; margin-bottom:16px; letter-spacing:1px; margin-top:40px;">Part B: Short Answer</div>`;
    data.short_answer.forEach((q, idx) => {
      h += `
        <div style="margin-bottom:24px; padding:24px; background:${t.cardBg}; border:1px solid ${t.border}; border-radius:12px;">
          <div style="font-weight:600; font-size:16px; margin-bottom:12px; color:${t.text};">Q${idx+1}. ${q.question}</div>
          <details style="margin-top:12px;">
            <summary style="cursor:pointer; color:${t.accent}; font-weight:500; font-size:14px; outline:none;">Show Answer Key</summary>
            <div style="margin-top:12px; padding:16px; background:${t.bg}; border-radius:8px; border:1px solid ${t.border};">
              <ul style="margin:0; padding-left:20px; color:${t.subText}; line-height:1.6;">${q.answer_points.map(p => `<li>${p}</li>`).join('')}</ul>
            </div>
          </details>
        </div>`;
    });
  }

  if(data.long_answer && data.long_answer.length > 0) {
    h += `<div style="font-size:12px; font-weight:700; color:${t.subText}; text-transform:uppercase; margin-bottom:16px; letter-spacing:1px; margin-top:40px;">Part C: Long Answer</div>`;
    data.long_answer.forEach((q, idx) => {
        h += `
        <div style="margin-bottom:24px; padding:24px; background:${t.cardBg}; border:1px solid ${t.border}; border-radius:12px;">
          <div style="font-weight:600; font-size:16px; margin-bottom:12px; color:${t.text};">Q${idx+1}. ${q.question}</div>
          <details style="margin-top:12px;">
            <summary style="cursor:pointer; color:${t.accent}; font-weight:500; font-size:14px; outline:none;">Show Answer Key</summary>
             <div style="margin-top:12px; padding:16px; background:${t.bg}; border-radius:8px; border:1px solid ${t.border};">
              <ul style="margin:0; padding-left:20px; color:${t.subText}; line-height:1.6;">${q.answer_points.map(p => `<li>${p}</li>`).join('')}</ul>
            </div>
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
          feedback.innerText = "Correct"; feedback.style.color = "#16a34a";
          score++;
          if(scoreEl) scoreEl.innerText = score;
        } else {
          btn.style.background = "#fee2e2"; btn.style.borderColor = "#ef4444"; btn.style.color = "#7f1d1d";
          feedback.innerText = "Incorrect"; feedback.style.color = "#ef4444";
          if(buttons[correctIdx]) {
             buttons[correctIdx].style.background = "#dcfce7"; buttons[correctIdx].style.borderColor = "#16a34a"; buttons[correctIdx].style.color = "#14532d";
          }
        }
        feedback.style.display = "block";
      };
      // Add hover effect via JS since inline styles override CSS hover classes
      btn.onmouseenter = () => { if(!answered) btn.style.borderColor = t.accent; };
      btn.onmouseleave = () => { if(!answered) btn.style.borderColor = t.border; };
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}