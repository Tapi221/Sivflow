import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/services/firebase";

const GCAL_API_BASE = "https://www.googleapis.com/calendar/v3";

const WATCH_TTL_MS = 6 * 24 * 60 * 60 * 1000;
const RENEWAL_THRESHOLD_MS = 24 * 60 * 60 * 1000;

const WEBHOOK_URL = import.meta.env.VITE_GCAL_WEBHOOK_URL as string;

// ─────────────────────────────────────────────
// 型
// ─────────────────────────────────────────────

export type WatchChannel = {
  channelId: string;
  resourceId: string;
  calendarId: string;
  expiration: number;
  userId: string;
};

// ─────────────────────────────────────────────
// WatchManager
// ─────────────────────────────────────────────

export class GoogleCalendarWatchManager {
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
    if (!WEBHOOK_URL) return;

    const existing = await this.loadChannel(calendarId);

    if (existing && this.isValid(existing)) {
      this.channels.set(calendarId, existing);
      this.scheduleRenewal(calendarId, accessToken, existing.expiration);
      return;
    }

    await this.createWatch(calendarId, accessToken);
  }

  // ─────────────────────────────
  // stop single
  // ─────────────────────────────

  async stopWatch(calendarId: string, accessToken: string): Promise<void> {
    const channel = this.channels.get(calendarId);
    if (!channel) return;

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
      // ignore
    }

    this.channels.delete(calendarId);
    this.clearTimer(calendarId);
    await this.deleteChannel(calendarId);
  }

  // ─────────────────────────────
  // stop all
  // ─────────────────────────────

  async stopAll(accessToken: string): Promise<void> {
    await Promise.allSettled(
      Array.from(this.channels.keys()).map((id) =>
        this.stopWatch(id, accessToken),
      ),
    );

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
          address: WEBHOOK_URL,
          token: `${this.userId}:${calendarId}`,
          expiration: String(expiration),
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`watch failed: ${response.status}`);
    }

    const data = await response.json();

    const channel: WatchChannel = {
      channelId: data.id,
      resourceId: data.resourceId,
      calendarId,
      expiration: Number(data.expiration),
      userId: this.userId,
    };

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
    await this.stopWatch(calendarId, accessToken);
    await this.createWatch(calendarId, accessToken);
  }

  // ─────────────────────────────
  // helpers
  // ─────────────────────────────

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
    return doc(
      db,
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

  private async deleteChannel(calendarId: string) {
    await deleteDoc(this.getRef(calendarId));
  }
}