import { describe, expect, it } from 'vitest';
import { toPlainObject } from '~/utils/plain-object';

function nullProto(entries: Record<string, unknown>) {
  return Object.assign(Object.create(null), entries) as Record<string, unknown>;
}

describe('toPlainObject', () => {
  it('recopie un objet sans prototype en objet ordinaire', () => {
    const input = nullProto({ statusCode: '404', url: '/robots.txt' });
    expect(() => (input as { hasOwnProperty?: unknown }).hasOwnProperty).toBeDefined();
    expect(input instanceof Object).toBe(false);

    const plain = toPlainObject(input);
    expect(plain instanceof Object).toBe(true);
    // C'est l'appel exact qui plantait dans le reducer pinia.
    // eslint-disable-next-line no-prototype-builtins
    expect(plain.hasOwnProperty('statusCode')).toBe(true);
    expect(plain).toEqual({ statusCode: '404', url: '/robots.txt' });
  });

  it('normalise en profondeur les enfants sans prototype', () => {
    const input = nullProto({ data: nullProto({ path: '/x' }), list: [nullProto({ a: 1 })] });
    const plain = toPlainObject(input) as { data: object; list: object[] };
    expect(plain.data instanceof Object).toBe(true);
    expect(plain.list[0] instanceof Object).toBe(true);
  });

  it('laisse intacts les valeurs primitives et les objets ordinaires', () => {
    const obj = { a: 1 };
    expect(toPlainObject(obj)).toBe(obj);
    expect(toPlainObject('x')).toBe('x');
    expect(toPlainObject(null)).toBe(null);
  });
});
