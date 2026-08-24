const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = new Error(`API request failed with status ${response.status}`);
    error.status = response.status;
    try {
      error.data = await response.json();
    } catch {
      // Body not JSON
    }
    throw error;
  }
  return response.json();
}

export async function apiFetchRaw(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  return fetch(url, options);
}
