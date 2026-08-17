/**
 * AfricaTravel — Safe DOM Helper Utilities
 *
 * Lightweight helpers for safe DOM node creation, attribute setting,
 * and text rendering to prevent XSS.
 */

/**
 * Creates an HTMLElement with optional attributes and children safely.
 * @param {string} tag - HTML tag name (e.g. 'div', 'span', 'a')
 * @param {Object} [attrs={}] - Attributes and event listeners
 * @param {Array<Node|string>} [children=[]] - Child nodes or string text contents
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);

  if (attrs && typeof attrs === 'object') {
    for (const [key, val] of Object.entries(attrs)) {
      if (val === null || val === undefined || val === false) {
        continue;
      }
      if (key === 'className' || key === 'class') {
        element.className = String(val);
      } else if (key === 'style' && typeof val === 'object') {
        Object.assign(element.style, val);
      } else if (key === 'style' && typeof val === 'string') {
        element.setAttribute('style', val);
      } else if (key.startsWith('on') && typeof val === 'function') {
        const eventName = key.slice(2).toLowerCase();
        element.addEventListener(eventName, val);
      } else if (key === 'dataset' && typeof val === 'object') {
        for (const [dKey, dVal] of Object.entries(val)) {
          element.dataset[dKey] = String(dVal);
        }
      } else if (key === 'textContent' || key === 'text') {
        element.textContent = String(val);
      } else if (key === 'innerHTML') {
        // Intentionally disallowed to enforce safe DOM creation
        console.warn('createElement: innerHTML attribute ignored for security. Use children or textContent.');
      } else {
        element.setAttribute(key, String(val));
      }
    }
  }

  appendChildren(element, ...children);
  return element;
}

/**
 * Sets text content safely on an element.
 * @param {HTMLElement} element
 * @param {string|number} text
 */
export function setText(element, text) {
  if (!element) return;
  element.textContent = text === null || text === undefined ? '' : String(text);
}

/**
 * Appends child nodes or strings as safe text nodes.
 * @param {HTMLElement} parent
 * @param {...(Node|string|number)} children
 */
export function appendChildren(parent, ...children) {
  if (!parent) return;
  children.flat(Infinity).forEach(child => {
    if (child === null || child === undefined) return;
    if (child instanceof Node) {
      parent.appendChild(child);
    } else {
      parent.appendChild(document.createTextNode(String(child)));
    }
  });
}

/**
 * Empties all children from a DOM element.
 * @param {HTMLElement} element
 */
export function clearElement(element) {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}
