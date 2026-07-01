import { requireFirestoreDb } from "@platform/firebase/client";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { isDesktopLikeRuntime } from "@/platform/runtimeKind";



type WatchChannel = {
  channelId: string;
  resourceId: string;
  calendarId: string;
  expiration: number;
  userId: string;
};
type GoogleWatchResponse = {
  id?: string;
  resourceId?: string;
  expiration?: string | number;
};



const GCAL_API_BASE = "https://www.googleapis.com/calendar/v3";
const WATCH_TTL_MS = 6 * 24 * 60 * 60 * 1000;
const RENEWAL_THRESHOLD_MS = 24 * 60 * 60 * 1000;



const isLoopbackHost = (hostname: string): boolean => {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".localhost");
};
const isPrivateIpv4Host = (hostname: string): boolean => {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;

  const [first, second] = parts;
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
};
const isPublicHttpsWebhookUrl = (value: string | undefined): value is string => {
  const trimmed = value?.trim();
  if (!trimmed) return false;

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" && !isLoopbackHost(url.hostname) && !isPrivateIpv4Host(url.hostname);
  } catch {
    return false;
  }
};
const getWebhookUrl = (): string | null => {
  if (isDesktopLikeRuntime()) return null;

  const webhookUrl = import.meta.env.VITE_GCAL_WEBHOOK_URL as string | undefined;
  return isPublicHttpsWebhookUrl(webhookUrl) ? webhookUrl.trim() : null;
};
const toWatchChannel = (data: GoogleWatchResponse, calendarId: string, userId: string): WatchChannel => {
  if (!data.id || !data.resourceId || !data.expiration) {
    throw new Error("watch failed: Google Calendar response is incomplete");
  }

  const expiration = Number(data.expiration);
  if (!Number.isFinite(expiration)) {
    throw new Error("watch failed: Google Calendar response has invalid expiration");
  }

  return {
    channelId: data.id,
    resourceId: data.resourceId,
    calendarId,
    expiration,
    userId,
  };
};
// ─────────────────────────────────────────────
// WatchManager
// ─────────────────────────────────────────────
class GoogleCalendarWatchManager {
  private channels = new Map<string, WatchChannel>();

  private renewalTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // ─────────────────────────────
  // register
  // ─────────────────────────────

  async registerWatch(calendarId: string, accessToken: string): Promise<void> {
    if (!getWebhookUrl()) return;

    const existing = await this.loadChannel(calendarId);

    if (existing && this.isValid(existing)) {
      this.channels.set(calendarId, existing);
      this.scheduleRenewal(calendarId, accessToken, existing.expiration);
      return;
    }

    await this.createWatch(calendarId, accessToken);

    if (existing) {
      await this.stopRemoteChannel(existing, accessToken);
    }
  }

  // ─────────────────────────────
  // stop single
  // ─────────────────────────────

  async stopWatch(calendarId: string, accessToken: string): Promise<void> {
    const channel = this.channels.get(calendarId);
    if (!channel) return;

    await this.stopRemoteChannel(channel, accessToken);
    this.clearTimer(calendarId);
    await this.deleteChannelIfCurrent(channel);
  }

  // ─────────────────────────────
  // stop all
  // ─────────────────────────────

  async stopAll(accessToken: string): Promise<void> {
    await Promise.allSettled(Array.from(this.channels.keys()).map((id) => this.stopWatch(id, accessToken)));

    this.channels.clear();
    this.renewalTimers.forEach(clearTimeout);
    this.renewalTimers.clear();
  }

  // ─────────────────────────────
  // create watch
  // ─────────────────────────────

  private async createWatch(
    calendarId: string,
    accessToken: string,
  ): Promise<void> {
    const webhookUrl = getWebhookUrl();
    if (!webhookUrl) return;

    const channelId = crypto.randomUUID();
    const expiration = Date.now() + WATCH_TTL_MS;

    const response = await fetch(
      `${GCAL_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/watch`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: channelId,
          type: "web_hook",
          address: webhookUrl,
          token: `${this.userId}:${calendarId}`,
          expiration: String(expiration),
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`watch failed: ${response.status}`);
    }

    const channel = toWatchChannel((await response.json()) as GoogleWatchResponse, calendarId, this.userId);

    this.channels.set(calendarId, channel);
    await this.saveChannel(channel);

    this.scheduleRenewal(calendarId, accessToken, channel.expiration);
  }

  // ─────────────────────────────
  // renewal
  // ─────────────────────────────

  private scheduleRenewal(
    calendarId: string,
    accessToken: string,
    expiration: number,
  ): void {
    this.clearTimer(calendarId);

    const delay = Math.max(
      0,
      expiration - Date.now() - RENEWAL_THRESHOLD_MS,
    );

    const timer = setTimeout(() => {
      void this.renew(calendarId, accessToken);
    }, delay);

    this.renewalTimers.set(calendarId, timer);
  }

  private async renew(
    calendarId: string,
    accessToken: string,
  ): Promise<void> {
    const previous = this.channels.get(calendarId) ?? await this.loadChannel(calendarId).catch(() => null);
    await this.createWatch(calendarId, accessToken);

    if (previous) {
      await this.stopRemoteChannel(previous, accessToken);
    }
  }

  // ─────────────────────────────
  // helpers
  // ─────────────────────────────

  private async stopRemoteChannel(channel: WatchChannel, accessToken: string): Promise<void> {
    try {
      await fetch(`${GCAL_API_BASE}/channels/stop`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: channel.channelId,
          resourceId: channel.resourceId,
        }),
      });
    } catch {
      // best-effort cleanup
    }
  }

  private isValid(channel: WatchChannel): boolean {
    return channel.expiration > Date.now() + RENEWAL_THRESHOLD_MS;
  }

  private clearTimer(calendarId: string): void {
    const t = this.renewalTimers.get(calendarId);
    if (t) clearTimeout(t);
    this.renewalTimers.delete(calendarId);
  }

  // ─────────────────────────────
  // firestore
  // ─────────────────────────────

  private getRef(calendarId: string) {
    const firestoreDb = requireFirestoreDb();

    return doc(
      firestoreDb,
      "gcal_watch_channels",
      this.userId,
      "calendars",
      calendarId,
    );
  }

  private async loadChannel(calendarId: string) {
    const snap = await getDoc(this.getRef(calendarId));
    if (!snap.exists()) return null;
    return snap.data() as WatchChannel;
  }

  private async saveChannel(channel: WatchChannel) {
    await setDoc(this.getRef(channel.calendarId), channel);
  }

  private async deleteChannelIfCurrent(channel: WatchChannel) {
    const current = this.channels.get(channel.calendarId);
    if (current?.channelId !== channel.channelId) return;

    this.channels.delete(channel.calendarId);
    await deleteDoc(this.getRef(channel.calendarId));
  }
}



export { GoogleCalendarWatchManager };


export type { WatchChannel };
