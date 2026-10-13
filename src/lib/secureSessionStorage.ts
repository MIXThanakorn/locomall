type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> };
type Manifest = { version: 1; generation: string; count: number };

// SecureStore values are deliberately small, including for long Unicode sessions.
// Commit the manifest last; never fall back to plaintext after a secure read fails.
export function createSecureSessionStorage(secure: Storage, legacy: Storage, newId: () => string): Storage {
  let pending: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>): Promise<T> => {
    const result = pending.then(work, work);
    pending = result.catch(() => undefined);
    return result;
  };
  const base = (key: string) => `locomall.auth.${encodeURIComponent(key).replace(/%/g, "_")}`;
  const parse = (raw: string): Manifest => {
    const value = JSON.parse(raw);
    if (value.version !== 1 || !/^[a-zA-Z0-9-]+$/.test(value.generation) || !Number.isInteger(value.count) || value.count < 1 || value.count > 256) throw new Error("Invalid secure session manifest");
    return value;
  };
  const discard = async (key: string, manifest: Manifest) => {
    await Promise.all(Array.from({ length: manifest.count }, (_, i) => secure.removeItem(`${base(key)}.${manifest.generation}.${i}`)));
  };
  const write = async (key: string, value: string) => {
    const oldRaw = await secure.getItem(base(key));
    const old = oldRaw ? parse(oldRaw) : null;
    const points = Array.from(value);
    const chunks = Array.from({ length: Math.max(1, Math.ceil(points.length / 300)) }, (_, i) => points.slice(i * 300, (i + 1) * 300).join(""));
    if (chunks.length > 256) throw new Error("Session exceeds secure storage limit");
    const next: Manifest = { version: 1, generation: newId(), count: chunks.length };
    if (!/^[a-zA-Z0-9-]+$/.test(next.generation)) throw new Error("Invalid session generation");
    try {
      for (let i = 0; i < chunks.length; i++) await secure.setItem(`${base(key)}.${next.generation}.${i}`, chunks[i]);
      await secure.setItem(base(key), JSON.stringify(next));
    } catch (error) {
      await discard(key, next).catch(() => undefined);
      throw error;
    }
    // The secure value is committed. Cleanup failure must not undo that commit.
    await legacy.removeItem(key);
    if (old) await discard(key, old).catch(() => undefined);
  };
  return {
    getItem: (key) => serial(async () => {
      const raw = await secure.getItem(base(key));
      if (!raw) {
        const value = await legacy.getItem(key);
        if (value !== null) await write(key, value);
        return value;
      }
      const manifest = parse(raw);
      const chunks = await Promise.all(Array.from({ length: manifest.count }, (_, i) => secure.getItem(`${base(key)}.${manifest.generation}.${i}`)));
      if (chunks.some((chunk) => chunk === null)) throw new Error("Incomplete secure session");
      // Retry cleanup after interrupted migrations without resurrecting legacy tokens.
      await legacy.removeItem(key);
      return chunks.join("");
    }),
    setItem: (key, value) => serial(() => write(key, value)),
    removeItem: (key) => serial(async () => {
      await legacy.removeItem(key);
      const raw = await secure.getItem(base(key));
      await secure.removeItem(base(key));
      if (raw) await discard(key, parse(raw));
    }),
  };
}
