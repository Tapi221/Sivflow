import type { HandwritingSession, HandwritingSessionMessage, HandwritingSessionStatus, HandwritingStrokeDeltaMessage } from "./handwritingSession.types";
import type { HandwritingSessionClient, HandwritingSessionMessageHandler, HandwritingSessionStatusHandler, HandwritingSessionUnsubscribe } from "./handwritingSessionClient";



type InMemoryHandwritingSessionHub = {
  clients: Set<InMemoryHandwritingSessionClient>;
};
type InMemoryHandwritingSessionClientOptions = {
  session: HandwritingSession;
  hub?: InMemoryHandwritingSessionHub;
};



const createHub = (): InMemoryHandwritingSessionHub => ({
  clients: new Set(),
});



const createInMemoryHandwritingSessionHub = createHub;



class InMemoryHandwritingSessionClient implements HandwritingSessionClient {
  readonly session: HandwritingSession;

  private readonly hub: InMemoryHandwritingSessionHub;
  private readonly messageHandlers = new Set<HandwritingSessionMessageHandler>();
  private readonly statusHandlers = new Set<HandwritingSessionStatusHandler>();
  private status: HandwritingSessionStatus;

  constructor({ session, hub = createHub() }: InMemoryHandwritingSessionClientOptions) {
    this.session = session;
    this.hub = hub;
    this.status = session.status;
  }

  async connect(): Promise<void> {
    this.hub.clients.add(this);
    this.setStatus("connected");
  }

  async disconnect(reason?: string): Promise<void> {
    this.hub.clients.delete(this);
    this.setStatus(reason ? "error" : "closed");
    this.emitLocalMessage({ type: "handwriting:session-control", sessionId: this.session.id, status: this.status, reason });
  }

  async sendStrokeDelta(message: HandwritingStrokeDeltaMessage): Promise<void> {
    this.broadcast(message);
  }

  onMessage(handler: HandwritingSessionMessageHandler): HandwritingSessionUnsubscribe {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onStatusChange(handler: HandwritingSessionStatusHandler): HandwritingSessionUnsubscribe {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  receive(message: HandwritingSessionMessage): void {
    this.emitLocalMessage(message);
  }

  private broadcast(message: HandwritingSessionMessage): void {
    for (const client of this.hub.clients) {
      if (client.session.id === this.session.id) {
        client.receive(message);
      }
    }
  }

  private emitLocalMessage(message: HandwritingSessionMessage): void {
    for (const handler of this.messageHandlers) {
      handler(message);
    }
  }

  private setStatus(status: HandwritingSessionStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const handler of this.statusHandlers) {
      handler(status);
    }
  }
}
const createInMemoryHandwritingSessionClientPair = (session: HandwritingSession): readonly [InMemoryHandwritingSessionClient, InMemoryHandwritingSessionClient] => {
  const hub = createHub();
  return [new InMemoryHandwritingSessionClient({ session, hub }), new InMemoryHandwritingSessionClient({ session, hub })];
};



export { InMemoryHandwritingSessionClient, createInMemoryHandwritingSessionHub, createInMemoryHandwritingSessionClientPair };
