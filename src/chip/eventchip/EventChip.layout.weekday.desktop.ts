export type LayoutEvent = {
  id: string;
  startMinutes: number;
  endMinutes: number;
};

export type LayoutResult = {
  left: number;
  width: number;
};

const buildClusters = (events: LayoutEvent[]): LayoutEvent[][] => {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.startMinutes - b.startMinutes);

  const clusters: LayoutEvent[][] = [];
  let currentCluster: LayoutEvent[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const event = sorted[i];

    const clusterMaxEnd = Math.max(
      ...currentCluster.map((e) => e.endMinutes),
    );

    if (event.startMinutes < clusterMaxEnd) {
      currentCluster.push(event);
    } else {
      clusters.push(currentCluster);
      currentCluster = [event];
    }
  }

  clusters.push(currentCluster);
  return clusters;
};

const assignColumns = (cluster: LayoutEvent[]): Map<string, number> => {
  const columnOf = new Map<string, number>();
  const columnEndMinutes: number[] = [];

  for (const event of cluster) {
    let assignedColumn = -1;

    for (let col = 0; col < columnEndMinutes.length; col++) {
      if (columnEndMinutes[col] <= event.startMinutes) {
        assignedColumn = col;
        break;
      }
    }

    if (assignedColumn === -1) {
      assignedColumn = columnEndMinutes.length;
      columnEndMinutes.push(event.endMinutes);
    } else {
      columnEndMinutes[assignedColumn] = event.endMinutes;
    }

    columnOf.set(event.id, assignedColumn);
  }

  return columnOf;
};

export const computeEventLayout = (
  events: LayoutEvent[],
): Map<string, LayoutResult> => {
  const result = new Map<string, LayoutResult>();

  if (events.length === 0) return result;

  const clusters = buildClusters(events);

  for (const cluster of clusters) {
    const columnOf = assignColumns(cluster);

    const totalColumns =
      Math.max(...Array.from(columnOf.values())) + 1;

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

export const toLayoutEvent = (
  id: string,
  startsAt: Date,
  minutes: number,
): LayoutEvent => ({
  id,
  startMinutes:
    startsAt.getHours() * 60 + startsAt.getMinutes(),
  endMinutes:
    startsAt.getHours() * 60 +
    startsAt.getMinutes() +
    minutes,
});