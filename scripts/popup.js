// popup.js — Acts as a trigger for the In-Page Sidebar
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      // Send signal to toggle the sidebar on the webpage
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
    }
  } catch (err) {
    console.error("Could not trigger sidebar:", err);
  }
  // Close popup immediately so it doesn't block the view
  window.close();
});