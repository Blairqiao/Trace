import { formatChromeTimestamp } from '../utils/helpers.js';

const tooltip = document.getElementById('tooltip');
const clusterEl = document.getElementById('tt-cluster');
const titleEl = document.getElementById('tt-title');
const dateEl = document.getElementById('tt-date');

export function showTooltip(nodeData, screenX, screenY) {
  if (!tooltip || !nodeData) return;

  if (clusterEl) {
    clusterEl.innerText = nodeData.cluster === -1 ? 'Isolated Search' : `Cluster ${nodeData.cluster}`;
  }

  if (titleEl) {
    titleEl.innerText = nodeData.title || '';
  }

  if (dateEl) {
    dateEl.innerText = formatChromeTimestamp(nodeData.timestamp);
  }

  tooltip.style.left = `${screenX}px`;
  tooltip.style.top = `${screenY}px`;
  tooltip.style.opacity = '1';
  document.body.style.cursor = 'pointer';
}

export function hideTooltip() {
  if (!tooltip) return;
  tooltip.style.opacity = '0';
  document.body.style.cursor = 'default';
}
