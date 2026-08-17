// Les query strings parsees par h3 sont des objets sans prototype :
// devalue et le reducer pinia du payload SSR plantent dessus
// (obj.hasOwnProperty is not a function). On les recopie en objets ordinaires.
export function toPlainObject<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(toPlainObject) as T;
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === null) {
    const plain: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      plain[key] = toPlainObject(child);
    }
    return plain as T;
  }
  return value;
}
