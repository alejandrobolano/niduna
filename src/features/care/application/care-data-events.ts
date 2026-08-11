type CareDataListener = () => void;

const listeners = new Set<CareDataListener>();

export function publishCareDataChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeToCareDataChanges(
  listener: CareDataListener,
): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}
