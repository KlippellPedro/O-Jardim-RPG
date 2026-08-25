const ALLOWED_TAGS = new Set([
  'br', 'caption', 'dd', 'details', 'div', 'dl', 'dt', 'em', 'h3', 'h4',
  'li', 'ol', 'p', 'section', 'small', 'span', 'strong', 'summary', 'table',
  'tbody', 'td', 'th', 'thead', 'tr', 'ul',
]);

const ALLOWED_ATTRIBUTES = new Set(['class', 'colspan', 'rowspan', 'scope', 'open']);

const safeClassNames = (value: string): string => value
  .split(/\s+/)
  .filter((token) => token === 'sr-only' || /^regras-[a-z0-9-]+$/.test(token))
  .join(' ');

/** Sanitiza capítulos oficiais e editoriais antes de qualquer innerHTML.
 * A lista é deliberadamente pequena: regras não precisam de links, imagens,
 * estilos inline, iframes ou atributos de evento. */
export function sanitizeRuleHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return '';
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const elements = Array.from(documentNode.body.querySelectorAll('*'));

  elements.reverse().forEach((element) => {
    const tag = element.tagName.toLocaleLowerCase('en-US');
    if (!ALLOWED_TAGS.has(tag)) {
      element.replaceWith(documentNode.createTextNode(element.textContent || ''));
      return;
    }
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLocaleLowerCase('en-US');
      if (!ALLOWED_ATTRIBUTES.has(name)) {
        element.removeAttribute(attribute.name);
        return;
      }
      if (name === 'class') {
        const classes = safeClassNames(attribute.value);
        if (classes) element.setAttribute('class', classes);
        else element.removeAttribute('class');
      } else if (name === 'colspan' || name === 'rowspan') {
        const value = Number(attribute.value);
        if (!Number.isInteger(value) || value < 1 || value > 20) element.removeAttribute(attribute.name);
      } else if (name === 'scope' && !['row', 'col', 'rowgroup', 'colgroup'].includes(attribute.value)) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  const walker = documentNode.createTreeWalker(documentNode.body, NodeFilter.SHOW_COMMENT);
  const comments: Comment[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode as Comment);
  comments.forEach((comment) => comment.remove());
  return documentNode.body.innerHTML;
}
