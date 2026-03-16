// ============================================================
// B-Mesh EventBus - 타입 안전한 이벤트 시스템
// ============================================================

import type { EventMap } from '../mesh/types';

type Listener<T> = (data: T) => void;

class EventBus {
  private listeners = new Map<string, Set<Listener<any>>>();

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(data);
      } catch (e) {
        console.error(`[EventBus] Error in listener for "${event}":`, e);
      }
    });
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
export { EventBus };
