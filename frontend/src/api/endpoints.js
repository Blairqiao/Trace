import { apiFetch, apiFetchRaw } from './client.js';

export async function uploadHistory(fileText) {
  return apiFetch('/api/upload-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: fileText,
  });
}

export async function recalculateGalaxy(sessionId, params) {
  const qs = new URLSearchParams({
    session_id: sessionId,
    max_items: params.max_items,
    n_neighbors: params.n_neighbors,
    min_dist: params.min_dist,
    seed: params.seed,
    eps: params.eps,
    min_samples: params.min_samples,
  }).toString();

  return apiFetchRaw(`/api/recalculate?${qs}`, { method: 'POST' });
}

export async function recluster(sessionId, params) {
  const qs = new URLSearchParams({
    session_id: sessionId,
    max_items: params.max_items,
    eps: params.eps,
    min_samples: params.min_samples,
  }).toString();

  return apiFetch(`/api/recluster?${qs}`);
}

export async function verifySession(sessionKey) {
  return apiFetchRaw('/api/verify-session', {
    headers: {
      'Authorization': `Bearer ${sessionKey}`
    }
  });
}
