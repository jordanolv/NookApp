import { marked } from 'marked';

marked.use({ breaks: true, gfm: true });

function stripDangerous(html: string): string {
  return html.replace(/<(script|iframe|object|embed|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
}

export function renderMarkdown(text: string): string {
  return stripDangerous(String(marked.parse(text)));
}

export function isGifUrl(text: string): string | null {
  const t = text.trim();
  if (/^https?:\/\/media\.tenor\.com\/.+/i.test(t)) return t;
  if (/^https?:\/\/.+\.gif(\?.*)?$/i.test(t)) return t;
  return null;
}
