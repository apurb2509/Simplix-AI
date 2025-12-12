/* content.js — FINAL STABLE VERSION (FIXED EXAM CRASH + DRAGGABLE + CHATBOT) */

// --- GUARD CLAUSE ---
if (window.simplixHasRun) {
  const sb = document.getElementById('simplix-sidebar');
  if (sb) toggleSidebar();
  throw new Error("Simplix already running.");
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
  copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
  mic: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
  minimize: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  move: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="15 19 12 22 9 19"></polyline><polyline points="19 9 22 12 19 15"></polyline><circle cx="12" cy="12" r="1"></circle></svg>`,
  theme: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>`,
  crop: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"></path><path d="M18 22V8a2 2 0 0 0-2-2H2"></path></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  magic: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`,
  bot: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><rect x="4" y="8" width="16" height="12" rx="2"></rect><path d="M8 14h.01"></path><path d="M16 14h.01"></path></svg>`,
  send: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`
};

// --- Theme Definitions ---
const THEMES = {
  blue: {
    bg: "linear-gradient(135deg, #e0f2fe 0%, #bfdbfe 100%)",
    sidebarBg: "rgba(240, 249, 255, 0.98)", 
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
    sidebarBg: "#0f0f0f", 
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

// --- Internal CSS Injection (FIXED) ---
function injectStyles() {
  let style = document.getElementById('simplix-global-styles');
  if (!style) {
    style = document.createElement('style');
    style.id = 'simplix-global-styles';
    document.head.appendChild(style);
  }
  
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    #simplix-sidebar, #simplix-result-overlay, #simplix-chat-popup { font-family: 'Inter', sans-serif; box-sizing: border-box; }
    #simplix-sidebar *, #simplix-result-overlay *, #simplix-chat-popup * { box-sizing: border-box; }
    
    /* Buttons */
    .sx-btn-icon { background: transparent; border: none; cursor: pointer; color: var(--subText); padding: 6px; border-radius: 6px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; }
    .sx-btn-icon:hover { background: var(--border); color: var(--text); }
    
    .sx-card { background: var(--cardBg); padding: 16px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 16px; transition: all 0.3s ease; }
    .sx-label { font-size: 10px; font-weight: 700; color: var(--subText); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.8px; display: flex; align-items: center; gap: 6px; }
    
    .sx-crop-btn { width: 100%; padding: 12px; background: transparent; border: 1px dashed var(--border); color: var(--text); border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 13px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .sx-crop-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--cardBg); }
    .sx-crop-btn.active { border-style: solid; border-color: var(--accent); background: var(--bg); color: var(--accent); }

    /* Copy Button in Chat */
.sx-chat-msg { position: relative; } /* Ensure parent is relative */
.sx-chat-copy-btn {
    position: absolute;
    bottom: 4px;
    right: 4px;
    background: rgba(255,255,255,0.2); 
    border: none;
    border-radius: 4px;
    padding: 4px;
    cursor: pointer;
    color: inherit;
    opacity: 0.6;
    transition: 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}
.sx-chat-copy-btn:hover { opacity: 1; background: rgba(255,255,255,0.4); }

    /* Mode Buttons - Strict Contrast */
    .sx-mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .sx-mode-btn { padding: 8px 10px; border: 1px solid transparent; background: var(--bg); border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; color: var(--subText); transition: all 0.2s; text-align: center; }
    .sx-mode-btn:hover { background: var(--border); color: var(--text); }
    .sx-mode-btn.active { background: var(--accent); color: var(--accentText) !important; font-weight: 700; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-color: var(--accent); }
    
    .sx-gen-btn { width: 100%; padding: 14px; background: var(--accent); color: var(--accentText); border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: var(--shadow); transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .sx-gen-btn:hover { background: var(--accentHover); transform: translateY(-1px); }
    
    /* Draggable Header Styling */
    .sx-drag-header { cursor: move; user-select: none; display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg); border-bottom: 1px solid var(--border); border-radius: 12px 12px 0 0; }
    
    /* Minimize State */
    .sx-minimized { width: 48px !important; height: 48px !important; overflow: hidden; border-radius: 50% !important; background: var(--accent) !important; border: 2px solid var(--accentText) !important; box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important; cursor: pointer; padding: 0 !important; display: flex !important; align-items: center; justify-content: center; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); transform: none !important; }
    .sx-minimized * { display: none !important; }
    .sx-minimized::after { content: ''; width: 20px; height: 20px; background-color: var(--accentText); mask: url('data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path><path d="M8.5 8.5v.01"></path><path d="M16 15.5v.01"></path><path d="M12 12v.01"></path></svg>') no-repeat center; mask-size: contain; -webkit-mask: url('data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path><path d="M8.5 8.5v.01"></path><path d="M16 15.5v.01"></path><path d="M12 12v.01"></path></svg>') no-repeat center; -webkit-mask-size: contain; display: block; }
    
    /* Chat CSS - FIXED DIMENSIONS ADDED HERE */
    #simplix-chat-popup {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 340px;
      height: 500px;
      display: flex;
      flex-direction: column;
      z-index: 2147483650;
      background: var(--cardBg);
      border: 1px solid var(--border);
      box-shadow: 0 20px 50px rgba(0,0,0,0.25);
      border-radius: 12px;
      
      transform: translateY(20px); 
      opacity: 0; 
      pointer-events: none; 
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    #simplix-chat-popup.visible { transform: translateY(0); opacity: 1; pointer-events: auto; }
    
    .sx-chat-msg { margin-bottom: 12px; max-width: 80%; padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.5; }
    .sx-chat-user { background: var(--chatUserBg); color: var(--accentText); margin-left: auto; border-bottom-right-radius: 2px; }
    .sx-chat-bot { background: var(--chatBotBg); color: var(--text); margin-right: auto; border-bottom-left-radius: 2px; border: 1px solid var(--border); }
    
    .sx-chat-mode-btn { font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border); background: transparent; color: var(--subText); cursor: pointer; font-weight: 600; position: relative; }
    .sx-chat-mode-btn.active { background: var(--accent); color: var(--accentText) !important; border-color: var(--accent); }
    
    /* Tooltips */
    .sx-chat-mode-btn::before { content: attr(data-tooltip); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); padding: 6px 10px; background: #222; color: #fff; font-size: 10px; border-radius: 4px; white-space: nowrap; opacity: 0; pointer-events: none; transition: 0.2s; margin-bottom: 6px; font-weight: 400; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; }
    .sx-chat-mode-btn:hover::before { opacity: 1; }

    /* Scrollbars & Isolation */
    #simplix-result-content { overscroll-behavior: contain; }
    #simplix-result-content::-webkit-scrollbar, #simplix-chat-history::-webkit-scrollbar { width: 6px; }
    #simplix-result-content::-webkit-scrollbar-track, #simplix-chat-history::-webkit-scrollbar-track { background: transparent; }
    #simplix-result-content::-webkit-scrollbar-thumb, #simplix-chat-history::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    #simplix-result-content::-webkit-scrollbar-thumb:hover { background: var(--subText); }

    @keyframes sx-slide-in { from { transform: translateX(50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes sx-pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
  `;
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
    sidebarEl.style.opacity = '0';
    setTimeout(() => { if(sidebarEl) sidebarEl.remove(); sidebarEl = null; }, 200);
    if (cropCleanup) cropCleanup(); 
    return;
  }

  sidebarEl = document.createElement('div');
  sidebarEl.id = 'simplix-sidebar';
  applySidebarStyles(sidebarEl);
  
  sidebarEl.innerHTML = `
    <div class="sx-drag-header">
      <div style="display:flex; align-items:center; gap:8px;">
        <div style="cursor:move; color:var(--accent); display:flex;">${ICONS.move}</div>
        <span style="font-weight:700; font-size:14px; color:var(--text);">Simplix AI</span>
      </div>
      <div style="display:flex; gap:4px;">
         <button id="sb-min" class="sx-btn-icon" title="Minimize">${ICONS.minimize}</button>
         <button id="sb-theme-toggle" class="sx-btn-icon" title="Change Theme">${ICONS.theme}</button>
         <button id="sb-close" class="sx-btn-icon" title="Close">${ICONS.close}</button>
      </div>
    </div>

    <div style="padding: 0 24px 24px 24px; display:flex; flex-direction:column; height: calc(100% - 50px); overflow-y:auto;">
        <div style="margin-top:16px;" class="sx-card">
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
    </div>
  `;

  document.body.appendChild(sidebarEl);
  makeDraggable(sidebarEl, sidebarEl.querySelector('.sx-drag-header'));

  // Listeners
  sidebarEl.querySelector('#sb-close').onclick = toggleSidebar;
  sidebarEl.querySelector('#sb-min').onclick = (e) => { e.stopPropagation(); toggleMinimize(sidebarEl); };
  sidebarEl.querySelector('#sb-crop-btn').onclick = toggleCropTool;
  sidebarEl.querySelector('#sb-theme-toggle').onclick = cycleTheme;
  const genBtn = sidebarEl.querySelector('#sb-generate-btn');
  genBtn.onclick = handleGenerateClick;

  sidebarEl.onclick = (e) => {
      if(sidebarEl.classList.contains('sx-minimized')) toggleMinimize(sidebarEl);
  };

  const modeBtns = sidebarEl.querySelectorAll('.sx-mode-btn');
  modeBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      if(!isProcessing) genBtn.innerHTML = `${ICONS.magic} <span>Generate Result</span>`;
    };
  });
  const defaultBtn = sidebarEl.querySelector(`button[data-mode="${currentMode}"]`);
  if(defaultBtn) defaultBtn.click();
}

// --- Draggable Logic ---
function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.right = 'auto';
        element.style.bottom = 'auto';
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function toggleMinimize(el) {
    el.classList.toggle('sx-minimized');
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
    position: fixed; top: 20px; right: 20px; width: 340px; height: auto; max-height: 90vh;
    background: var(--sidebarBg); ${t.glass}
    box-shadow: -10px 0 40px rgba(0,0,0,0.2);
    z-index: 2147483647; 
    display: flex; flex-direction: column;
    border: 1px solid var(--border); border-radius: 12px;
    animation: sx-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  `;
}

function cycleTheme() {
  if (currentTheme === 'blue') currentTheme = 'light';
  else if (currentTheme === 'light') currentTheme = 'dark';
  else currentTheme = 'blue';
  
  if (sidebarEl) applySidebarStyles(sidebarEl);
  
  const overlay = document.getElementById('simplix-result-overlay');
  if (overlay) {
      const t = THEMES[currentTheme];
      overlay.style.setProperty('--bg', t.bg);
      overlay.style.setProperty('--cardBg', t.cardBg);
      overlay.style.setProperty('--text', t.text);
      overlay.style.setProperty('--accent', t.accent);
      overlay.style.setProperty('--accentText', t.accentText);
      overlay.style.setProperty('--border', t.border);
      overlay.style.setProperty('--chatUserBg', t.chatUserBg);
      overlay.style.setProperty('--chatBotBg', t.chatBotBg);
      overlay.style.background = t.cardBg;
      overlay.style.borderColor = t.border;
      const h = overlay.querySelector('.sx-drag-header');
      if(h) h.style.background = t.bg;
      renderResult(null, currentMode, true);
  }
  
  const chatPopup = document.getElementById('simplix-chat-popup');
  if (chatPopup) {
     const t = THEMES[currentTheme];
     chatPopup.style.setProperty('--bg', t.bg);
     chatPopup.style.setProperty('--cardBg', t.cardBg);
     chatPopup.style.setProperty('--text', t.text);
     chatPopup.style.setProperty('--accent', t.accent);
     chatPopup.style.setProperty('--accentText', t.accentText);
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

// --- 3. Auto-Scrolling Crop Tool ---
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
  let autoScrollInterval = null;

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
    if (isMoving || isResizing) {
        const threshold = 60; 
        const scrollSpeed = 15;
        if (e.clientY < threshold) {
            if (!autoScrollInterval) autoScrollInterval = setInterval(() => window.scrollBy(0, -scrollSpeed), 20);
        } else if (window.innerHeight - e.clientY < threshold) {
            if (!autoScrollInterval) autoScrollInterval = setInterval(() => window.scrollBy(0, scrollSpeed), 20);
        } else {
            if (autoScrollInterval) { clearInterval(autoScrollInterval); autoScrollInterval = null; }
        }
    }

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
    if (autoScrollInterval) { clearInterval(autoScrollInterval); autoScrollInterval = null; }
    
    if (isMoving || isResizing) {
      selectionRect = { left: box.offsetLeft, top: box.offsetTop, width: box.offsetWidth, height: box.offsetHeight };
      if (sidebarEl) {
        const status = sidebarEl.querySelector('#sb-crop-status');
        const btn = sidebarEl.querySelector('#sb-crop-btn');
        if(status && btn) {
            status.style.display = 'flex';
            btn.innerHTML = `${ICONS.check} Area Set`;
            btn.classList.add('active');
        }
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
    if (autoScrollInterval) clearInterval(autoScrollInterval);
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
  const formattingRules = "IMPORTANT: Do NOT use asterisks (*) or markdown bolding/italics in the output at all, not even for making any heading, sub-heading or any text bold. Keep the text clean and plain.";
  
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
    case 'kid-friendly': 
      instructions = "You are a friendly teacher explaining complex topics to young children aged 5-8 years old. Your goal is to make learning fun and accessible. Break down complex concepts into very simple terms using everyday objects, toys, animals, or familiar situations. Use short, clear sentences with maximum 10-15 words per sentence. Give your response as shorter as possible, as kids would not be able to read and understand a lot at a time. Make frequent comparisons to things children encounter daily like playgrounds, cartoons, or family activities. Keep an enthusiastic, warm, and encouraging tone throughout. Avoid technical jargon completely, and if you must use a big word, immediately explain it in simple terms. Use storytelling elements to maintain engagement and ask rhetorical questions to make it interactive. Make the explanation feel like a fun conversation, not a lecture."; 
      break;
      
    case 'story': 
      instructions = "You are a creative storyteller who transforms educational content into engaging narratives. Write a precise and interesting story name, somewhere between 2 words to 6 words long. Your task is to rewrite the given information as a captivating short story. Create memorable characters with distinct personalities like Detective Data who solves mysteries with facts, Professor Curious who asks questions, or Captain Logic who connects ideas. Develop a clear plot structure with a beginning that presents a problem or question, a middle that shows the journey of discovery, and an end that provides resolution and understanding. Weave the key concepts and information naturally into the story's events and dialogue. Use vivid descriptions and sensory details to bring the story to life. Include dialogue between characters to explain concepts conversationally and build tension or curiosity that gets resolved as the educational content unfolds. Ensure every important fact from the original text appears somewhere in the narrative. Keep the story engaging and age-appropriate for general audiences, and end with a satisfying conclusion that reinforces the main learning points. Include a solid one liner moral/lesson or one liner conclusion at the end."; 
      break;
      
    case 'step-by-step': 
      instructions = "You are a technical instructor creating a comprehensive, actionable implementation guide. Your goal is to enable someone to follow your instructions and successfully complete the task or understand the concept. Start with a brief overview of what will be accomplished, then list any prerequisites, requirements, or background knowledge needed. Break down the entire process into clear, sequential numbered shorter and concise steps using format like 1., 2., 3., and so on. For each step provide the action, explain why it matters, and describe expected outcomes. Use bold headers for major sections like Prerequisites, Step 1 Setup, Step 2 Configuration, and others. Include specific details such as exact commands, code snippets with syntax highlighting, file paths, and configuration values. Add troubleshooting tips or common pitfalls after complex steps and provide verification checkpoints like 'At this point you should see'. Include examples or sample outputs where applicable and conclude with next steps or additional resources. Maintain a clear, authoritative, but approachable instructional tone throughout the guide."; 
      break;
      
    case 'summary': 
      instructions = "You are an executive analyst creating a high-level strategic summary for busy professionals and decision-makers. Your summary must be comprehensive yet concise. Format your response in three distinct sections. First, create an Executive Summary with 2-3 to-the-point and precise paragraphs that opens with the single most important insight or conclusion, provides context about what this is about and why it matters, highlights the main findings or arguments in a flowing narrative, and keeps it scannable and focused on the big picture. Second, provide Key Takeaways as a bulleted list with 4-7 of the most critical points that readers must remember, where each bullet should be a complete standalone insight that prioritizes actionable insights and significant facts using clear direct language. Third, include a Why This Matters section with 1-2 paragraphs that explains the broader implications and real-world impact, connects to larger trends or challenges or opportunities, answers why the reader should care about this information, and if applicable mentions who is most affected or what decisions this informs. Maintain a professional objective tone throughout and avoid redundancy between sections. Just note that don't write too much in any sentence, as it is a conclusion, show all information needed to be known by the user shortly and precisely."; 
      break;
      
    case 'formal': 
      instructions = "You are an academic scholar rewriting content for publication in a peer-reviewed journal or formal research context. Your objective is to elevate the language to meet rigorous academic standards. Employ sophisticated discipline-appropriate vocabulary and terminology throughout. Use complex sentence structures with subordinate clauses where appropriate and prefer passive voice constructions for objectivity such as 'It was observed that' rather than 'We saw'. Eliminate all colloquialisms, contractions, and casual language completely. Support statements with qualifiers that indicate level of certainty like 'It appears that', 'Evidence suggests', or 'The data indicates'. Structure arguments logically with clear transitions between ideas and maintain an objective detached tone while avoiding first-person perspective and emotional language. Use precise unambiguous language where every word serves a purpose. Include appropriate hedging language for claims using terms like 'may', 'could potentially', or 'appears to'. Format with proper academic conventions using full sentences and formal paragraph structure. Assume an educated audience familiar with complex concepts, maintain scholarly gravitas and intellectual rigor throughout, and present information as if contributing to ongoing academic discourse."; 
      break;
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
  
  // 1. Create Overlay if it doesn't exist
  if (!overlay && !isRefreshOnly) {
    overlay = document.createElement('div');
    overlay.id = 'simplix-result-overlay';
    const t = THEMES[currentTheme];
    overlay.style = `
      position: fixed; top: 5%; left: 50%; width: 65%; height: 85vh; 
      transform: translateX(-50%); /* Start centered */
      background: ${t.cardBg}; z-index: 2147483648;
      box-shadow: 0 50px 100px -20px rgba(0,0,0,0.5);
      border-radius: 16px; border: 1px solid ${t.border};
      display: flex; flex-direction: column; overflow: hidden; font-family: 'Inter', sans-serif;
      animation: sx-fade-up 0.3s ease-out forwards;
    `;
    document.body.appendChild(overlay);
  } else if (!overlay && isRefreshOnly) return;

  // 2. Apply Theme Styles
  const t = THEMES[currentTheme];
  overlay.style.setProperty('--bg', t.bg);
  overlay.style.setProperty('--cardBg', t.cardBg);
  overlay.style.setProperty('--text', t.text);
  overlay.style.setProperty('--accent', t.accent);
  overlay.style.setProperty('--accentText', t.accentText);
  overlay.style.setProperty('--border', t.border);
  overlay.style.setProperty('--chatUserBg', t.chatUserBg);
  overlay.style.setProperty('--chatBotBg', t.chatBotBg);
  overlay.style.background = t.cardBg;
  overlay.style.borderColor = t.border;
  overlay.style.color = t.text;
  
  if(isRefreshOnly) {
      const header = overlay.querySelector('.sx-drag-header');
      if(header) { header.style.background = t.bg; header.style.borderColor = t.border; }
      return;
  }

  // 3. Process Content
  let contentRaw = "";
  if (typeof modelData === "string") contentRaw = modelData;
  else if (modelData?.data?.choices) contentRaw = modelData.data.choices[0].message.content;
  else contentRaw = JSON.stringify(modelData);

  // 4. Construct HTML
  let html = `
    <div class="sx-drag-header">
      <div style="display:flex; align-items:center; gap:8px;">
        <div style="cursor:move; color:var(--accent); display:flex;">${ICONS.move}</div>
        <div style="font-weight:700; font-size:16px; display:flex; align-items:center; gap:8px; color:var(--text);">
           <span style="color:var(--accent);">${ICONS.magic}</span> Result: <span style="opacity:0.7">${mode.toUpperCase().replace('-', ' ')}</span>
        </div>
      </div>
      <div style="display:flex; gap:4px;">
        <button id="res-copy" class="sx-btn-icon" title="Copy Content">${ICONS.copy}</button>
        <button id="res-min" class="sx-btn-icon" title="Minimize">${ICONS.minimize}</button>
        <button id="res-close" class="sx-btn-icon" title="Close">${ICONS.close}</button>
      </div>
    </div>
    
    <div id="simplix-result-content" style="padding:40px; overflow-y:auto; flex-grow:1; line-height:1.7; color:var(--text); font-size:16px; background:var(--bg);">
  `;

  if (mode === 'exam') {
    try {
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
  
  // 5. Add Functionality
  makeDraggable(overlay, overlay.querySelector('.sx-drag-header'));
  
  overlay.querySelector('#res-close').onclick = () => { overlay.remove(); if(chatPopupTimer) clearTimeout(chatPopupTimer); const p = document.getElementById('simplix-chat-popup'); if(p) p.remove(); };
  overlay.querySelector('#res-min').onclick = (e) => { e.stopPropagation(); toggleMinimize(overlay); };
  
  // --- NEW: Copy Button Logic ---
  const copyBtn = overlay.querySelector('#res-copy');
  if (copyBtn) {
      copyBtn.onclick = () => {
          const contentDiv = overlay.querySelector('#simplix-result-content');
          const textToCopy = contentDiv.innerText;
          
          navigator.clipboard.writeText(textToCopy).then(() => {
              // Visual Feedback
              const originalIcon = copyBtn.innerHTML;
              copyBtn.innerHTML = ICONS.check; // Changes to checkmark
              copyBtn.style.color = "var(--accent)";
              
              setTimeout(() => { 
                  copyBtn.innerHTML = originalIcon; // Revert icon
                  copyBtn.style.color = ""; // Revert color
              }, 1500);
          }).catch(err => {
              console.error('Failed to copy text: ', err);
          });
      };
  }

  overlay.onclick = (e) => { if(overlay.classList.contains('sx-minimized')) toggleMinimize(overlay); };

  if (mode === 'exam') attachExamListeners(overlay, t);
}

// --- 8. Floating Chatbot Logic (Ensure this is updated) ---
function showFloatingChat(contextText) {
  if (document.getElementById('simplix-chat-popup')) return;

  const t = THEMES[currentTheme];
  const popup = document.createElement('div');
  popup.id = 'simplix-chat-popup';
  
  // Set variables for children to use
  popup.style.setProperty('--cardBg', t.cardBg);
  popup.style.setProperty('--border', t.border);
  popup.style.setProperty('--accent', t.accent);
  popup.style.setProperty('--accentText', t.accentText);
  popup.style.setProperty('--text', t.text);
  popup.style.setProperty('--subText', t.subText);
  popup.style.setProperty('--chatUserBg', t.chatUserBg);
  popup.style.setProperty('--chatBotBg', t.chatBotBg);
  popup.style.setProperty('--bg', t.bg);

  popup.innerHTML = `
      <div id="chat-header" class="sx-drag-header">
          <div style="display:flex; align-items:center; gap:8px; font-weight:700; font-size:14px; color:var(--text);">
              <div style="cursor:move; color:var(--accent); display:flex;">${ICONS.move}</div>
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
              Hello, SimplixBot here! I'm ready to help. <br>Ask me about the content on screen.
          </div>
      </div>

      <div style="padding:10px; background:var(--cardBg); border-top:1px solid var(--border); border-radius:0 0 12px 12px; display:flex; gap:6px;">
          <input type="text" id="simplix-chat-input" placeholder="Ask a question..." style="flex-grow:1; border:1px solid var(--border); padding:8px 10px; border-radius:6px; outline:none; font-size:13px; background:var(--bg); color:var(--text);">
          <button id="simplix-chat-mic" style="background:transparent; color:var(--subText); border:1px solid var(--border); padding:0 10px; border-radius:6px; cursor:pointer; transition:0.2s;" title="Speak to Type">${ICONS.mic}</button>
          <button id="simplix-chat-send" style="background:var(--accent); color:var(--accentText); border:none; padding:0 12px; border-radius:6px; cursor:pointer;">${ICONS.send}</button>
      </div>
  `;

  document.body.appendChild(popup);
  makeDraggable(popup, popup.querySelector('#chat-header'));
  
  // Force Reflow
  void popup.offsetWidth; 
  popup.classList.add('visible');

  const historyDiv = popup.querySelector('#simplix-chat-history');
  const inputEl = popup.querySelector('#simplix-chat-input');
  const sendBtn = popup.querySelector('#simplix-chat-send');
  const relevantBtn = popup.querySelector('#chat-mode-relevant');
  const generalBtn = popup.querySelector('#chat-mode-general');
  const minimizeBtn = popup.querySelector('#chat-minimize');

  // --- SPEECH RECOGNITION LOGIC START ---
  const micBtn = popup.querySelector('#simplix-chat-mic');
  
  if ('webkitSpeechRecognition' in window) {
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = false; // Stops after one sentence
      recognition.interimResults = false; // Only show final result
      recognition.lang = 'en-US';

      micBtn.onclick = () => {
          if (micBtn.classList.contains('listening')) {
              recognition.stop();
          } else {
              recognition.start();
          }
      };

      recognition.onstart = () => {
          micBtn.classList.add('listening');
          micBtn.style.color = "#ef4444"; // Turn red when listening
          micBtn.style.borderColor = "#ef4444";
          inputEl.placeholder = "Listening...";
      };

      recognition.onend = () => {
          micBtn.classList.remove('listening');
          micBtn.style.color = "var(--subText)";
          micBtn.style.borderColor = "var(--border)";
          inputEl.placeholder = chatMode === 'relevant' ? "Ask strict questions about text..." : "Ask general questions...";
      };

      recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          // Appends text so user can speak multiple times or edit before sending
          inputEl.value = (inputEl.value ? inputEl.value + " " : "") + transcript;
          inputEl.focus();
      };

      recognition.onerror = (event) => {
          console.error("Speech error:", event.error);
          micBtn.classList.remove('listening');
      };
  } else {
      micBtn.style.display = 'none'; // Hide button if browser doesn't support it
  }
  // --- SPEECH RECOGNITION LOGIC END ---

  const toggleMin = () => { popup.classList.toggle('sx-minimized'); };
  minimizeBtn.onclick = (e) => { e.stopPropagation(); toggleMin(); };
  popup.onclick = (e) => { if(popup.classList.contains('sx-minimized')) toggleMin(); };

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

  const appendMessage = (role, text) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `sx-chat-msg ${role === 'user' ? 'sx-chat-user' : 'sx-chat-bot'}`;
    
    // Basic text content
    const textSpan = document.createElement('span');
    textSpan.innerText = text;
    msgDiv.appendChild(textSpan);

    // Add Copy Button only for BOT messages
    if (role !== 'user') {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'sx-chat-copy-btn';
        copyBtn.innerHTML = ICONS.copy;
        copyBtn.title = "Copy";
        
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(text).then(() => {
                copyBtn.innerHTML = ICONS.check;
                setTimeout(() => copyBtn.innerHTML = ICONS.copy, 1500);
            });
        };
        msgDiv.appendChild(copyBtn);
    }

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
          const noFormatRule = "IMPORTANT: Do NOT use asterisks (*) or markdown formatting. Keep the text clean and plain.";

          if (chatMode === 'relevant') {
              messages.push({
                  role: "system",
                  content: `You are SimplixBot. ${noFormatRule} STRICT RULE: Answer ONLY based on the provided context. If the answer is not in the text, say "Sorry, it is not present in the selected area, out of context."\n\n[CONTEXT]:\n${currentContextText}`
              });
          } else {
              messages.push({ role: "system", content: `You are SimplixBot, a helpful assistant. ${noFormatRule}` });
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

// --- DEFENSIVE JSON RENDERING ---
function renderInteractiveExam(data, t) {
  // 1. Valid Data Check
  if (!data) return `<div style="padding:20px; color:red;">Error: No exam data received.</div>`;

  // 2. Safe Array Access (prevents "undefined reading length" crash)
  const mcqs = Array.isArray(data.mcqs) ? data.mcqs : [];
  const short_answer = Array.isArray(data.short_answer) ? data.short_answer : [];
  const long_answer = Array.isArray(data.long_answer) ? data.long_answer : [];

  let h = `<div style="max-width:800px; margin:0 auto;">`;
  h += `
    <div style="background:var(--cardBg); padding:24px; border-radius:12px; margin-bottom:32px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
      <h3 style="margin:0; color:var(--text); font-size:20px; font-weight:700;">Interactive Exam</h3>
      <div style="font-weight:600; color:var(--accent); font-size:18px; padding:6px 12px; background:var(--bg); border-radius:8px; border:1px solid var(--border);">Score: <span id="exam-score">0</span> / ${mcqs.length}</div>
    </div>
  `;
  
  if(mcqs.length > 0) {
    h += `<div style="font-size:12px; font-weight:700; color:var(--subText); text-transform:uppercase; margin-bottom:16px; letter-spacing:1px;">Part A: Multiple Choice</div>`;
    mcqs.forEach((q, idx) => {
      h += `
        <div class="exam-mcq" data-correct="${q.correctIndex}" style="margin-bottom:24px; background:var(--cardBg); border:1px solid var(--border); padding:24px; border-radius:12px; transition:0.2s;">
          <div style="font-weight:600; margin-bottom:16px; color:var(--text); font-size:17px;">${idx+1}. ${q.question}</div>
          <div style="display:grid; gap:10px;">
            ${q.options.map((opt, i) => `
              <button class="exam-opt-btn" data-idx="${i}" style="text-align:left; padding:14px 16px; border:1px solid var(--border); background:var(--bg); color:var(--text); border-radius:8px; cursor:pointer; transition:all 0.2s; font-size:15px; font-weight:500;">
                <span style="opacity:0.5; margin-right:8px; font-weight:normal;">${String.fromCharCode(65+i)}</span> ${opt}
              </button>
            `).join('')}
          </div>
          <div class="exam-feedback" style="margin-top:16px; font-size:14px; font-weight:600; display:none;"></div>
        </div>`;
    });
  }
  
  if(short_answer.length > 0) {
    h += `<div style="font-size:12px; font-weight:700; color:var(--subText); text-transform:uppercase; margin-bottom:16px; letter-spacing:1px; margin-top:40px;">Part B: Short Answer</div>`;
    short_answer.forEach((q, idx) => {
      h += `
        <div style="margin-bottom:24px; padding:24px; background:var(--cardBg); border:1px solid var(--border); border-radius:12px;">
          <div style="font-weight:600; font-size:16px; margin-bottom:12px; color:var(--text);">Q${idx+1}. ${q.question}</div>
          <details style="margin-top:12px;">
            <summary style="cursor:pointer; color:var(--accent); font-weight:500; font-size:14px; outline:none;">Show Answer Key</summary>
            <div style="margin-top:12px; padding:16px; background:var(--bg); border-radius:8px; border:1px solid var(--border);">
              <ul style="margin:0; padding-left:20px; color:var(--subText); line-height:1.6;">${q.answer_points.map(p => `<li>${p}</li>`).join('')}</ul>
            </div>
          </details>
        </div>`;
    });
  }

  if(long_answer.length > 0) {
    h += `<div style="font-size:12px; font-weight:700; color:var(--subText); text-transform:uppercase; margin-bottom:16px; letter-spacing:1px; margin-top:40px;">Part C: Long Answer</div>`;
    long_answer.forEach((q, idx) => {
        h += `
        <div style="margin-bottom:24px; padding:24px; background:var(--cardBg); border:1px solid var(--border); border-radius:12px;">
          <div style="font-weight:600; font-size:16px; margin-bottom:12px; color:var(--text);">Q${idx+1}. ${q.question}</div>
          <details style="margin-top:12px;">
            <summary style="cursor:pointer; color:var(--accent); font-weight:500; font-size:14px; outline:none;">Show Answer Key</summary>
             <div style="margin-top:12px; padding:16px; background:var(--bg); border-radius:8px; border:1px solid var(--border);">
              <ul style="margin:0; padding-left:20px; color:var(--subText); line-height:1.6;">${q.answer_points.map(p => `<li>${p}</li>`).join('')}</ul>
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
      btn.onmouseenter = () => { if(!answered) btn.style.borderColor = getComputedStyle(overlay).getPropertyValue('--accent'); };
      btn.onmouseleave = () => { if(!answered) btn.style.borderColor = getComputedStyle(overlay).getPropertyValue('--border'); };
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}