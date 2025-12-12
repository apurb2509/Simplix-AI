/* content.js — FINAL STABLE VERSION (FIXED JSON PARSER + MOONSHOT BOT) */

// --- GUARD CLAUSE ---
if (window.simplixHasRun) {
  toggleSidebar();
  throw new Error("Simplix already running: Toggled sidebar.");
}
window.simplixHasRun = true;

// --- State Variables ---
let sidebarEl = null;
let cropOverlayEl = null;
let selectionRect = null; 
let currentMode = "kid-friendly"; 
let currentTheme = "blue";
let isProcessing = false;
let cropCleanup = null; 

// Chatbot State
let chatHistory = []; 
let chatMode = "relevant"; 
let currentContextText = ""; 
let chatPopupTimer = null; 

// --- ICONS ---
const ICONS = {
  logo: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path><path d="M8.5 8.5v.01"></path><path d="M16 15.5v.01"></path><path d="M12 12v.01"></path></svg>`,
  close: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  theme: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>`,
  crop: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"></path><path d="M18 22V8a2 2 0 0 0-2-2H2"></path></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  magic: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`,
  bot: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><rect x="4" y="8" width="16" height="12" rx="2"></rect><path d="M8 14h.01"></path><path d="M16 14h.01"></path></svg>`,
  send: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
  minimize: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline></svg>`
};

