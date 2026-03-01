import type { RealtimeTransport } from '@kahin/qcm-domain';

type Handler = (payload: unknown) => void;

const sharedListeners = new Map<string, Set<Handler>>();

function channelEventKey(channelId: string, event: string): string {
  return `${channelId}:${event}`;
}

export class MockRealtimeTransport implements RealtimeTransport {
  private channelId: string | null = null;

  async publish(event: string, payload: unknown): Promise<void> {
    if (!this.channelId) return;
    const key = channelEventKey(this.channelId, event);
    const handlers = sharedListeners.get(key);
    if (handlers) {
      handlers.forEach((h) => h(payload));
    }
  }

  subscribe(event: string, handler: (payload: unknown) => void): () => void {
    const channelId = this.channelId ?? '';
    const key = channelEventKey(channelId, event);
    if (!sharedListeners.has(key)) {
      sharedListeners.set(key, new Set());
    }
    sharedListeners.get(key)!.add(handler);
    return () => {
      sharedListeners.get(key)?.delete(handler);
    };
  }

  async joinChannel(channelId: string): Promise<void> {
    this.channelId = channelId;
  }

  async leaveChannel(_channelId: string): Promise<void> {
    this.channelId = null;
  }
}
