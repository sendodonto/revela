const KEY = 'revela:visitor';

/** Anonymous, per-browser id so a client's favorites and selection survive reloads without an account. */
export function visitorId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    const g = globalThis as { __revelaVisitor?: string };
    return (g.__revelaVisitor ??= crypto.randomUUID());
  }
}
