/**
 * Recurate Platform Inspector
 *
 * Run this in DevTools console on any AI chat site to extract
 * the DOM selectors needed for a new platform module.
 *
 * Usage: Open DevTools → Console → Paste this entire script → Press Enter
 *
 * IMPORTANT: Run this AFTER you have at least one AI response visible on the page.
 * For best results, also run it while the AI is actively generating a response
 * (to capture streaming indicators).
 */

(function inspectPlatform() {
  const results = {
    url: location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  };

  // --- 1. Theme detection ---
  results.theme = {
    htmlClasses: document.documentElement.className,
    htmlDataTheme: document.documentElement.getAttribute('data-theme'),
    htmlColorScheme: document.documentElement.getAttribute('data-color-scheme'),
    bodyClasses: document.body?.className || '',
    bodyDataTheme: document.body?.getAttribute('data-theme'),
    prefersColorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  };

  // --- 2. Input field detection ---
  const inputCandidates = [
    ...document.querySelectorAll('textarea'),
    ...document.querySelectorAll('[contenteditable="true"]'),
    ...document.querySelectorAll('[role="textbox"]'),
  ];

  results.inputFields = inputCandidates.map(el => ({
    tag: el.tagName.toLowerCase(),
    id: el.id || null,
    classes: el.className || null,
    contentEditable: el.contentEditable,
    role: el.getAttribute('role'),
    ariaLabel: el.getAttribute('aria-label'),
    placeholder: el.getAttribute('placeholder') || el.getAttribute('data-placeholder'),
    parentTag: el.parentElement?.tagName.toLowerCase(),
    parentClasses: el.parentElement?.className?.slice(0, 200) || null,
    // Get a CSS selector path
    selectorPath: getCSSPath(el),
  }));

  // --- 3. Response containers ---
  // Look for common patterns: article, [role="article"], markdown/prose classes,
  // data-testid patterns, message containers
  const responseSelectors = [
    'article',
    '[role="article"]',
    '[data-testid*="message"]',
    '[data-testid*="response"]',
    '[data-testid*="turn"]',
    '[data-testid*="conversation"]',
    '[data-is-streaming]',
    '.markdown',
    '.prose',
    '[class*="markdown"]',
    '[class*="prose"]',
    '[class*="message"]',
    '[class*="response"]',
    '[class*="answer"]',
    '[class*="assistant"]',
    '[class*="bot"]',
    '[class*="chat-turn"]',
    '[class*="content"]',
  ];

  results.responseElements = {};
  for (const selector of responseSelectors) {
    try {
      const els = document.querySelectorAll(selector);
      if (els.length > 0) {
        results.responseElements[selector] = {
          count: els.length,
          samples: Array.from(els).slice(-3).map(el => ({
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            classes: (el.className || '').toString().slice(0, 300),
            dataAttrs: getDataAttributes(el),
            textLength: (el.textContent || '').length,
            childTags: getChildTagSummary(el),
            selectorPath: getCSSPath(el),
            // First 200 chars of outerHTML to see structure
            htmlSnippet: el.outerHTML.slice(0, 300),
          })),
        };
      }
    } catch (e) {
      // Skip invalid selectors
    }
  }

  // --- 4. Streaming indicators ---
  // Look for stop/cancel buttons
  const buttonSelectors = [
    'button[aria-label*="Stop"]',
    'button[aria-label*="stop"]',
    'button[aria-label*="Cancel"]',
    'button[aria-label*="cancel"]',
    'button[title*="Stop"]',
    'button[title*="stop"]',
    'button[data-testid*="stop"]',
    'button[data-testid*="cancel"]',
  ];

  results.stopButtons = {};
  for (const selector of buttonSelectors) {
    try {
      const els = document.querySelectorAll(selector);
      if (els.length > 0) {
        results.stopButtons[selector] = Array.from(els).map(el => ({
          tag: el.tagName.toLowerCase(),
          ariaLabel: el.getAttribute('aria-label'),
          title: el.getAttribute('title'),
          testId: el.getAttribute('data-testid'),
          classes: (el.className || '').toString().slice(0, 200),
          selectorPath: getCSSPath(el),
        }));
      }
    } catch (e) {}
  }

  // Also check for any data-is-streaming or similar attributes
  const streamingAttrs = ['data-is-streaming', 'data-streaming', 'data-state', 'data-status'];
  results.streamingAttributes = {};
  for (const attr of streamingAttrs) {
    const els = document.querySelectorAll(`[${attr}]`);
    if (els.length > 0) {
      results.streamingAttributes[attr] = Array.from(els).map(el => ({
        tag: el.tagName.toLowerCase(),
        value: el.getAttribute(attr),
        classes: (el.className || '').toString().slice(0, 200),
        selectorPath: getCSSPath(el),
      }));
    }
  }

  // --- 5. All buttons visible on page (to find stop/send) ---
  const allButtons = document.querySelectorAll('button');
  results.allButtons = Array.from(allButtons)
    .filter(b => {
      const label = (b.ariaLabel || b.title || b.textContent || '').toLowerCase();
      return label.includes('send') || label.includes('stop') || label.includes('cancel')
        || label.includes('submit') || label.includes('generate');
    })
    .map(el => ({
      ariaLabel: el.getAttribute('aria-label'),
      title: el.getAttribute('title'),
      textContent: (el.textContent || '').trim().slice(0, 100),
      testId: el.getAttribute('data-testid'),
      classes: (el.className || '').toString().slice(0, 200),
      disabled: el.disabled,
      selectorPath: getCSSPath(el),
    }));

  // --- 6. Deep scan: walk the DOM around the last substantial text block ---
  // Find the largest text block on the page (likely the AI response)
  const allElements = document.querySelectorAll('div, section, article, main');
  let largestTextEl = null;
  let largestTextLen = 0;

  for (const el of allElements) {
    // Only consider leaf-ish containers (not the whole page)
    const text = el.textContent || '';
    const directTextRatio = el.childElementCount < 20 ? text.length : 0;
    if (directTextRatio > largestTextLen && text.length > 100 && text.length < 50000) {
      // Check it's not a wrapper for the whole page
      const rect = el.getBoundingClientRect();
      if (rect.height < window.innerHeight * 2) {
        largestTextLen = directTextRatio;
        largestTextEl = el;
      }
    }
  }

  if (largestTextEl) {
    results.largestTextBlock = {
      tag: largestTextEl.tagName.toLowerCase(),
      id: largestTextEl.id || null,
      classes: (largestTextEl.className || '').toString().slice(0, 300),
      dataAttrs: getDataAttributes(largestTextEl),
      textLength: largestTextLen,
      selectorPath: getCSSPath(largestTextEl),
      // Walk up 4 parents
      ancestors: getAncestors(largestTextEl, 4),
      htmlSnippet: largestTextEl.outerHTML.slice(0, 500),
    };
  }

  // --- Helper functions ---

  function getDataAttributes(el) {
    const data = {};
    for (const attr of el.attributes) {
      if (attr.name.startsWith('data-')) {
        data[attr.name] = attr.value.slice(0, 100);
      }
    }
    return Object.keys(data).length > 0 ? data : null;
  }

  function getChildTagSummary(el) {
    const tags = {};
    for (const child of el.children) {
      const tag = child.tagName.toLowerCase();
      tags[tag] = (tags[tag] || 0) + 1;
    }
    return tags;
  }

  function getCSSPath(el, maxDepth = 5) {
    const parts = [];
    let current = el;
    let depth = 0;
    while (current && current !== document.body && depth < maxDepth) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
        parts.unshift(selector);
        break;
      }
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).slice(0, 3).join('.');
        if (classes) selector += `.${classes}`;
      }
      parts.unshift(selector);
      current = current.parentElement;
      depth++;
    }
    return parts.join(' > ');
  }

  function getAncestors(el, levels) {
    const ancestors = [];
    let current = el.parentElement;
    for (let i = 0; i < levels && current && current !== document.body; i++) {
      ancestors.push({
        tag: current.tagName.toLowerCase(),
        id: current.id || null,
        classes: (current.className || '').toString().slice(0, 200),
        dataAttrs: getDataAttributes(current),
        role: current.getAttribute('role'),
      });
      current = current.parentElement;
    }
    return ancestors;
  }

  // --- Output ---
  const output = JSON.stringify(results, null, 2);
  console.log('%c=== RECURATE PLATFORM INSPECTOR ===', 'color: #6366F1; font-size: 16px; font-weight: bold');
  console.log('%cCopy the JSON below and paste it back:', 'color: #34D399; font-size: 12px');
  console.log(output);

  // Also copy to clipboard
  navigator.clipboard.writeText(output).then(() => {
    console.log('%c✓ Results copied to clipboard!', 'color: #34D399; font-size: 14px; font-weight: bold');
  }).catch(() => {
    console.log('%c⚠ Could not copy to clipboard — please select and copy the JSON above manually', 'color: #F87171');
  });

  return results;
})();
