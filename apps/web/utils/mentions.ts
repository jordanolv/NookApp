import { mentionRegex } from '@nookapp/protocol';

/** Wraps @name occurrences in rendered HTML, skipping tag internals (hrefs, attributes). */
export function highlightMentions(html: string, names: string[], meName?: string | null): string {
  const re = mentionRegex(names);
  if (!re) return html;
  const me = meName?.toLowerCase();
  return html
    .split(/(<[^>]*>)/)
    .map((chunk) =>
      chunk.startsWith('<')
        ? chunk
        : chunk.replace(
            re,
            (match, name: string) =>
              `<span class="mention${name.toLowerCase() === me ? ' mention--me' : ''}">${match}</span>`,
          ),
    )
    .join('');
}
