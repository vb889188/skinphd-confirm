type Listener = (stamp: number) => void;

const listeners = new Set<Listener>();
let stamp = Date.now();

export function liveStamp() {
  return stamp;
}

export function bumpConfirmLive() {
  stamp = Date.now();
  for (const listener of listeners) {
    try {
      listener(stamp);
    } catch {
      /* a closed desk should not break the others */
    }
  }
}

export function onConfirmLive(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
