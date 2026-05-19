/**
 * GoogleCalendarWatchManager
 *
 * Google Calendar Push通知（watch API）のチャンネルを管理する。
 *
 * 責務:
 *   - カレンダーごとに watch チャンネルを登録
 *   - 有効期限（最大7日）前に自動更新
 *   - アプリ終了時にチャンネルを停止
 *
 * 参考: https://developers.google.com/calendar/api/guides/push
 */

import { doc, getDoc, setDoc, deleteDoc, collection } from "firebase/firestore";
import { firestoreDb } from "@/services/firebase";

const GCAL_API_BASE = "https://www.googleapis.com/calendar/v3";

// watchチャンネルの有効期限（6日。Googleの最大値は7日）
const WATCH_TTL_MS = 6 * 24 * 60 * 60 * 1000;

// 有効期限のどのくらい前に更新するか（1日前）
const RENEWAL_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// Cloud FunctionのWebhook URL（環境変数から取得）
const WEBHOOK_URL = import.meta.env.VITE_GCAL_WEBHOOK_URL as string;

export type WatchChannel = {
  channelId: string;
  resourceId: string;
  calendarId: string;
  expiration: number;
  userId: string;
};

export class GoogleCalendarWatchManager {
  private channels = new Map<string, WatchChannel>();
  private renewalTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * カレンダーの Push通知チャンネルを登録する。
   * すでに有効なチャンネルがある場合はスキップ。
   */
  async registerWatch(
    calendarId: string,
    accessToken: string,
  ): Promise<void> {
    if (!WEBHOOK_URL) {
      console.warn(
        "[WatchManager] VITE_GCAL_WEBHOOK_URL が未設定のため Push通知をスキップ",
      );
      return;
    }

    // Firestoreに既存チャンネルが保存されていれば復元
    const existing = await this.loadChannelFromFirestore(calendarId);
    if (existing && existing.expiration > Date.now() + RENEWAL_THRESHOLD_MS) {
      this.channels.set(calendarId, existing);
      this.scheduleRenewal(calendarId, accessToken, existing.expiration);
      return;
    }

    await this.createWatch(calendarId, accessToken);
  }

  /**
   * 指定カレンダーのチャンネルを停止する。
   */
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
    } catch (error) {
      console.warn("[WatchManager] チャンネル停止に失敗:", error);
    }

    this.channels.delete(calendarId);
    this.clearRenewalTimer(calendarId);
    await this.deleteChannelFromFirestore(calendarId);
  }

  /**
   * 全チャンネルを停止する（ログアウト時など）。
   */
  async stopAll(accessToken: string): Promise<void> {
    const calendarIds = Array.from(this.channels.keys());
    await Promise.allSettled(
      calendarIds.map((id) => this.stopWatch(id, accessToken)),
    );
    this.channels.clear();
    this.renewalTimers.forEach((t) => clearTimeout(t));
    this.renewalTimers.clear();
  }

  // ── 内部実装

  private async createWatch(
    calendarId: string,
    accessToken: string,
  ): Promise<void> {
    const channelId = crypto.randomUUID();
    // token に userId:calendarId を埋め込む（Webhook側で使う）
    const token = `${this.userId}:${calendarId}`;
    const expiration = Date.now() + WATCH_TTL_MS;

    const encodedId = encodeURIComponent(calendarId);
    const response = await fetch(
      `${GCAL_API_BASE}/calendars/${encodedId}/events/watch`,
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
          token,
          expiration: expiration.toString(),
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `[WatchManager] watch登録失敗 (${response.status}): ${text}`,
      );
    }

    const data = (await response.json()) as {
      id: string;
      resourceId: string;
      expiration: string;
    };

    const channel: WatchChannel = {
      channelId: data.id,
      resourceId: data.resourceId,
      calendarId,
      expiration: Number(data.expiration),
      userId: this.userId,
    };

    this.channels.set(calendarId, channel);
    await this.saveChannelToFirestore(channel);
    this.scheduleRenewal(calendarId, accessToken, channel.expiration);

    console.info(
      `[WatchManager] ${calendarId} のPush通知チャンネルを登録しました`,
    );
  }

  private scheduleRenewal(
    calendarId: string,
    accessToken: string,
    expiration: number,
  ): void {
    this.clearRenewalTimer(calendarId);

    const msUntilRenewal = Math.max(
      0,
      expiration - Date.now() - RENEWAL_THRESHOLD_MS,
    );

    const timer = setTimeout(async () => {
      console.info(
        `[WatchManager] ${calendarId} のチャンネルを更新します`,
      );
      // 古いチャンネルを停止してから新しく登録
      await this.stopWatch(calendarId, accessToken);
      await this.createWatch(calendarId, accessToken);
    }, msUntilRenewal);

    this.renewalTimers.set(calendarId, timer);
  }

  private clearRenewalTimer(calendarId: string): void {
    const timer = this.renewalTimers.get(calendarId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.renewalTimers.delete(calendarId);
    }
  }

  // ── Firestore 永続化

  private getChannelDocRef(calendarId: string) {
    return doc(
      db,
      "gcal_watch_channels",
      this.userId,
      "calendars",
      calendarId,
    );
  }

  private async loadChannelFromFirestore(
    calendarId: string,
  ): Promise<WatchChannel | null> {
    try {
      const snap = await getDoc(this.getChannelDocRef(calendarId));
      if (!snap.exists()) return null;
      return snap.data() as WatchChannel;
    } catch {
      return null;
    }
  }

  private async saveChannelToFirestore(channel: WatchChannel): Promise<void> {
    try {
      await setDoc(this.getChannelDocRef(channel.calendarId), channel);
    } catch (error) {
      console.warn("[WatchManager] Firestoreへの保存に失敗:", error);
    }
  }

  private async deleteChannelFromFirestore(calendarId: string): Promise<void> {
    try {
      await deleteDoc(this.getChannelDocRef(calendarId));
    } catch (error) {
      console.warn("[WatchManager] Firestoreからの削除に失敗:", error);
    }
  }
}