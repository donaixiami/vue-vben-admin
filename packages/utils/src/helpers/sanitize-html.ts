const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'em',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'strong',
  'u',
  'ul',
]);

const DROP_WITH_CONTENT_TAGS = new Set([
  'embed',
  'iframe',
  'object',
  'script',
  'style',
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'rel', 'target', 'title']),
};

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isAllowedHref(value: string) {
  try {
    const url = new URL(value, window.location.origin);
    return ALLOWED_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

function sanitizeElement(element: Element) {
  const tagName = element.tagName.toLowerCase();

  if (DROP_WITH_CONTENT_TAGS.has(tagName)) {
    element.remove();
    return;
  }

  if (!ALLOWED_TAGS.has(tagName)) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const allowedAttributes = ALLOWED_ATTRIBUTES[tagName] ?? new Set<string>();
  for (const attribute of element.attributes) {
    const name = attribute.name.toLowerCase();
    const value = attribute.value;

    if (!allowedAttributes.has(name)) {
      element.removeAttribute(attribute.name);
      continue;
    }

    if (tagName === 'a' && name === 'href' && !isAllowedHref(value)) {
      element.removeAttribute(attribute.name);
    }
  }

  if (tagName === 'a' && element.hasAttribute('href')) {
    element.setAttribute('target', '_blank');
    element.setAttribute('rel', 'noopener noreferrer');
  }
}

function sanitizeRichTextHtml(html: string) {
  if (!html) {
    return '';
  }

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return escapeHtml(html);
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  const elements = [...document.body.querySelectorAll('*')];

  for (const element of elements) {
    sanitizeElement(element);
  }

  return document.body.innerHTML;
}

export { sanitizeRichTextHtml };
