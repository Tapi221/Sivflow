import { sanitizeStreak } from '@/utils/streak';

const isDevEnvironment = (() => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return Boolean(import.meta.env.DEV);
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV !== 'production';
  }
  return false;
})();

const parseDebugStreakValue = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }

  return sanitizeStreak(numeric);
};

export const getDebugStreak = (): number | null => {
  if (!isDevEnvironment || typeof window === 'undefined') {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const fromQuery = parseDebugStreakValue(searchParams.get('debugStreak'));
  if (fromQuery !== null) {
    return fromQuery;
  }

  return parseDebugStreakValue(window.localStorage.getItem('debug_streak'));
};
