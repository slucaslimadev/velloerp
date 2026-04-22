const queues = new Map<string, Promise<void>>();

export function enqueue(whatsapp: string, task: () => Promise<void>): void {
  const current = queues.get(whatsapp) ?? Promise.resolve();
  const next = current.then(() => task()).catch(() => {});
  queues.set(whatsapp, next);
  next.finally(() => {
    if (queues.get(whatsapp) === next) queues.delete(whatsapp);
  });
}
