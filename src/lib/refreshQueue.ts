// Collapse event bursts; an event arriving during a request gets one follow-up.
export function createRefreshQueue(refresh: () => Promise<unknown> | void, onError: () => void = () => {}) {
  let active = true;
  let running = false;
  let dirty = false;
  const run = async () => {
    if (!active) return;
    dirty = true;
    if (running) return;
    running = true;
    try {
      while (active && dirty) {
        dirty = false;
        try { await refresh(); } catch { onError(); }
      }
    } finally { running = false; }
  };
  return { run, stop: () => { active = false; dirty = false; } };
}
