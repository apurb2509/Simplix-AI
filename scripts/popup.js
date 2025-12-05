document.addEventListener('DOMContentLoaded', () => {
    // UI Elements (safe-get)
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const modeCards = document.querySelectorAll('.mode-card');
    const statusArea = document.getElementById('status-area');
    const statusText = document.getElementById('status-text');
    const loader = document.querySelector('.loader');
  
    // Optional: allow toggling settings manually, but do NOT force it on load
    if (settingsBtn && settingsPanel) {
      settingsBtn.addEventListener('click', () => settingsPanel.classList.toggle('hidden'));
    }
  
    // Main mode selection (no storage, no API key prompt)
    modeCards.forEach(card => {
      card.addEventListener('click', async () => {
        const mode = card.dataset.mode || 'simplified';
  
        if (statusArea) statusArea.classList.remove('hidden');
        if (statusText) statusText.innerText = `Initializing ${mode} mode...`;
        if (loader) loader.style.display = 'block';
  
        try {
          // Get active tab
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
          if (!tab) {
            if (statusText) statusText.innerText = 'Error: No active tab found.';
            if (loader) loader.style.display = 'none';
            return;
          }
  
          // Tell content script to process the page.
          // Note: content script reads SIMPLIX_CONFIG itself (packaged in config.js)
          await chrome.tabs.sendMessage(tab.id, {
            action: 'processPage',
            mode: mode
          });
  
          // Close popup after successful send
          window.close();
  
        } catch (err) {
          console.error('Simplix Error:', err);
          if (statusText) statusText.innerText = 'Error: Refresh this webpage and try again.';
          if (loader) loader.style.display = 'none';
        }
      });
    });
  });