export default defineBackground({
  main() {
    // Open side panel when user clicks the extension icon
    browser.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch(console.error);

    // Relay messages from side panel to content scripts
    // (Side panel cannot directly message content scripts)
    browser.runtime.onMessage.addListener((message, sender) => {
      if (message.type === 'INJECT_FEEDBACK') {
        // Forward to the active tab's content script
        browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
          if (tab?.id) {
            browser.tabs.sendMessage(tab.id, message);
          }
        });
      }
    });
  },
});
