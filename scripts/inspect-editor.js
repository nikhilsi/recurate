/**
 * Recurate Editor Inspector — Enterprise Copilot
 *
 * Run this in DevTools console on m365.cloud.microsoft/chat
 * to diagnose why editor injection isn't working reliably.
 *
 * Usage: Open DevTools → Console → Paste this entire script → Press Enter
 */
(function() {
  const results = {};

  // 1. Find the editor element
  const selectors = [
    '#m365-chat-editor-target-element',
    '[role="textbox"][aria-label="Message Copilot"]',
    '[contenteditable="true"]',
  ];

  let editor = null;
  for (const sel of selectors) {
    editor = document.querySelector(sel);
    if (editor) {
      results.matchedSelector = sel;
      break;
    }
  }

  if (!editor) {
    console.log('NO EDITOR FOUND');
    return;
  }

  // 2. Basic element info
  results.tagName = editor.tagName;
  results.id = editor.id;
  results.className = editor.className;
  results.contentEditable = editor.contentEditable;
  results.role = editor.getAttribute('role');
  results.ariaLabel = editor.getAttribute('aria-label');

  // All attributes
  results.attributes = {};
  for (const attr of editor.attributes) {
    results.attributes[attr.name] = attr.value.slice(0, 100);
  }

  // 3. Parent chain (5 levels)
  results.parentChain = [];
  let el = editor.parentElement;
  for (let i = 0; i < 5 && el; i++) {
    results.parentChain.push({
      tag: el.tagName,
      id: el.id || null,
      class: el.className ? el.className.slice(0, 80) : null,
      contentEditable: el.contentEditable !== 'inherit' ? el.contentEditable : null,
      role: el.getAttribute('role'),
    });
    el = el.parentElement;
  }

  // 4. Framework detection
  results.framework = {};
  // React
  const reactKey = Object.keys(editor).find(k => k.startsWith('__react'));
  results.framework.react = reactKey || false;
  // Angular
  const ngKey = Object.keys(editor).find(k => k.startsWith('__ng') || k.startsWith('_ngcontent'));
  results.framework.angular = ngKey || false;
  // Vue
  results.framework.vue = !!editor.__vue__ || !!editor.__vue_app__;

  // Check parents for framework markers too
  let p = editor.parentElement;
  for (let i = 0; i < 3 && p; i++) {
    const rk = Object.keys(p).find(k => k.startsWith('__react'));
    if (rk) { results.framework.reactOnParent = { level: i + 1, key: rk }; break; }
    p = p.parentElement;
  }

  // 5. Current editor state
  results.currentState = {
    textContent: (editor.textContent || '').slice(0, 200),
    innerHTML: editor.innerHTML.slice(0, 500),
    childNodes: editor.childNodes.length,
    children: editor.children.length,
    childTags: Array.from(editor.children).map(c => c.tagName),
  };

  // 6. Event listeners (what we can detect via getEventListeners if available)
  if (typeof getEventListeners === 'function') {
    const listeners = getEventListeners(editor);
    results.eventListeners = {};
    for (const [type, handlers] of Object.entries(listeners)) {
      results.eventListeners[type] = handlers.length;
    }
  } else {
    results.eventListeners = 'getEventListeners not available (only works in Chrome DevTools)';
  }

  // 7. Test injection methods (non-destructive — we restore original content)
  const originalHTML = editor.innerHTML;
  const originalText = editor.textContent;
  results.injectionTests = {};

  // Test A: innerHTML + input event
  try {
    editor.innerHTML = '<p>Test A</p>';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    results.injectionTests.innerHTML_p_input = {
      textContent: editor.textContent,
      innerHTML: editor.innerHTML.slice(0, 200),
    };
  } catch(e) { results.injectionTests.innerHTML_p_input = 'ERROR: ' + e.message; }
  editor.innerHTML = originalHTML;

  // Test B: innerHTML with <div> + input event
  try {
    editor.innerHTML = '<div>Test B</div>';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    results.injectionTests.innerHTML_div_input = {
      textContent: editor.textContent,
      innerHTML: editor.innerHTML.slice(0, 200),
    };
  } catch(e) { results.injectionTests.innerHTML_div_input = 'ERROR: ' + e.message; }
  editor.innerHTML = originalHTML;

  // Test C: textContent + input event
  try {
    editor.textContent = 'Test C';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    results.injectionTests.textContent_input = {
      textContent: editor.textContent,
      innerHTML: editor.innerHTML.slice(0, 200),
    };
  } catch(e) { results.injectionTests.textContent_input = 'ERROR: ' + e.message; }
  editor.innerHTML = originalHTML;

  // Test D: focus + execCommand insertText
  try {
    editor.focus();
    document.execCommand('selectAll');
    document.execCommand('delete');
    const ok = document.execCommand('insertText', false, 'Test D');
    results.injectionTests.execCommand_insertText = {
      returned: ok,
      textContent: editor.textContent,
      innerHTML: editor.innerHTML.slice(0, 200),
    };
  } catch(e) { results.injectionTests.execCommand_insertText = 'ERROR: ' + e.message; }
  editor.innerHTML = originalHTML;

  // Test E: InputEvent (not Event) with data
  try {
    editor.innerHTML = '';
    editor.appendChild(document.createTextNode('Test E'));
    editor.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: 'Test E',
    }));
    results.injectionTests.inputEvent_with_data = {
      textContent: editor.textContent,
      innerHTML: editor.innerHTML.slice(0, 200),
    };
  } catch(e) { results.injectionTests.inputEvent_with_data = 'ERROR: ' + e.message; }

  // Restore original
  editor.innerHTML = originalHTML;
  editor.dispatchEvent(new Event('input', { bubbles: true }));

  // Output
  const json = JSON.stringify(results, null, 2);
  console.log('=== EDITOR INSPECTION RESULTS ===');
  console.log(json);
  console.log('=== END ===');

  return results;
})();
