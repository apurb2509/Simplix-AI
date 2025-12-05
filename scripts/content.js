/* content.js — SIDEBAR + EXAM + SCROLLING CROP + ERROR FIXES */

// --- 0. GUARD CLAUSE: Prevent Double Injection ---
// If the script is already loaded, just toggle the sidebar and stop execution.
if (window.simplixHasRun) {
  toggleSidebar();
  // We throw a deliberate error or return to stop the rest of the script from executing again
  throw new Error("Simplix already running: Toggled sidebar."); 
}
window.simplixHasRun = true;


// --- State Variables ---
let sidebarEl = null;
let cropOverlayEl = null;
let selectionRect = null; // {left, top, width, height} (Document Coordinates)
let currentMode = "kid-friendly"; 
let isProcessing = false;

// --- 1. Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleSidebar") {
    toggleSidebar();
    sendResponse({ ok: true });
  }
});

// --- 2. Sidebar UI ---
function toggleSidebar() {
  // If sidebar exists, remove it (Toggle Off)
  if (sidebarEl) {
    sidebarEl.remove();
    sidebarEl = null;
    // Also remove crop tool if it's open
    if (cropOverlayEl) { 
        cropOverlayEl.remove(); 
        cropOverlayEl = null; 
    }
    return;
  }

  // Create Sidebar (Toggle On)
  sidebarEl = document.createElement('div');
  sidebarEl.id = 'simplix-sidebar';
  sidebarEl.style = `
    position: fixed; top: 0; right: 0; bottom: 0; width: 300px;
    background: #ffffff; box-shadow: -4px 0 15px rgba(0,0,0,0.1);
    z-index: 2147483647; padding: 20px; box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex; flex-direction: column; gap: 15px; transition: transform 0.3s ease;
  `;

  sidebarEl.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h2 style="margin:0; font-size:20px; color:#333; font-weight:700;">Simplix AI</h2>
      <button id="sb-close" style="background:none; border:none; font-size:24px; cursor:pointer; color:#888;">&times;</button>
    </div>

    <div style="background:#f9f9f9; padding:12px; border-radius:8px; border:1px solid #eee;">
      <div style="font-size:12px; font-weight:600; color:#666; margin-bottom:8px;">STEP 1: SELECT CONTENT</div>
      <button id="sb-crop-btn" style="width:100%; padding:8px; background:#fff; border:1px dashed #4F46E5; color:#4F46E5; border-radius:6px; cursor:pointer; font-weight:600; transition:all 0.2s;">
        ✂ Set Crop Area
      </button>
      <div id="sb-crop-status" style="font-size:11px; color:#4F46E5; margin-top:5px; display:none;">Area Selected ✅</div>
      <div style="font-size:10px; color:#999; margin-top:4px;">(Scroll page to select more)</div>
    </div>

    <div style="background:#f9f9f9; padding:12px; border-radius:8px; border:1px solid #eee;">
      <div style="font-size:12px; font-weight:600; color:#666; margin-bottom:8px;">STEP 2: CHOOSE MODE</div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
        ${createModeBtn('kid-friendly', 'Kid Friendly', '#3B82F6')}
        ${createModeBtn('story', 'Story Mode', '#F59E0B')}
        ${createModeBtn('exam', 'Interactive Exam', '#EF4444')}
        ${createModeBtn('step-by-step', 'Step-by-Step', '#10B981')}
        ${createModeBtn('summary', 'Summary', '#8B5CF6')}
        ${createModeBtn('formal', 'Formal', '#6B7280')}
      </div>
    </div>

    <div style="margin-top:auto;">
      <button id="sb-generate-btn" style="width:100%; padding:14px; background:#A5B4FC; color:white; border:none; border-radius:8px; font-size:16px; font-weight:600; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1); transition:all 0.3s;">
        Generate Result
      </button>
    </div>
  `;

  document.body.appendChild(sidebarEl);

  // Listeners
  sidebarEl.querySelector('#sb-close').onclick = toggleSidebar;
  sidebarEl.querySelector('#sb-crop-btn').onclick = toggleCropTool;
  const genBtn = sidebarEl.querySelector('#sb-generate-btn');
  genBtn.onclick = handleGenerateClick;

  // Hover Effects
  genBtn.onmouseenter = () => { if(!isProcessing) genBtn.style.background = "#4F46E5"; };
  genBtn.onmouseleave = () => { if(!isProcessing) genBtn.style.background = "#A5B4FC"; };

  // Mode Switching Logic
  const modeBtns = sidebarEl.querySelectorAll('.sb-mode-btn');
  modeBtns.forEach(btn => {
    btn.onclick = () => {
      modeBtns.forEach(b => {
        b.style.background = 'white'; b.style.color = '#444'; b.style.borderColor = '#ddd';
      });
      const color = btn.dataset.color;
      btn.style.background = color; btn.style.color = 'white'; btn.style.borderColor = color;
      currentMode = btn.dataset.mode;
      
      // Reset generate button text if it was showing error/done
      if(!isProcessing) {
        genBtn.style.background = "#A5B4FC"; 
        genBtn.innerText = "Generate Result";
      }
    };
  });

  // Activate default mode button visually
  const defaultBtn = sidebarEl.querySelector(`button[data-mode="${currentMode}"]`);
  if(defaultBtn) defaultBtn.click();
}

function createModeBtn(mode, label, color) {
  return `<button class="sb-mode-btn" data-mode="${mode}" data-color="${color}" style="
    padding:8px; border:1px solid #ddd; background:white; border-radius:6px; 
    cursor:pointer; font-size:12px; font-weight:500; color:#444; transition:all 0.2s;
  ">${label}</button>`;
}

