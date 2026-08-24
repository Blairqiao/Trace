const DB_NAME = 'GalaxyDB';
const STORE_NAME = 'HistoryStore';

async function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalData(key, data) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(data, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadLocalData(key) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function saveCameraState(camera, controls) {
  if (!camera || !controls) return;
  const cameraState = {
    posX: camera.position.x,
    posY: camera.position.y,
    posZ: camera.position.z,
    tarX: controls.target.x,
    tarY: controls.target.y,
    tarZ: controls.target.z
  };
  localStorage.setItem('galaxyCameraState', JSON.stringify(cameraState));
}

export function loadCameraState(camera, controls) {
  const saved = localStorage.getItem('galaxyCameraState');
  if (!saved || !camera || !controls) return;

  try {
    const state = JSON.parse(saved);
    camera.position.set(state.posX, state.posY, state.posZ);
    controls.target.set(state.tarX, state.tarY, state.tarZ);
    controls.update();
  } catch (e) {
    console.error("Failed to parse saved camera state", e);
  }
}

export function saveUISettings(settings) {
  localStorage.setItem('galaxyVisualSettings', JSON.stringify(settings));
}

export function loadUISettings() {
  const saved = localStorage.getItem('galaxyVisualSettings');
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to parse saved visual settings", e);
    return null;
  }
}
