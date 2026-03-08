export class EventEmitter<Events extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof Events, Set<(value: any) => void>>();

  on<EventName extends keyof Events>(event: EventName, handler: (value: Events[EventName]) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);

    return () => set.delete(handler);
  }

  protected emit<EventName extends keyof Events>(event: EventName, value: Events[EventName]): void {
    this.listeners.get(event)?.forEach((handler) => handler(value));
  }
}