// --- 3. Scrollable Crop Tool (Document-Relative) ---
function toggleCropTool() {
  if (cropOverlayEl) {
    cropOverlayEl.remove(); cropOverlayEl = null; return;
  }

  // Calculate full document height
  const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);

  cropOverlayEl = document.createElement('div');
  cropOverlayEl.style = `
    position: absolute; top:0; left:0; width:100%; height:${docHeight}px;
    z-index: 2147483646; cursor: crosshair;
    background: rgba(0,0,0,0.3);
  `;

  // Enable scrolling
  cropOverlayEl.addEventListener('wheel', (e) => {
    window.scrollBy({ top: e.deltaY, behavior: 'auto' });
  }, { passive: true });

  // --- FIX 1: Unique names for initial positioning ---
  const initialTop = window.scrollY + (window.innerHeight * 0.2);
  const initialLeft = (window.innerWidth - 400) / 2;

  const box = document.createElement('div');
  box.id = 'simplix-crop-box';
  box.style = `
    position: absolute; 
    left: ${initialLeft}px; top: ${initialTop}px; 
    width: 400px; height: 300px;
    border: 2px dashed #4F46E5; 
    box-shadow: 0 0 0 99999px rgba(0,0,0,0.4); 
    background: rgba(255,255,255,0.05); 
    cursor: move;
  `;
  
  // Resize Handles
  ['nw', 'ne', 'sw', 'se'].forEach(dir => {
    const h = document.createElement('div');
    h.className = 'crop-handle'; h.dataset.dir = dir;
    h.style = `position:absolute; width:12px; height:12px; background:#4F46E5; border:1px solid white; z-index:10;`;
    if(dir.includes('n')) h.style.top = '-6px'; else h.style.bottom = '-6px';
    if(dir.includes('w')) h.style.left = '-6px'; else h.style.right = '-6px';
    h.style.cursor = (dir === 'nw' || dir === 'se') ? 'nwse-resize' : 'nesw-resize';
    box.appendChild(h);
  });

  // Helper UI
  const help = document.createElement('div');
  help.innerHTML = "<span style='background:#4F46E5; color:white; padding:4px 8px; border-radius:4px;'>Drag box to move • Drag corners to resize</span>";
  help.style = "position:absolute; top:-35px; left:0; font-size:12px; white-space:nowrap;";
  box.appendChild(help);

  cropOverlayEl.appendChild(box);
  document.body.appendChild(cropOverlayEl);

  // --- DRAG & RESIZE LOGIC (FIXED VARIABLE NAMES) ---
  let isResizing = false, isMoving = false;
  
  // FIX 2: Distinct names for drag state to avoid conflicts
  let mouseStartX, mouseStartY;
  let dragStartLeft, dragStartTop, dragStartW, dragStartH; 
  let currentHandle;

  const onMouseDown = (e) => {
    if (e.target.classList.contains('crop-handle')) {
      isResizing = true; currentHandle = e.target.dataset.dir;
    } else if (e.target === box || e.target.parentNode === box) {
      isMoving = true;
    } else return;
    
    e.preventDefault(); e.stopPropagation();
    
    mouseStartX = e.pageX; 
    mouseStartY = e.pageY;
    
    // Capture current state into our unique variables
    dragStartLeft = box.offsetLeft; 
    dragStartTop = box.offsetTop; 
    dragStartW = box.offsetWidth; 
    dragStartH = box.offsetHeight;
  };

  const onMouseMove = (e) => {
    if (!isMoving && !isResizing) return;

    const dx = e.pageX - mouseStartX; 
    const dy = e.pageY - mouseStartY;

    if (isMoving) {
      box.style.left = (dragStartLeft + dx) + 'px'; 
      box.style.top = (dragStartTop + dy) + 'px';
      box.style.boxShadow = `0 0 0 99999px rgba(0,0,0,0.5)`;
    } else if (isResizing) {
      let newW = dragStartW, newH = dragStartH, newL = dragStartLeft, newT = dragStartTop;
      
      if (currentHandle.includes('e')) newW = dragStartW + dx;
      if (currentHandle.includes('w')) { newW = dragStartW - dx; newL = dragStartLeft + dx; }
      if (currentHandle.includes('s')) newH = dragStartH + dy;
      if (currentHandle.includes('n')) { newH = dragStartH - dy; newT = dragStartTop + dy; } 
      
      if (newW > 20) { 
        box.style.width = newW + 'px'; 
        box.style.left = newL + 'px'; 
      }
      if (newH > 20) { 
        box.style.height = newH + 'px'; 
        box.style.top = newT + 'px'; 
      }
    }
  };

  const onMouseUp = () => {
    if(isMoving || isResizing) {
      selectionRect = { 
        left: box.offsetLeft, 
        top: box.offsetTop, 
        width: box.offsetWidth, 
        height: box.offsetHeight 
      };
      
      if(sidebarEl) {
        sidebarEl.querySelector('#sb-crop-status').style.display = 'block';
        sidebarEl.querySelector('#sb-crop-btn').innerText = "✅ Area Set (Click to adjust)";
      }
    }
    isMoving = false; isResizing = false;
  };

  cropOverlayEl.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  
  cropOverlayEl.addEventListener('dblclick', (e) => { 
      if(e.target === cropOverlayEl) toggleCropTool(); 
  });
}