// --- Theme Definitions ---
const THEMES = {
  blue: {
    bg: "linear-gradient(135deg, #e0f2fe 0%, #bfdbfe 100%)",
    sidebarBg: "rgba(240, 249, 255, 0.95)", 
    text: "#0c4a6e", 
    subText: "#64748b",
    accent: "#0284c7", 
    accentHover: "#0369a1",
    accentText: "#ffffff", 
    cardBg: "#ffffff",
    border: "#bae6fd", 
    shadow: "0 20px 25px -5px rgba(14, 165, 233, 0.15)",
    glass: "backdrop-filter: blur(12px);",
    chatUserBg: "#0284c7",
    chatBotBg: "#f1f5f9"
  },
  light: {
    bg: "#f3f4f6",
    sidebarBg: "#ffffff",
    text: "#111827",
    subText: "#6b7280",
    accent: "#000000", 
    accentHover: "#333333",
    accentText: "#ffffff", 
    cardBg: "#fafafa",
    border: "#e5e7eb",
    shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
    glass: "none",
    chatUserBg: "#000000",
    chatBotBg: "#e5e7eb"
  },
  dark: {
    bg: "#000000",
    sidebarBg: "#000000", 
    text: "#e2e2e2",
    subText: "#a1a1a1",
    accent: "#ffffff", 
    accentHover: "#d4d4d4",
    accentText: "#000000", 
    cardBg: "#111111",
    border: "#333333",
    shadow: "0 10px 30px -5px rgba(255, 255, 255, 0.1)",
    glass: "none",
    chatUserBg: "#ffffff",
    chatBotBg: "#262626"
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
    .sx-mode-btn.active { background: var(--accent); color: var(--accentText) !important; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: translateY(-1px); border-color: var(--accent); }
    
    .sx-gen-btn { width: 100%; padding: 14px; background: var(--accent); color: var(--accentText); border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: var(--shadow); transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .sx-gen-btn:hover { background: var(--accentHover); transform: translateY(-1px); }
    
    /* --- Floating Chatbot CSS --- */
    #simplix-chat-popup {
        position: fixed; bottom: 30px; right: 30px;
        width: 320px; height: 420px;
        background: var(--cardBg); border: 1px solid var(--border);
        border-radius: 12px; box-shadow: 0 10px 40px -5px rgba(0,0,0,0.2);
        display: flex; flex-direction: column;
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 2147483650;
        transform: translateY(20px); opacity: 0; pointer-events: none;
    }
    #simplix-chat-popup.visible { transform: translateY(0); opacity: 1; pointer-events: auto; }
    #simplix-chat-popup.minimized {
        width: 50px; height: 50px; border-radius: 25px;
        overflow: hidden; cursor: pointer;
        background: var(--accent);
    }
    #simplix-chat-popup.minimized * { display: none !important; }
    #simplix-chat-popup.minimized::after {
        content: ''; position: absolute; top:0; left:0; width:100%; height:100%;
        background-image: url('data:image/svg+xml;utf8,<svg stroke="white" fill="none" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>');
        background-repeat: no-repeat; background-position: center; background-size: 24px;
        display: block !important;
    }

    .sx-chat-msg { margin-bottom: 12px; max-width: 80%; padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.5; }
    .sx-chat-user { background: var(--chatUserBg); color: var(--accentText); margin-left: auto; border-bottom-right-radius: 2px; }
    .sx-chat-bot { background: var(--chatBotBg); color: var(--text); margin-right: auto; border-bottom-left-radius: 2px; border: 1px solid var(--border); }
    
    .sx-chat-mode-btn { font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border); background: transparent; color: var(--subText); cursor: pointer; font-weight: 600; position: relative; }
    .sx-chat-mode-btn.active { background: var(--accent); color: var(--accentText); border-color: var(--accent); }
    
    .sx-chat-mode-btn::before {
        content: attr(data-tooltip);
        position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
        padding: 6px 10px; background: #222; color: #fff; font-size: 10px; border-radius: 4px;
        white-space: nowrap; opacity: 0; pointer-events: none; transition: 0.2s; margin-bottom: 6px;
        font-weight: 400; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .sx-chat-mode-btn:hover::before { opacity: 1; }

    #simplix-result-content::-webkit-scrollbar, #simplix-chat-history::-webkit-scrollbar { width: 6px; }
    #simplix-result-content::-webkit-scrollbar-track, #simplix-chat-history::-webkit-scrollbar-track { background: transparent; }
    #simplix-result-content::-webkit-scrollbar-thumb, #simplix-chat-history::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

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
    setTimeout(() => { if(sidebarEl) sidebarEl.remove(); sidebarEl = null; }, 300);
    if (cropCleanup) cropCleanup(); 
    return;
  }

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
      <button id="sb-crop-btn" class="sx-crop-btn">${ICONS.crop} Select Area</button>
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
      <button id="sb-generate-btn" class="sx-gen-btn">${ICONS.magic} <span>Generate Result</span></button>
    </div>
  `;

  document.body.appendChild(sidebarEl);

  sidebarEl.querySelector('#sb-close').onclick = toggleSidebar;
  sidebarEl.querySelector('#sb-crop-btn').onclick = toggleCropTool;
  sidebarEl.querySelector('#sb-theme-toggle').onclick = cycleTheme;
  const genBtn = sidebarEl.querySelector('#sb-generate-btn');
  genBtn.onclick = handleGenerateClick;

  const modeBtns = sidebarEl.querySelectorAll('.sx-mode-btn');
  modeBtns.forEach(btn => {
    btn.onclick = () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      if(!isProcessing) genBtn.innerHTML = `${ICONS.magic} <span>Generate Result</span>`;
    };
  });
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
  el.style.setProperty('--accentText', t.accentText); 
  el.style.setProperty('--cardBg', t.cardBg);
  el.style.setProperty('--border', t.border);
  el.style.setProperty('--shadow', t.shadow);
  el.style.setProperty('--chatUserBg', t.chatUserBg);
  el.style.setProperty('--chatBotBg', t.chatBotBg);

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
  
  if (sidebarEl) applySidebarStyles(sidebarEl);
  const overlay = document.getElementById('simplix-result-overlay');
  if (overlay) renderResult(null, currentMode, true);
  
  const chatPopup = document.getElementById('simplix-chat-popup');
  if (chatPopup) {
     const t = THEMES[currentTheme];
     chatPopup.style.setProperty('--bg', t.bg);
     chatPopup.style.setProperty('--cardBg', t.cardBg);
     chatPopup.style.setProperty('--text', t.text);
     chatPopup.style.setProperty('--accent', t.accent);
     chatPopup.style.setProperty('--border', t.border);
     chatPopup.style.setProperty('--chatUserBg', t.chatUserBg);
     chatPopup.style.setProperty('--chatBotBg', t.chatBotBg);
     chatPopup.style.background = t.cardBg;
     chatPopup.style.borderColor = t.border;
  }
}

function createModeBtn(mode, label) {
  return `<button class="sx-mode-btn" data-mode="${mode}">${label}</button>`;
}

// --- 3. Crop Tool ---
function toggleCropTool() {
  if (cropOverlayEl || cropCleanup) {
    if (cropCleanup) cropCleanup();
    return;
  }

  const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  const t = THEMES[currentTheme];

  cropOverlayEl = document.createElement('div');
  cropOverlayEl.style = `position: absolute; top:0; left:0; width:100%; height:${docHeight}px; z-index: 2147483646; cursor: crosshair; background: rgba(0,0,0,0.4);`;
  
  const wheelHandler = (e) => window.scrollBy({ top: e.deltaY, behavior: 'auto' });
  cropOverlayEl.addEventListener('wheel', wheelHandler, { passive: true });

  const startTop = window.scrollY + (window.innerHeight * 0.2);
  const startLeft = (window.innerWidth - 400) / 2;

  const box = document.createElement('div');
  box.id = 'simplix-crop-box';
  box.style = `position: absolute; left: ${startLeft}px; top: ${startTop}px; width: 400px; height: 300px; border: 1px solid white; outline: 1px dashed ${t.text}; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5); background: transparent; cursor: move;`;
  
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

  let isResizing = false, isMoving = false, currentHandle = null;
  let dragStartX = 0, dragStartY = 0, dragStartLeft = 0, dragStartTop = 0, dragStartW = 0, dragStartH = 0;

  const onMouseDown = (e) => {
    if (e.target.classList.contains('crop-handle')) { isResizing = true; currentHandle = e.target.dataset.dir; } 
    else if (e.target === box || e.target.parentNode === box) { isMoving = true; } 
    else return;
    e.preventDefault(); e.stopPropagation();
    dragStartX = e.pageX; dragStartY = e.pageY;
    dragStartLeft = box.offsetLeft; dragStartTop = box.offsetTop;
    dragStartW = box.offsetWidth; dragStartH = box.offsetHeight;
  };

  const onMouseMove = (e) => {
    if (!isMoving && !isResizing) return;
    const dx = e.pageX - dragStartX, dy = e.pageY - dragStartY;
    if (isMoving) {
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

  const onDblClick = (e) => { if(e.target === cropOverlayEl) if (cropCleanup) cropCleanup(); };

  cropOverlayEl.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  cropOverlayEl.addEventListener('dblclick', onDblClick);
  cropCleanup = () => {
    if (cropOverlayEl) { cropOverlayEl.remove(); cropOverlayEl = null; }
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
    currentContextText = extractVisibleText(selectionRect);
    if (!currentContextText || currentContextText.length < 5) throw new Error("No text found. Please set a crop area first.");
    
    // Reset Chat State
    chatHistory = [];
    chatMode = "relevant"; 
    
    // Remove existing chat popup if any
    const existingPopup = document.getElementById('simplix-chat-popup');
    if(existingPopup) existingPopup.remove();

    const resp = await requestModelForVisibleText(currentContextText, currentMode);
    renderResult(resp, currentMode);
    
    // Start Timer to show Chatbot
    if(chatPopupTimer) clearTimeout(chatPopupTimer);
    chatPopupTimer = setTimeout(() => {
        showFloatingChat(currentContextText);
    }, 2500);

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
  const formattingRules = "IMPORTANT: Do NOT use asterisks (*) or markdown bolding/italics in the output. Keep the text clean and plain.";
  
  if (mode === 'exam') {
    return `You are an strict Exam Generator. Analyze the text provided below and generate a structured exam in strictly VALID JSON format.
    Do NOT include any introductory text, markdown (like \`\`\`json), or explanations. Return ONLY the JSON object.
    The JSON structure must be:
    {
      "mcqs": [ { "id": 1, "question": "Question text?", "options": ["A", "B", "C", "D"], "correctIndex": 0 } ... (15 questions) ],
      "short_answer": [ { "question": "Question text (3 Marks)", "answer_points": ["Point 1", "Point 2", "Point 3"] } ... (10 questions) ],
      "long_answer": [ { "question": "Question text (5 Marks)", "answer_points": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"] } ... (5 question) ]
    }
    Content to analyze: ${text}`;
  }

  switch(mode) {
    case 'kid-friendly': instructions = "You are a friendly teacher explaining complex topics to young children aged 5-8. Make learning fun. Break down concepts using everyday objects, toys, or familiar situations. Use short, clear sentences. Keep an enthusiastic, warm tone. Avoid jargon. Use storytelling."; break;
    case 'story': instructions = "You are a creative storyteller. Rewrite the given information as a captivating short story with a clear plot (beginning, middle, end). Create memorable characters. Weave concepts naturally into events and dialogue. Ensure every important fact appears in the narrative. End with a solid moral/lesson."; break;
    case 'step-by-step': instructions = "You are a technical instructor creating an actionable guide. Break the process into clear numbered steps. For each step, provide the action, reason, and expected outcome. Use bold headers. Include specific details like commands or values. Add troubleshooting tips."; break;
    case 'summary': instructions = "You are an executive analyst. Format response in 3 sections: 1) Executive Summary (2-3 paragraphs with main insights), 2) Key Takeaways (bullet list of 4-7 critical points), 3) Why This Matters (implications). Maintain professional tone. Be concise."; break;
    case 'formal': instructions = "You are an academic scholar. Elevate language to meet rigorous academic standards. Use sophisticated vocabulary and complex sentence structures. Prefer passive voice. Eliminate casual language. Use hedging ('suggests', 'indicates'). Format with proper paragraphs."; break;
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

// --- 7. Renderer (Visuals) ---
function renderResult(modelData, mode, isRefreshOnly = false) {
  let overlay = document.getElementById('simplix-result-overlay');
  
  if (!overlay && !isRefreshOnly) {
    overlay = document.createElement('div');
    overlay.id = 'simplix-result-overlay';
    const t = THEMES[currentTheme];
    overlay.style = `
      position: fixed; left: 50%; top: 5%; transform: translateX(-50%);
      width: 65%; height: 85vh; background: ${t.cardBg}; z-index: 2147483648;
      box-shadow: 0 50px 100px -20px rgba(0,0,0,0.5);
      border-radius: 16px; border: 1px solid ${t.border};
      display: flex; flex-direction: column; overflow: hidden; font-family: 'Inter', sans-serif;
      animation: sx-fade-up 0.3s ease-out forwards;
    `;
    document.body.appendChild(overlay);
  } else if (!overlay && isRefreshOnly) return;

  const t = THEMES[currentTheme];
  overlay.style.background = t.cardBg;
  overlay.style.borderColor = t.border;
  overlay.style.color = t.text;
  
  if(isRefreshOnly) {
     const header = overlay.querySelector('.sx-res-header');
     if(header) { header.style.background = t.bg; header.style.borderColor = t.border; }
     return;
  }

  let contentRaw = "";
  if (typeof modelData === "string") contentRaw = modelData;
  else if (modelData?.data?.choices) contentRaw = modelData.data.choices[0].message.content;
  else contentRaw = JSON.stringify(modelData);

  let html = `
    <div class="sx-res-header" style="background:${t.bg}; border-bottom:1px solid ${t.border}; padding:16px 24px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
      <div style="font-weight:700; font-size:16px; display:flex; align-items:center; gap:8px; color:${t.text};">
        <span style="color:${t.accent}">${ICONS.magic}</span> Result: <span style="opacity:0.7">${mode.toUpperCase().replace('-', ' ')}</span>
      </div>
      <button id="res-close" style="background:transparent; border:none; color:${t.subText}; cursor:pointer; padding:8px; border-radius:6px; display:flex;">${ICONS.close}</button>
    </div>
    <div id="simplix-result-content" style="padding:40px; overflow-y:auto; flex-grow:1; line-height:1.7; color:${t.text}; font-size:16px; background:${t.bg};">
  `;

  if (mode === 'exam') {
    try {
      // --- FIX: Robust JSON Extraction ---
      const firstBrace = contentRaw.indexOf('{');
      const lastBrace = contentRaw.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const jsonCandidate = contentRaw.substring(firstBrace, lastBrace + 1);
          const examData = JSON.parse(jsonCandidate);
          html += renderInteractiveExam(examData, t);
      } else {
          throw new Error("No JSON object found");
      }
    } catch (e) {
      console.error(e);
      html += `<div style="color:#ef4444; font-weight:bold; padding:20px; background:rgba(239, 68, 68, 0.1); border-radius:8px;">
        Error parsing exam data. The AI might have returned invalid format.<br><br>
        <span style="font-size:12px; opacity:0.8;">Raw output length: ${contentRaw.length} chars</span>
      </div>`;
    }
  } else {
    const formatted = escapeHtml(contentRaw).split('\n').map(line => line.trim() ? `<p style="margin-bottom:1em">${line}</p>` : '').join('');
    html += formatted;
  }

  html += `</div>`;
  overlay.innerHTML = html;
  overlay.querySelector('#res-close').onclick = () => { overlay.remove(); if(chatPopupTimer) clearTimeout(chatPopupTimer); const p = document.getElementById('simplix-chat-popup'); if(p) p.remove(); };
  
  if (mode === 'exam') attachExamListeners(overlay, t);
}

