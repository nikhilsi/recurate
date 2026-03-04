/**
 * Lexical Editor Injection Diagnostic
 *
 * Tests two approaches for injecting text into a Lexical editor:
 * 1. Direct Lexical API via __lexicalEditor
 * 2. Synthetic ClipboardEvent paste
 *
 * Run in DevTools console on m365.cloud.microsoft/chat
 * Make sure the text box is EMPTY before running.
 */
(function() {
  const editor = document.querySelector('#m365-chat-editor-target-element');
  if (!editor) { console.log('NO EDITOR'); return; }

  const results = {};

  // --- Check 1: Does __lexicalEditor exist? ---
  const lexical = editor.__lexicalEditor;
  results.hasLexicalEditor = !!lexical;

  if (lexical) {
    results.lexicalType = typeof lexical;
    results.lexicalKeys = Object.keys(lexical).slice(0, 30);
    results.hasUpdate = typeof lexical.update === 'function';
    results.hasGetEditorState = typeof lexical.getEditorState === 'function';
    results.hasSetEditorState = typeof lexical.setEditorState === 'function';
    results.hasDispatchCommand = typeof lexical.dispatchCommand === 'function';
    results.hasRegisterCommand = typeof lexical.registerCommand === 'function';

    // Check registered nodes
    if (lexical._nodes) {
      results.registeredNodes = [...lexical._nodes.keys()];
    }

    // Try getting current state
    if (typeof lexical.getEditorState === 'function') {
      try {
        const state = lexical.getEditorState();
        results.editorStateType = typeof state;
        results.editorStateKeys = Object.keys(state).slice(0, 20);
      } catch(e) { results.editorStateError = e.message; }
    }
  }

  // --- Check 2: Try ClipboardEvent paste ---
  // First, focus and select all
  editor.focus();
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  sel.removeAllRanges();
  sel.addRange(range);

  try {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'PASTE_TEST_LINE1\nPASTE_TEST_LINE2');
    const pasteEvt = new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    });
    editor.dispatchEvent(pasteEvt);

    // Check after a tick
    setTimeout(() => {
      results.pasteTest = {
        textContent: editor.textContent.slice(0, 200),
        innerHTML: editor.innerHTML.slice(0, 500),
        worked: editor.textContent.includes('PASTE_TEST'),
      };

      // --- Check 3: Try Lexical dispatchCommand with PASTE ---
      // Lexical uses commands internally. The PASTE_COMMAND might work.
      if (lexical && typeof lexical.dispatchCommand === 'function') {
        results.lexicalCommands = 'dispatchCommand available — see keys above for command registration';
      }

      const json = JSON.stringify(results, null, 2);
      console.log('=== LEXICAL DIAGNOSTIC RESULTS ===');
      console.log(json);
      console.log('=== END ===');
      console.log('CHECK THE TEXT BOX — does it show PASTE_TEST_LINE1 and PASTE_TEST_LINE2?');
    }, 100);
  } catch(e) {
    results.pasteError = e.message;
    console.log(JSON.stringify(results, null, 2));
  }
})();