// --- 4. Generation Logic ---
async function handleGenerateClick() {
  if (isProcessing) return;
  const btn = document.getElementById('sb-generate-btn');
  
  isProcessing = true;
  btn.innerText = "Analyzing...";
  btn.style.opacity = "0.8"; btn.style.cursor = "wait";

  try {
    const text = extractVisibleText(selectionRect);
    if (!text || text.length < 5) throw new Error("No text found. Please adjust crop.");

    // Request Model
    const resp = await requestModelForVisibleText(text, currentMode);
    
    // Render
    renderResult(resp, currentMode);

  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    isProcessing = false;
    btn.innerText = "Generate Result"; 
    btn.style.background = "#CFD8DC"; btn.style.color = "#555";
  }
}

// --- 5. Utilities ---
function extractVisibleText(docRect) {
  // If no crop, fallback to body text
  if (!docRect) {
    return document.body.innerText.slice(0, 5000); 
  }

  // Convert Document Coords -> Viewport Coords for current scroll position
  // rect.top is where it is on the document. window.scrollY is how far we scrolled.
  const rect = {
    left: docRect.left,
    top: docRect.top - window.scrollY, 
    width: docRect.width,
    height: docRect.height
  };

  const els = document.querySelectorAll('p, h1, h2, h3, h4, li, span, div');
  let gathered = [];
  
  // Math.max to prevent negative logic issues
  rect.left = Math.max(0, rect.left); 

  for (let el of els) {
    // Skip huge container divs to avoid duplicate text
    if(el.children.length > 2 && el.tagName === 'DIV') continue; 
    
    const r = el.getBoundingClientRect(); // Viewport coords
    if (r.width === 0 || r.height === 0) continue;
    
    // Intersection Check (AABB)
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
        ... (generate 5-10 questions)
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
    case 'kid-friendly':
      instructions = "Explain this text for a 5-year-old. Use emojis, very simple analogies (like toys or animals), and short sentences. Make it fun and enthusiastic!";
      break;
    case 'story':
      instructions = "Rewrite this text as an engaging short story. Create characters (e.g., Detective Data or Captain Logic) and a plot. Ensure the key concepts of the text are explained through the plot events.";
      break;
    case 'step-by-step':
      instructions = "Convert this text into a rigorous, Step-by-Step implementation guide. Use bold headers for steps (Step 1, Step 2). If applicable, include code snippets or prerequisites.";
      break;
    case 'summary':
      instructions = "Provide a high-level Executive Summary. Then provide a 'Key Takeaways' bulleted list. Finally, conclude with a 'Why this matters' section.";
      break;
    case 'formal':
      instructions = "Rewrite this text in highly professional, academic, and formal English. Use sophisticated vocabulary and passive voice where appropriate for a research paper tone.";
      break;
  }

  return `You are Simplix AI.
  ${instructions}
  
  [CONTENT START]
  ${text}
  [CONTENT END]`;
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
    overlay.style = `
      position: fixed; left: 50%; top: 5%; transform: translateX(-50%);
      width: 65%; height: 90vh; background: white; z-index: 2147483648;
      box-shadow: 0 10px 50px rgba(0,0,0,0.5); border-radius: 12px;
      display: flex; flex-direction: column; overflow: hidden; font-family: sans-serif;
    `;
    document.body.appendChild(overlay);
  }

  let contentRaw = "";
  if (typeof modelData === "string") contentRaw = modelData;
  else if (modelData?.data?.choices) contentRaw = modelData.data.choices[0].message.content;
  else contentRaw = JSON.stringify(modelData);

  // HEADER
  let html = `
    <div style="background:#4F46E5; color:white; padding:15px 20px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
      <span style="font-weight:bold; font-size:18px;">Simplix: ${mode.toUpperCase()}</span>
      <button id="res-close" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">&times;</button>
    </div>
    <div style="padding:25px; overflow-y:auto; flex-grow:1; line-height:1.6; color:#333; font-size:15px;">
  `;

  // EXAM RENDERER
  if (mode === 'exam') {
    try {
      // CLEANUP: Remove markdown code blocks if AI added them
      const cleanJson = contentRaw.replace(/```json/g, '').replace(/```/g, '').trim();
      const examData = JSON.parse(cleanJson);
      html += renderInteractiveExam(examData);
    } catch (e) {
      console.error("JSON Parse Error", e);
      html += `<div style="color:red; font-weight:bold;">Error parsing exam data.</div>`;
      html += `<div style="background:#f0f0f0; padding:10px; border-radius:4px; font-family:monospace; margin-top:10px; white-space:pre-wrap;">${escapeHtml(contentRaw)}</div>`;
    }
  } else {
    html += escapeHtml(contentRaw).replace(/\n/g, '<br>');
  }

  html += `</div>`;
  overlay.innerHTML = html;
  overlay.querySelector('#res-close').onclick = () => overlay.remove();

  if (mode === 'exam') attachExamListeners(overlay);
}

