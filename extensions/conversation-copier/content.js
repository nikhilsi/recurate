// Recurate Copier — Extension plumbing (button injection, actions, UI)
// Depends on extractor.js (loaded first via manifest) which exposes window.RecurateExtractor.

(function () {
  const E = window.RecurateExtractor;

  // --- Claude Artifact Export (claude.ai only) ---

  async function getOrgId() {
    try {
      const resp = await fetch('/api/organizations');
      const data = await resp.json();
      return Array.isArray(data) && data.length > 0 ? data[0].uuid : null;
    } catch (e) {
      console.error('Recurate Copier: failed to get org ID', e);
      return null;
    }
  }

  function getChatId() {
    const parts = window.location.pathname.split('/');
    return parts[2] || null;
  }

  async function listFiles(orgId, chatId) {
    try {
      const resp = await fetch(`/api/organizations/${orgId}/conversations/${chatId}/wiggle/list-files?prefix=`);
      const data = await resp.json();
      return data.success ? data.files : [];
    } catch (e) {
      console.error('Recurate Copier: failed to list files', e);
      return [];
    }
  }

  async function downloadFile(orgId, chatId, filePath) {
    try {
      const encodedPath = encodeURIComponent(filePath);
      const resp = await fetch(`/api/organizations/${orgId}/conversations/${chatId}/wiggle/download-file?path=${encodedPath}`);
      if (!resp.ok) return null;
      return await resp.blob();
    } catch (e) {
      console.error('Recurate Copier: failed to download file', filePath, e);
      return null;
    }
  }

  // --- Actions ---

  async function copyToClipboard() {
    const messages = await E.extractConversation();
    if (messages.length === 0) {
      showToast('No conversation found on this page');
      return;
    }
    const md = E.toMarkdown(messages);
    navigator.clipboard.writeText(md).then(() => {
      showToast(`Copied ${messages.length} messages as markdown`);
    }).catch(() => {
      showToast('Copy failed \u2014 check clipboard permissions');
    });
  }

  function getDateTimeStamp() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
    return { date, time, dateTime: `${date}-${time}` };
  }

  async function downloadHTML() {
    const messages = await E.extractConversation();
    if (messages.length === 0) {
      showToast('No conversation found on this page');
      return;
    }
    const title = E.getConversationTitle();
    const platformName = E.getPlatformDisplayName().toLowerCase().replace(/\s+/g, '-');
    const { dateTime } = getDateTimeStamp();
    const slug = title ? E.slugify(title) : 'conversation';
    downloadSimpleHTML(messages, title, platformName, dateTime, slug);
  }

  async function exportFullZIP() {
    const messages = await E.extractConversation();
    if (messages.length === 0) {
      showToast('No conversation found on this page');
      return;
    }
    const title = E.getConversationTitle();
    const platformName = E.getPlatformDisplayName().toLowerCase().replace(/\s+/g, '-');
    const { dateTime } = getDateTimeStamp();
    const slug = title ? E.slugify(title) : 'conversation';
    downloadWithArtifacts(messages, title, platformName, dateTime, slug);
  }

  function downloadSimpleHTML(messages, title, platformName, date, slug) {
    const html = E.toHTML(messages);
    const filename = `recurate-${platformName}-${slug}-${date}.html`;

    try {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.documentElement.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 100);
      showToast(`Downloaded ${messages.length} messages as HTML`);
    } catch (err) {
      showToast('Download failed \u2014 try Cmd+Shift+D');
      console.error('Recurate Copier download error:', err);
    }
  }

  async function downloadWithArtifacts(messages, title, platformName, date, slug) {
    const chatId = getChatId();
    if (!chatId) {
      downloadSimpleHTML(messages, title, platformName, date, slug);
      return;
    }

    const orgId = await getOrgId();
    if (!orgId) {
      downloadSimpleHTML(messages, title, platformName, date, slug);
      return;
    }

    const allFiles = await listFiles(orgId, chatId);
    const outputPaths = allFiles.filter(f => f.includes('/outputs/'));
    const uploadPaths = allFiles.filter(f => f.includes('/uploads/'));

    if (outputPaths.length === 0 && uploadPaths.length === 0) {
      downloadSimpleHTML(messages, title, platformName, date, slug);
      return;
    }

    const totalFiles = outputPaths.length + uploadPaths.length;
    showExportModal(totalFiles);

    const outputFiles = E.deduplicateFilenames(outputPaths);
    const uploadFiles = E.deduplicateFilenames(uploadPaths);

    const html = E.toHTML(messages, outputFiles, uploadFiles);

    const zip = new JSZip();
    const folderName = `recurate-${platformName}-${slug}-${date}`;

    zip.file(folderName + '/conversation.html', html);

    let downloaded = 0;
    let failed = 0;
    const downloadAndAdd = async (files, subfolder) => {
      for (const file of files) {
        if (exportCancelled) return;
        const blob = await downloadFile(orgId, chatId, file.path);
        if (blob) {
          zip.file(folderName + '/' + subfolder + '/' + file.filename, blob);
        } else {
          failed++;
        }
        downloaded++;
        updateExportModal(downloaded, totalFiles, `Downloading ${subfolder}...`);
      }
    };

    await downloadAndAdd(outputFiles, 'artifacts');
    await downloadAndAdd(uploadFiles, 'uploads');

    if (exportCancelled) return;

    updateExportModal(totalFiles, totalFiles, 'Building ZIP...');

    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = folderName + '.zip';
      a.style.display = 'none';
      document.documentElement.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 100);
      completeExportModal(messages.length, totalFiles - failed);
    } catch (err) {
      console.error('Recurate Copier ZIP error:', err);
      failExportModal('ZIP creation failed');
      setTimeout(() => {
        downloadSimpleHTML(messages, title, platformName, date, slug);
      }, 2000);
    }
  }

  // --- Export progress modal ---

  let exportCancelled = false;

  function showExportModal(totalFiles) {
    exportCancelled = false;
    removeExportModal();

    const overlay = document.createElement('div');
    overlay.id = 'rc-copier-modal-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      zIndex: '2147483647', background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
    });

    const modal = document.createElement('div');
    modal.id = 'rc-copier-modal';
    Object.assign(modal.style, {
      background: '#fff', borderRadius: '16px', padding: '28px 32px',
      minWidth: '340px', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      textAlign: 'center',
    });

    modal.innerHTML = `
      <div style="margin-bottom:16px;">
        <div id="rc-modal-spinner" style="width:36px;height:36px;border:3px solid #e0e7ff;border-top-color:#4f46e5;border-radius:50%;animation:rc-spin 0.8s linear infinite;margin:0 auto;"></div>
      </div>
      <div id="rc-modal-title" style="font-size:16px;font-weight:600;color:#1e1b4b;margin-bottom:6px;">Exporting conversation</div>
      <div id="rc-modal-status" style="font-size:13px;color:#6b7280;margin-bottom:16px;">Checking for artifacts...</div>
      <div style="background:#f3f4f6;border-radius:8px;height:6px;overflow:hidden;margin-bottom:12px;">
        <div id="rc-modal-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#4338CA,#6366F1);border-radius:8px;transition:width 0.3s ease;"></div>
      </div>
      <div id="rc-modal-detail" style="font-size:11px;color:#9ca3af;">0 of ${totalFiles} files</div>
      <button id="rc-modal-cancel" type="button" style="margin-top:8px;border:1px solid #d1d5db;background:#fff;color:#6b7280;padding:5px 16px;border-radius:8px;font-size:12px;cursor:pointer;">Cancel</button>
    `;

    const style = document.createElement('style');
    style.id = 'rc-copier-modal-style';
    style.textContent = '@keyframes rc-spin { to { transform: rotate(360deg); } }';
    if (!document.getElementById('rc-copier-modal-style')) {
      document.head.appendChild(style);
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('rc-modal-cancel').addEventListener('click', () => {
      exportCancelled = true;
      removeExportModal();
      showToast('Export cancelled');
    });
  }

  function updateExportModal(downloaded, total, statusText) {
    const status = document.getElementById('rc-modal-status');
    const detail = document.getElementById('rc-modal-detail');
    const bar = document.getElementById('rc-modal-progress-bar');
    if (status && statusText) status.textContent = statusText;
    if (detail) detail.textContent = `${downloaded} of ${total} files`;
    if (bar) bar.style.width = Math.round((downloaded / total) * 100) + '%';
  }

  function completeExportModal(messageCount, fileCount) {
    const spinner = document.getElementById('rc-modal-spinner');
    const title = document.getElementById('rc-modal-title');
    const status = document.getElementById('rc-modal-status');
    const detail = document.getElementById('rc-modal-detail');
    const bar = document.getElementById('rc-modal-progress-bar');

    if (spinner) spinner.style.cssText = 'width:36px;height:36px;margin:0 auto;font-size:28px;line-height:36px;';
    if (spinner) spinner.textContent = '\u2713';
    if (title) title.textContent = 'Export complete';
    if (status) status.textContent = `${messageCount} messages + ${fileCount} files`;
    if (detail) detail.textContent = 'ZIP downloaded to your computer';
    if (bar) bar.style.width = '100%';

    setTimeout(removeExportModal, 2500);
  }

  function failExportModal(errorText) {
    const spinner = document.getElementById('rc-modal-spinner');
    const title = document.getElementById('rc-modal-title');
    const status = document.getElementById('rc-modal-status');

    if (spinner) spinner.style.cssText = 'width:36px;height:36px;margin:0 auto;font-size:28px;line-height:36px;color:#ef4444;';
    if (spinner) spinner.textContent = '\u2717';
    if (title) { title.textContent = 'Export failed'; title.style.color = '#ef4444'; }
    if (status) status.textContent = errorText;

    setTimeout(removeExportModal, 3000);
  }

  function removeExportModal() {
    const overlay = document.getElementById('rc-copier-modal-overlay');
    if (overlay) overlay.remove();
  }

  // --- Toast notification ---

  function showToast(message) {
    const existing = document.getElementById('rc-copier-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'rc-copier-toast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
      zIndex: '2147483647', padding: '10px 20px', borderRadius: '8px',
      background: '#1e1b4b', color: '#e0e7ff', fontSize: '13px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)', transition: 'opacity 0.3s ease',
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; }, 2500);
    setTimeout(() => { toast.remove(); }, 3000);
  }

  // --- UI: inject into platform button rows ---

  const COPY_ALL_SVG = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6 2a2 2 0 0 0-2 2v1H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6zm8 10a1 1 0 0 1-1 1H5V7a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v5zM3 6h1v7a2 2 0 0 0 2 2h6v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/></svg>';
  const DOWNLOAD_SVG = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a.5.5 0 0 1 .5.5v9.793l2.646-2.647a.5.5 0 0 1 .708.708l-3.5 3.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 0 1 .708-.708L9.5 12.293V2.5A.5.5 0 0 1 10 2zM4 14.5a.5.5 0 0 1 1 0v1a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 1 1 0v1a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 15.5v-1z"/></svg>';
  const EXPORT_ZIP_SVG = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M2 4a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4zm7.5 2a.5.5 0 0 0-.5.5v5.793l-1.646-1.647a.5.5 0 0 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l2.5-2.5a.5.5 0 0 0-.708-.708L10 12.293V6.5a.5.5 0 0 0-.5-.5z"/></svg>';

  function findLastActionBar() {
    const platform = E.getPlatform();

    switch (platform) {
      case 'claude': {
        const bars = document.querySelectorAll('div[role="group"][aria-label="Message actions"]');
        return bars.length > 0 ? bars[bars.length - 1] : null;
      }
      case 'chatgpt': {
        const bars = document.querySelectorAll('[aria-label="Response actions"]');
        return bars.length > 0 ? bars[bars.length - 1] : null;
      }
      case 'grok': {
        const bars = document.querySelectorAll('div.action-buttons');
        if (bars.length > 0) {
          const last = bars[bars.length - 1];
          return last.querySelector('div.flex') || last;
        }
        return null;
      }
      case 'gemini': {
        const bars = document.querySelectorAll('message-actions');
        if (bars.length > 0) {
          const last = bars[bars.length - 1];
          return last.querySelector('.buttons-container-v2') ||
                 last.querySelector('.actions-container-v2') || last;
        }
        return null;
      }
      case 'google': {
        return null;
      }
      default:
        return null;
    }
  }

  function createActionButton(svgIcon, title, onClick) {
    const platform = E.getPlatform();

    if (platform === 'claude') {
      const wrapper = document.createElement('div');
      wrapper.className = 'w-fit';
      wrapper.setAttribute('data-state', 'closed');

      const btn = document.createElement('button');
      btn.className = 'inline-flex items-center justify-center relative isolate shrink-0 can-focus select-none border-transparent transition font-base duration-300 h-8 w-8 rounded-md group/btn _fill_56vq7_9 _ghost_56vq7_96';
      btn.type = 'button';
      btn.setAttribute('aria-label', title);
      btn.title = title;

      const iconDiv = document.createElement('div');
      iconDiv.className = 'text-text-500 group-hover/btn:text-text-100';
      iconDiv.style.cssText = 'width:20px;height:20px;display:flex;align-items:center;justify-content:center;';
      iconDiv.innerHTML = svgIcon;

      btn.appendChild(iconDiv);
      wrapper.appendChild(btn);

      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });

      return wrapper;
    }

    const btn = document.createElement('button');
    btn.innerHTML = svgIcon;
    btn.title = title;
    btn.style.cssText = 'border:none;background:transparent;cursor:pointer;padding:4px;border-radius:4px;display:flex;align-items:center;';
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
    return btn;
  }

  function injectButtons() {
    document.querySelectorAll('.rc-copier-injected').forEach(el => el.remove());

    const bar = findLastActionBar();

    if (bar) {
      const copyBtn = createActionButton(COPY_ALL_SVG, 'Copy full conversation (markdown)', copyToClipboard);
      copyBtn.classList.add('rc-copier-injected');

      const dlBtn = createActionButton(DOWNLOAD_SVG, 'Download full conversation (HTML)', downloadHTML);
      dlBtn.classList.add('rc-copier-injected');

      const sep = document.createElement('div');
      sep.className = 'rc-copier-injected';
      sep.style.cssText = 'width:1px;height:16px;background:currentColor;opacity:0.15;margin:0 2px;align-self:center;';

      bar.appendChild(sep);
      bar.appendChild(copyBtn);
      bar.appendChild(dlBtn);

      if (E.getPlatform() === 'claude') {
        const exportBtn = createActionButton(EXPORT_ZIP_SVG, 'Export conversation + artifacts (ZIP)', exportFullZIP);
        exportBtn.classList.add('rc-copier-injected');
        bar.appendChild(exportBtn);
      }
    } else {
      showFloatingButtons();
    }
  }

  function getInputContainer() {
    const platform = E.getPlatform();
    switch (platform) {
      case 'google': {
        const textarea = document.querySelector('textarea') ||
                         document.querySelector('[contenteditable="true"]');
        if (textarea) {
          return textarea.closest('form') ||
                 textarea.closest('[role="combobox"]')?.parentElement ||
                 textarea.parentElement?.parentElement?.parentElement;
        }
        return null;
      }
      default:
        return null;
    }
  }

  function positionAboveInput(cluster) {
    const container = getInputContainer();
    if (!container) {
      Object.assign(cluster.style, {
        position: 'fixed', bottom: '20px', right: '20px',
        top: 'auto', left: 'auto', transform: 'none',
      });
      return;
    }
    const rect = container.getBoundingClientRect();
    Object.assign(cluster.style, {
      position: 'fixed',
      top: `${rect.top - cluster.offsetHeight - 6}px`,
      left: `${rect.right - cluster.offsetWidth}px`,
      bottom: 'auto', right: 'auto', transform: 'none',
    });
  }

  function showFloatingButtons() {
    if (document.getElementById('rc-copier-floating')) return;

    const cluster = document.createElement('div');
    cluster.id = 'rc-copier-floating';
    cluster.className = 'rc-copier-injected';

    const copyBtn = document.createElement('button');
    copyBtn.innerHTML = COPY_ALL_SVG;
    copyBtn.title = 'Copy full conversation (markdown)';
    copyBtn.className = 'rc-copier-float-btn';
    copyBtn.addEventListener('mousedown', e => e.preventDefault());
    copyBtn.onclick = e => { e.stopPropagation(); copyToClipboard(); };

    const dlBtn = document.createElement('button');
    dlBtn.innerHTML = DOWNLOAD_SVG;
    dlBtn.title = 'Download full conversation (HTML)';
    dlBtn.className = 'rc-copier-float-btn';
    dlBtn.addEventListener('mousedown', e => e.preventDefault());
    dlBtn.onclick = e => { e.stopPropagation(); downloadHTML(); };

    cluster.appendChild(copyBtn);
    cluster.appendChild(dlBtn);

    Object.assign(cluster.style, {
      zIndex: '2147483647', display: 'flex', gap: '4px',
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      padding: '6px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
    });

    const style = document.createElement('style');
    style.id = 'rc-copier-float-style';
    if (!document.getElementById('rc-copier-float-style')) {
      style.textContent = `
        #rc-copier-floating .rc-copier-float-btn {
          width:36px;height:36px;border:none;border-radius:8px;
          cursor:pointer;font-size:16px;background:transparent;color:#555;
          display:flex;align-items:center;justify-content:center;
          transition:all .12s ease;
        }
        #rc-copier-floating .rc-copier-float-btn:hover { background:rgba(66,133,244,0.1);color:#1a73e8; }
        #rc-copier-floating .rc-copier-float-btn:active { transform:scale(0.92); }
        @media (prefers-color-scheme:dark) {
          #rc-copier-floating { background:rgba(40,40,38,0.92)!important;border-color:rgba(255,255,255,0.1)!important; }
          #rc-copier-floating .rc-copier-float-btn { color:#aaa; }
          #rc-copier-floating .rc-copier-float-btn:hover { color:#7ab4ff; }
        }
      `;
      document.head.appendChild(style);
    }
    document.body.appendChild(cluster);

    if (E.getPlatform() === 'google') {
      requestAnimationFrame(() => positionAboveInput(cluster));
      window.addEventListener('scroll', () => {
        requestAnimationFrame(() => positionAboveInput(cluster));
      }, true);
      setInterval(() => positionAboveInput(cluster), 1500);
    } else {
      Object.assign(cluster.style, {
        position: 'fixed', bottom: '20px', right: '20px',
      });
    }
  }

  function buildUI() {
    if (!E.getPlatform()) return;
    injectButtons();
  }

  // Keyboard shortcut: Cmd/Ctrl+Shift+C = copy, Cmd/Ctrl+Shift+D = download
  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
    if (e.key === 'C' || e.key === 'c') {
      if (e.shiftKey) { e.preventDefault(); copyToClipboard(); }
    }
    if (e.key === 'D' || e.key === 'd') {
      if (e.shiftKey) { e.preventDefault(); downloadHTML(); }
    }
  });

  // --- Init ---
  setTimeout(buildUI, 2000);
  setInterval(buildUI, 3000);
})();
