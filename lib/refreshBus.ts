// Tiny pub/sub used to tell other screens (e.g. Groups) to refresh after an
// action performed elsewhere (e.g. accepting an invite). Avoids stale caches.
type Listener = () => void;

const listeners = new Set<Listener>();

export const refreshBus = {
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  emit(): void {
    listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        // ignore individual listener errors
      }
    });
  },
};
