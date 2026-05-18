/**
 * calendarEventLayout.ts
 *
 * 時間が重複するカレンダーイベントを
 * Google Calendar 方式（並列分割）でレイアウトする。
 *
 * 【ロジックの流れ】
 * 1. buildClusters  : 重なり合うイベントを「クラスター」にまとめる
 * 2. assignColumns  : クラスター内で各イベントに列番号を割り当てる
 * 3. computeEventLayout : 上記を組み合わせ、left/width(0~1)を返す
 *
 * 純粋関数なので React / React Native / Electron 全てで使い回せる。
 */

// ─────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────

/** レイアウト計算に必要な最小限のイベント情報 */
export type LayoutEvent = {
  /** イベントの一意ID */
  id: string;
  /** 0時からの開始分数 (例: 9:30 → 570) */
  startMinutes: number;
  /** 0時からの終了分数 (例: 10:30 → 630) */
  endMinutes: number;
};

/** 計算結果：左端位置と幅を 0.0~1.0 の割合で表す */
export type LayoutResult = {
  /** カラム幅に対する左端の割合 (0.0 = 左端) */
  left: number;
  /** カラム幅に対するイベント幅の割合 (1.0 = フル幅) */
  width: number;
};

// ─────────────────────────────────────────
// 内部ヘルパー
// ─────────────────────────────────────────

/**
 * 2つのイベントが時間的に重なるか判定する。
 * 終了時刻ぴったりに始まるイベントは重ならないと判定（< を使う）。
 */
const overlaps = (a: LayoutEvent, b: LayoutEvent): boolean =>
  a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;

/**
 * イベント群を「重なりクラスター」に分割する。
 *
 * クラスターとは：「その中の任意の2イベントが直接または間接的に重なる」グループ。
 * 例：A-B が重なり、B-C が重なれば、A・B・C は同一クラスター。
 *
 * アルゴリズム：
 *   開始時刻でソート → 現在のクラスターと重なるか確認 → 重なれば追加、重ならなければ新クラスター開始
 */
const buildClusters = (events: LayoutEvent[]): LayoutEvent[][] => {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.startMinutes - b.startMinutes);

  const clusters: LayoutEvent[][] = [];
  let currentCluster: LayoutEvent[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const event = sorted[i];

    // クラスター内の「最も遅く終わるイベントの終了時刻」を追う
    const clusterMaxEnd = Math.max(...currentCluster.map((e) => e.endMinutes));

    if (event.startMinutes < clusterMaxEnd) {
      // このイベントはクラスター内の何かと重なる → 同じクラスターに追加
      currentCluster.push(event);
    } else {
      // 重ならない → 新しいクラスター開始
      clusters.push(currentCluster);
      currentCluster = [event];
    }
  }

  clusters.push(currentCluster);
  return clusters;
};

/**
 * クラスター内の各イベントに列番号を割り当てる。
 *
 * 貪欲法（Greedy）：
 *   各イベントを順番に見て、「すでに終わった列」があればそこを再利用する。
 *   なければ新しい列を作る。
 *
 * 例：
 *   イベントA (9:00-11:00) → 列0
 *   イベントB (9:30-10:30) → 列0は使用中 → 列1
 *   イベントC (10:30-12:00) → 列1は終了(10:30) → 列1を再利用
 */
const assignColumns = (cluster: LayoutEvent[]): Map<string, number> => {
  const columnOf = new Map<string, number>();

  // columnEndMinutes[n] = 列nを使用中のイベントの終了時刻
  const columnEndMinutes: number[] = [];

  for (const event of cluster) {
    let assignedColumn = -1;

    // 使える列を探す（終了時刻 ≤ このイベントの開始時刻）
    for (let col = 0; col < columnEndMinutes.length; col++) {
      if (columnEndMinutes[col] <= event.startMinutes) {
        assignedColumn = col;
        break;
      }
    }

    if (assignedColumn === -1) {
      // 使える列がない → 新しい列を作る
      assignedColumn = columnEndMinutes.length;
      columnEndMinutes.push(event.endMinutes);
    } else {
      columnEndMinutes[assignedColumn] = event.endMinutes;
    }

    columnOf.set(event.id, assignedColumn);
  }

  return columnOf;
};

// ─────────────────────────────────────────
// 公開 API
// ─────────────────────────────────────────

/**
 * イベント群に対してレイアウト（left/width）を計算して返す。
 *
 * @param events - 同じ日のイベント一覧（順不同で渡してよい）
 * @returns Map<eventId, LayoutResult>
 *
 * @example
 * const layout = computeEventLayout(eventsForDay);
 * const { left, width } = layout.get(event.id) ?? { left: 0, width: 1 };
 * // → style={{ left: `${left * 100}%`, width: `${width * 100}%` }}
 */
export const computeEventLayout = (
  events: LayoutEvent[],
): Map<string, LayoutResult> => {
  const result = new Map<string, LayoutResult>();

  if (events.length === 0) return result;

  const clusters = buildClusters(events);

  for (const cluster of clusters) {
    const columnOf = assignColumns(cluster);

    // クラスター内で最も多い列数 = 全列数
    const totalColumns = Math.max(...Array.from(columnOf.values())) + 1;

    for (const event of cluster) {
      const col = columnOf.get(event.id) ?? 0;
      result.set(event.id, {
        left: col / totalColumns,
        width: 1 / totalColumns,
      });
    }
  }

  return result;
};

/**
 * GoogleCalendarEvent などの具体的な型から LayoutEvent を作るヘルパー。
 * CalendarPane.tsx で使いやすいように提供。
 *
 * @param id      - イベントID
 * @param startsAt - 開始時刻 (Date)
 * @param minutes  - 所要分数
 */
export const toLayoutEvent = (
  id: string,
  startsAt: Date,
  minutes: number,
): LayoutEvent => ({
  id,
  startMinutes: startsAt.getHours() * 60 + startsAt.getMinutes(),
  endMinutes: startsAt.getHours() * 60 + startsAt.getMinutes() + minutes,
});