function renderInteractiveExam(data) {
  let h = `<div style="max-width:800px; margin:0 auto;">`;

  // Scoreboard
  h += `
    <div style="background:#EEF2FF; padding:15px; border-radius:8px; margin-bottom:20px; border:1px solid #C7D2FE; display:flex; justify-content:space-between; align-items:center;">
      <h3 style="margin:0; color:#4F46E5;">🎓 Interactive Exam</h3>
      <div style="font-weight:bold; color:#4F46E5;">Score: <span id="exam-score">0</span> / ${data.mcqs.length}</div>
    </div>
  `;

  // 1. MCQs
  if(data.mcqs && data.mcqs.length > 0) {
      h += `<h3 style="border-bottom:2px solid #eee; padding-bottom:5px;">Part A: Multiple Choice</h3>`;
      data.mcqs.forEach((q, idx) => {
        h += `
          <div class="exam-mcq" data-correct="${q.correctIndex}" style="margin-bottom:20px; background:#fff; border:1px solid #eee; padding:15px; border-radius:8px;">
            <div style="font-weight:600; margin-bottom:10px;">Q${idx+1}. ${q.question}</div>
            <div style="display:grid; gap:8px;">
              ${q.options.map((opt, i) => `
                <button class="exam-opt-btn" data-idx="${i}" style="text-align:left; padding:8px 12px; border:1px solid #ddd; background:white; border-radius:4px; cursor:pointer; transition:all 0.2s;">
                  ${String.fromCharCode(65+i)}. ${opt}
                </button>
              `).join('')}
            </div>
            <div class="exam-feedback" style="margin-top:8px; font-size:13px; font-weight:bold; display:none;"></div>
          </div>
        `;
      });
  }

  // 2. Short Answer
  if(data.short_answer && data.short_answer.length > 0) {
      h += `<h3 style="border-bottom:2px solid #eee; padding-bottom:5px; margin-top:30px;">Part B: Short Answer</h3>`;
      data.short_answer.forEach((q, idx) => {
        h += `
          <div style="margin-bottom:20px;">
            <div style="font-weight:600;">Q${idx+1}. ${q.question}</div>
            <details style="margin-top:5px; background:#f9f9f9; padding:10px; border-radius:4px;">
              <summary style="cursor:pointer; color:#4F46E5; font-weight:500;">Show Answer Key (Points)</summary>
              <ul style="margin:5px 0 0 20px; color:#555;">
                ${q.answer_points.map(p => `<li>${p}</li>`).join('')}
              </ul>
            </details>
          </div>
        `;
      });
  }

  // 3. Long Answer
  if(data.long_answer && data.long_answer.length > 0) {
      h += `<h3 style="border-bottom:2px solid #eee; padding-bottom:5px; margin-top:30px;">Part C: Long Answer</h3>`;
      data.long_answer.forEach((q, idx) => {
        h += `
          <div style="margin-bottom:20px;">
            <div style="font-weight:600;">Q${idx+1}. ${q.question}</div>
            <details style="margin-top:5px; background:#f9f9f9; padding:10px; border-radius:4px;">
              <summary style="cursor:pointer; color:#4F46E5; font-weight:500;">Show Answer Key (Points)</summary>
              <ul style="margin:5px 0 0 20px; color:#555;">
                ${q.answer_points.map(p => `<li>${p}</li>`).join('')}
              </ul>
            </details>
          </div>
        `;
      });
  }

  h += `</div>`;
  return h;
}

function attachExamListeners(overlay) {
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
          // Correct
          btn.style.background = "#D1FAE5"; 
          btn.style.borderColor = "#10B981";
          btn.style.color = "#065F46";
          feedback.innerText = "Correct! +1";
          feedback.style.color = "#10B981";
          score++;
          if(scoreEl) scoreEl.innerText = score;
        } else {
          // Wrong
          btn.style.background = "#FEE2E2"; 
          btn.style.borderColor = "#EF4444";
          btn.style.color = "#991B1B";
          feedback.innerText = "Incorrect.";
          feedback.style.color = "#EF4444";
          
          // Highlight correct answer
          if(buttons[correctIdx]) {
              buttons[correctIdx].style.background = "#D1FAE5";
              buttons[correctIdx].style.borderColor = "#10B981";
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