// Recurate Copier — Background Service Worker
// Handles auto-backup timer and silent downloads

const ALARM_NAME = 'rc-copier-auto-backup';
const BACKUP_INTERVAL_MINUTES = 120; // 2 hours

// Set up alarm on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: BACKUP_INTERVAL_MINUTES,
    periodInMinutes: BACKUP_INTERVAL_MINUTES,
  });
});

// Also ensure alarm exists on startup (in case it was lost)
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: BACKUP_INTERVAL_MINUTES,
        periodInMinutes: BACKUP_INTERVAL_MINUTES,
      });
    }
  });
});

// Handle alarm trigger
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  // Find all Claude.ai tabs and trigger backup on each
  chrome.tabs.query({ url: '*://claude.ai/*' }, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { type: 'RC_AUTO_BACKUP' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not loaded or tab not ready — skip
          return;
        }
        if (response && response.success) {
          // Download the HTML silently
          const blob = new Blob([response.html], { type: 'text/html' });
          const reader = new FileReader();
          reader.onload = () => {
            chrome.downloads.download({
              url: reader.result,
              filename: response.filename,
              saveAs: false,
            }, () => {
              if (chrome.runtime.lastError) {
                console.error('Recurate Copier: auto-backup download failed', chrome.runtime.lastError);
              }
            });
          };
          reader.readAsDataURL(blob);
        }
      });
    }
  });
});