// --- 8. Floating Chatbot Logic ---
function showFloatingChat(contextText) {
    if (document.getElementById('simplix-chat-popup')) return;

    const t = THEMES[currentTheme];
    const popup = document.createElement('div');
    popup.id = 'simplix-chat-popup';
    
    // Apply CSS vars
    popup.style.setProperty('--cardBg', t.cardBg);
    popup.style.setProperty('--border', t.border);
    popup.style.setProperty('--accent', t.accent);
    popup.style.setProperty('--text', t.text);
    popup.style.setProperty('--subText', t.subText);
    popup.style.setProperty('--chatUserBg', t.chatUserBg);
    popup.style.setProperty('--chatBotBg', t.chatBotBg);
    popup.style.setProperty('--bg', t.bg);

    popup.innerHTML = `
        <div id="chat-header" style="padding:12px 16px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:var(--bg); border-radius:12px 12px 0 0; cursor:pointer;">
            <div style="display:flex; align-items:center; gap:8px; font-weight:700; font-size:14px; color:var(--text);">
                <span style="color:var(--accent);">${ICONS.bot}</span> SimplixBot
            </div>
            <button id="chat-minimize" style="background:transparent; border:none; color:var(--subText); cursor:pointer;">${ICONS.minimize}</button>
        </div>
        
        <div style="padding:8px; border-bottom:1px solid var(--border); background:var(--cardBg); display:flex; justify-content:center; gap:6px;">
            <button id="chat-mode-relevant" class="sx-chat-mode-btn active" data-tooltip="Strictly answers questions based on the selected text only.">Relevant Mode</button>
            <button id="chat-mode-general" class="sx-chat-mode-btn" data-tooltip="Answers general knowledge questions beyond the selected text.">General Mode</button>
        </div>

        <div id="simplix-chat-history" style="flex-grow:1; overflow-y:auto; padding:12px; background:var(--bg); display:flex; flex-direction:column; gap:8px;">
            <div style="font-size:13px; color:var(--subText); text-align:center; margin-top:10px;">
                Hello! I'm ready to help. <br>Ask me about the content on screen.
            </div>
        </div>

        <div style="padding:10px; background:var(--cardBg); border-top:1px solid var(--border); border-radius:0 0 12px 12px; display:flex; gap:6px;">
            <input type="text" id="simplix-chat-input" placeholder="Ask a question..." style="flex-grow:1; border:1px solid var(--border); padding:8px 10px; border-radius:6px; outline:none; font-size:13px; background:var(--bg); color:var(--text);">
            <button id="simplix-chat-send" style="background:var(--accent); color:var(--accentText); border:none; padding:0 12px; border-radius:6px; cursor:pointer;">${ICONS.send}</button>
        </div>
    `;

    document.body.appendChild(popup);
    
    // Animation trigger
    setTimeout(() => popup.classList.add('visible'), 50);

    // --- Interaction Logic ---
    const historyDiv = popup.querySelector('#simplix-chat-history');
    const inputEl = popup.querySelector('#simplix-chat-input');
    const sendBtn = popup.querySelector('#simplix-chat-send');
    const relevantBtn = popup.querySelector('#chat-mode-relevant');
    const generalBtn = popup.querySelector('#chat-mode-general');
    const minimizeBtn = popup.querySelector('#chat-minimize');
    const header = popup.querySelector('#chat-header');

    // Toggle Minimize
    const toggleMin = () => {
        popup.classList.toggle('minimized');
    };
    minimizeBtn.onclick = (e) => { e.stopPropagation(); toggleMin(); };
    popup.onclick = (e) => {
        if(popup.classList.contains('minimized')) toggleMin();
    };

    // Mode Switching
    relevantBtn.onclick = () => {
        chatMode = 'relevant';
        relevantBtn.classList.add('active');
        generalBtn.classList.remove('active');
        inputEl.placeholder = "Ask strict questions about text...";
    };
    generalBtn.onclick = () => {
        chatMode = 'general';
        generalBtn.classList.add('active');
        relevantBtn.classList.remove('active');
        inputEl.placeholder = "Ask general questions...";
    };

    // Messaging
    const appendMessage = (role, text) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `sx-chat-msg ${role === 'user' ? 'sx-chat-user' : 'sx-chat-bot'}`;
        msgDiv.textContent = text;
        historyDiv.appendChild(msgDiv);
        historyDiv.scrollTop = historyDiv.scrollHeight;
    };

    const handleSend = async () => {
        const query = inputEl.value.trim();
        if(!query) return;

        inputEl.value = "";
        appendMessage('user', query);
        
        const loadingId = 'bot-load-' + Date.now();
        const loadingDiv = document.createElement('div');
        loadingDiv.id = loadingId;
        loadingDiv.className = 'sx-chat-msg sx-chat-bot';
        loadingDiv.style.opacity = '0.7'; loadingDiv.innerText = "...";
        historyDiv.appendChild(loadingDiv);
        historyDiv.scrollTop = historyDiv.scrollHeight;

        try {
            let messages = [];
            if (chatMode === 'relevant') {
                messages.push({
                    role: "system",
                    content: `You are SimplixBot. STRICT RULE: Answer ONLY based on the provided context. If the answer is not in the text, say "Sorry, it is not present in the selected area, out of context."\n\n[CONTEXT]:\n${currentContextText}`
                });
            } else {
                messages.push({ role: "system", content: "You are SimplixBot, a helpful assistant." });
            }

            const recentHistory = chatHistory.slice(-4);
            recentHistory.forEach(m => messages.push(m));
            messages.push({ role: "user", content: query });

            const r = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ action: "invokeGroq", messages }, (res) => {
                    if (!res.ok) reject(new Error(res.error?.message || "Error"));
                    else resolve(res.data);
                });
            });

            const botText = r.choices[0].message.content;
            document.getElementById(loadingId).remove();
            appendMessage('assistant', botText);
            
            chatHistory.push({ role: "user", content: query });
            chatHistory.push({ role: "assistant", content: botText });
        } catch (err) {
            document.getElementById(loadingId).remove();
            appendMessage('assistant', "Error: " + err.message);
        }
    };

    sendBtn.onclick = handleSend;
    inputEl.onkeydown = (e) => { if(e.key === 'Enter') handleSend(); };
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
          score++; if(scoreEl) scoreEl.innerText = score;
        } else {
          btn.style.background = "#fee2e2"; btn.style.borderColor = "#ef4444"; btn.style.color = "#7f1d1d";
          feedback.innerText = "Incorrect"; feedback.style.color = "#ef4444";
          if(buttons[correctIdx]) { buttons[correctIdx].style.background = "#dcfce7"; buttons[correctIdx].style.borderColor = "#16a34a"; buttons[correctIdx].style.color = "#14532d"; }
        }
        feedback.style.display = "block";
      };
      btn.onmouseenter = () => { if(!answered) btn.style.borderColor = t.accent; };
      btn.onmouseleave = () => { if(!answered) btn.style.borderColor = t.border; };
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}