import { COLORS } from './constants.js';

export function formatChromeTimestamp(timeUsec) {
  if (!timeUsec || timeUsec === 0) return "Unknown Date";

  const chromeMs = timeUsec / 1000;
  const unixMs = chromeMs;
  const date = new Date(unixMs);

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

export function getClusterColorHex(clusterId) {
  if (clusterId === -1 || clusterId === undefined || clusterId === null) return 0x888888;
  return COLORS[Math.abs(clusterId) % COLORS.length];
}
