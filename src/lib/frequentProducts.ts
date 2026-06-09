const PINNED_KEY = 'holodos-pinned-products';
const ACTIVITY_KEY = 'holodos-product-activity';

export const MAX_FREQUENT = 8;
const MIN_AUTO_COUNT = 2;

interface ActivityEntry {
  count: number;
  lastAt: number;
}

function readPinned(): string[] {
  try {
    const stored = localStorage.getItem(PINNED_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function writePinned(ids: string[]): void {
  localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
}

function readActivity(): Record<string, ActivityEntry> {
  try {
    const stored = localStorage.getItem(ACTIVITY_KEY);
    return stored ? (JSON.parse(stored) as Record<string, ActivityEntry>) : {};
  } catch {
    return {};
  }
}

function writeActivity(activity: Record<string, ActivityEntry>): void {
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
}

export function recordProductActivity(productId: string): void {
  const activity = readActivity();
  const entry = activity[productId] ?? { count: 0, lastAt: 0 };

  activity[productId] = {
    count: entry.count + 1,
    lastAt: Date.now(),
  };

  writeActivity(activity);
}

export function removeProductTracking(productId: string): void {
  const activity = readActivity();
  delete activity[productId];
  writeActivity(activity);
  writePinned(readPinned().filter((id) => id !== productId));
}

export function isProductPinned(productId: string): boolean {
  return readPinned().includes(productId);
}

export function toggleProductPin(
  productId: string,
): { isPinned: boolean; error: string | null } {
  const pinned = readPinned();
  const index = pinned.indexOf(productId);

  if (index >= 0) {
    pinned.splice(index, 1);
    writePinned(pinned);
    return { isPinned: false, error: null };
  }

  if (pinned.length >= MAX_FREQUENT) {
    return {
      isPinned: false,
      error: `Можно закрепить не больше ${MAX_FREQUENT} продуктов`,
    };
  }

  writePinned([productId, ...pinned]);
  return { isPinned: true, error: null };
}

export function getFrequentProductIds(availableIds: string[]): string[] {
  const available = new Set(availableIds);
  const pinned = readPinned().filter((id) => available.has(id));
  const activity = readActivity();

  const autoCandidates = Object.entries(activity)
    .filter(
      ([id, entry]) =>
        available.has(id) &&
        entry.count >= MIN_AUTO_COUNT &&
        !pinned.includes(id),
    )
    .sort((a, b) => {
      if (b[1].count !== a[1].count) {
        return b[1].count - a[1].count;
      }

      return b[1].lastAt - a[1].lastAt;
    })
    .map(([id]) => id);

  const merged: string[] = [];

  for (const id of [...pinned, ...autoCandidates]) {
    if (!merged.includes(id) && merged.length < MAX_FREQUENT) {
      merged.push(id);
    }
  }

  return merged;
}
