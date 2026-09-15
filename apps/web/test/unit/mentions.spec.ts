import { describe, expect, it } from 'vitest';
import { resolveMentions } from '@nookapp/protocol';
import { highlightMentions } from '../../utils/mentions';

const MEMBERS = [
  { id: 'u1', name: 'Jordan' },
  { id: 'u2', name: 'Lea' },
  { id: 'u3', name: 'Jo' },
];

describe('resolveMentions', () => {
  it('maps the @names to member ids', () => {
    expect(resolveMentions('salut @Jordan et @Lea', MEMBERS)).toEqual(['u1', 'u2']);
  });

  it('matches case-insensitively', () => {
    expect(resolveMentions('yo @jordan', MEMBERS)).toEqual(['u1']);
  });

  it('prefers the longest name so a short one never shadows it', () => {
    expect(resolveMentions('@Jordan', MEMBERS)).toEqual(['u1']);
    expect(resolveMentions('@Jo', MEMBERS)).toEqual(['u3']);
  });

  it('ignores a longer word that merely starts with a member name', () => {
    expect(resolveMentions('@Jordanne passe', MEMBERS)).toEqual([]);
  });

  it('does not repeat a member mentioned twice', () => {
    expect(resolveMentions('@Lea @Lea', MEMBERS)).toEqual(['u2']);
  });

  it('treats regex specials in a name literally', () => {
    const members = [{ id: 'u9', name: 'a.b' }];
    expect(resolveMentions('coucou @a.b', members)).toEqual(['u9']);
    expect(resolveMentions('coucou @axb', members)).toEqual([]);
  });

  it('is empty without members', () => {
    expect(resolveMentions('@nobody', [])).toEqual([]);
  });
});

describe('highlightMentions', () => {
  it('wraps a known member and flags the current user', () => {
    const html = highlightMentions('<p>hey @Jordan et @Lea</p>', ['Jordan', 'Lea'], 'Jordan');
    expect(html).toContain('<span class="mention mention--me">@Jordan</span>');
    expect(html).toContain('<span class="mention">@Lea</span>');
  });

  it('leaves unknown names alone', () => {
    expect(highlightMentions('<p>@Bob</p>', ['Jordan'], 'Jordan')).toBe('<p>@Bob</p>');
  });

  it('never rewrites inside a tag', () => {
    const html = highlightMentions('<a href="mailto:@Jordan">x</a>', ['Jordan'], null);
    expect(html).toBe('<a href="mailto:@Jordan">x</a>');
  });
});
