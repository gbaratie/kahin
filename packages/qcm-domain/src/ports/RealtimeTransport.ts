export interface RealtimeTransport {
  publish(event: string, payload: unknown): Promise<void>;
  subscribe(event: string, handler: (payload: unknown) => void): () => void;
  joinChannel?(channelId: string): Promise<void>;
  leaveChannel?(channelId: string): Promise<void>;
}
