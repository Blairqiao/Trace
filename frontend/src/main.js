import './styles/base.css';

import { SceneManager } from './scene/SceneManager.js';
import { GalaxyMesh } from './scene/GalaxyMesh.js';
import { InteractionManager } from './scene/InteractionManager.js';
import { initPanels, hideUploadPrompt, showUploadPrompt, maybeShowQuickStartModal } from './ui/panels.js';
import {
  initControls,
  readSettingsFromDOM,
  writeSettingsToDOM,
  refreshAllTooltips,
  setUploadState
} from './ui/controls.js';
import { updateGalaxyInfoPill, hideGalaxyInfoPill, updateDataPanelUI } from './ui/hud.js';
import { showTooltip, hideTooltip } from './ui/tooltip.js';
import { uploadHistory, recalculateGalaxy, recluster, verifySession } from './api/endpoints.js';
import {
  saveLocalData,
  loadLocalData,
  loadCameraState,
  loadUISettings
} from './utils/persistence.js';
import { QUICKSTART_FLAG_KEY } from './utils/constants.js';
import demoNodes from './assets/demo_galaxy.json';
import aboutMarkdown from './assets/ABOUT.md?raw';

// --- State Variables ---
let currentSessionId = null;
let isDemoMode = false;
let currentFidelity = null;

// 1. Initialize Scene & Mesh
const sm = new SceneManager(document.getElementById('canvas-container'));
const galaxy = new GalaxyMesh(sm.scene);
const interact = new InteractionManager(sm, galaxy);

// 2. Initialize UI Panels & Controls
initPanels(aboutMarkdown);
initControls({
  onFileUpload: (file) => processFileUpload(file),
  onRecalculate: () => doRecalculate(),
  onClearData: () => clearData(),
  onSizeChange: (v) => {
    galaxy.uniforms.uSize.value = v;
    interact.updateHitbox(v);
  },
  onIntensityChange: (v) => {
    galaxy.uniforms.uIntensity.value = 5 - v;
  },
  onOpacityChange: (v) => {
    galaxy.uniforms.uOpacity.value = v;
  },
  onSpreadChange: (v) => {
    galaxy.setSpread(v);
    interact.updateHitbox(galaxy.uniforms.uSize.value);
  },
  onAutoRotateChange: (v) => {
    sm.allowAutoRotate = v;
  },
  onRecluster: () => doRecluster()
});

// 3. Bind Interaction Callbacks
interact.onHover((data, x, y) => showTooltip(data, x, y));
interact.onHoverEnd(() => hideTooltip());
interact.onFlyTo((node) => sm.flyToNode(node, galaxy.spreadFactor));
interact.onFlyToEmpty(() => sm.flyForward(galaxy.spreadFactor));
interact.onOpenLink((url) => window.open(url, '_blank'));

// 4. Restore Saved Settings & Initialize Galaxy
function restoreVisualSettings() {
  const saved = loadUISettings();
  if (saved) {
    writeSettingsToDOM(saved);
    galaxy.uniforms.uSize.value = parseFloat(saved.size);
    galaxy.uniforms.uIntensity.value = 5 - parseFloat(saved.intensity);
    galaxy.uniforms.uOpacity.value = parseFloat(saved.opacity);
    galaxy.setSpread(parseFloat(saved.spread));
    sm.allowAutoRotate = Boolean(saved.autoRotate);
    interact.updateHitbox(parseFloat(saved.size));
    refreshAllTooltips();
  }
}

async function initGalaxy() {
  const savedGalaxy = await loadLocalData('userGalaxy');
  const savedSessionId = await loadLocalData('userSessionId');
  const savedFidelity = await loadLocalData('userFidelity');
  const savedFileName = localStorage.getItem('galaxyFileName');

  if (savedGalaxy) {
    currentSessionId = savedSessionId;
    currentFidelity = savedFidelity ?? null;
    const hasSeenQuickStart = await loadLocalData(QUICKSTART_FLAG_KEY);
    if (!hasSeenQuickStart) {
      await saveLocalData(QUICKSTART_FLAG_KEY, true);
    }
    hideUploadPrompt();
    updateDataPanelUI(savedFileName);
    galaxy.build(savedGalaxy);
    sm.centerCamera(savedGalaxy, galaxy.spreadFactor, 1.5);
    updateGalaxyInfoPill(savedGalaxy, currentFidelity, false);
  } else {
    showUploadPrompt();
    isDemoMode = true;
    currentFidelity = 96.2;
    demoNodes.forEach((node, i) => {
      node.id = i;
      node.title = 'Encrypted Node';
      node.url = '';
    });
    galaxy.build(demoNodes);
    updateGalaxyInfoPill(demoNodes, currentFidelity, true);

    sm.controls.enableZoom = false;
    sm.controls.enablePan = false;
    sm.controls.enableRotate = false;
    sm.controls.autoRotate = true;
    sm.centerCamera(demoNodes, galaxy.spreadFactor, 0.75);
  }
}

async function processFileUpload(file) {
  if (!file) return;
  setUploadState(true, 'Extracting Embeddings...');

  try {
    const fileText = await file.text();
    const json = await uploadHistory(fileText);

    currentFidelity = json.quality_score ?? null;
    await saveLocalData('userGalaxy', json.nodes);
    await saveLocalData('userSessionId', json.session_id);
    if (currentFidelity !== null) {
      await saveLocalData('userFidelity', currentFidelity);
    }

    localStorage.setItem('galaxyFileName', file.name);
    currentSessionId = json.session_id;

    updateDataPanelUI(file.name);
    hideUploadPrompt();
    setUploadState(false, 'Upload New History!');

    isDemoMode = false;
    sm.controls.enableZoom = true;
    sm.controls.enablePan = true;
    sm.controls.enableRotate = true;
    sm.controls.autoRotate = sm.allowAutoRotate;

    galaxy.dispose();
    galaxy.build(json.nodes);
    sm.centerCamera(json.nodes, galaxy.spreadFactor, 1.5);
    updateGalaxyInfoPill(json.nodes, currentFidelity, false);

    await maybeShowQuickStartModal();
  } catch (error) {
    console.error(error);
    alert('The backend is currently offline');
    setUploadState(false, 'The backend is currently offline');
  }
}

async function doRecalculate() {
  if (!currentSessionId) {
    alert('Please upload a file first!');
    return;
  }

  const btn = document.getElementById('btn-recalculate');
  if (btn) {
    btn.innerText = 'Recalculating...';
    btn.disabled = true;
  }

  try {
    const params = readSettingsFromDOM();
    const response = await recalculateGalaxy(currentSessionId, params);

    if (response.status === 404) {
      alert('Server memory cleared. Please re-upload your file.');
      return;
    }

    const json = await response.json();
    currentFidelity = json.quality_score ?? null;

    await saveLocalData('userGalaxy', json.nodes);
    if (currentFidelity !== null) {
      await saveLocalData('userFidelity', currentFidelity);
    }

    galaxy.build(json.nodes);
    sm.centerCamera(json.nodes, galaxy.spreadFactor, 1.5);
    updateGalaxyInfoPill(json.nodes, currentFidelity, false);
  } catch (error) {
    console.error(error);
    if (btn) btn.innerText = 'Error';
  } finally {
    if (btn) {
      btn.innerText = 'Recalculate Galaxy';
      btn.disabled = false;
    }
  }
}

async function doRecluster() {
  if (!galaxy.mesh || !currentSessionId) return;

  const params = readSettingsFromDOM();
  try {
    const json = await recluster(currentSessionId, params);
    galaxy.updateColors(json.nodes);
    updateGalaxyInfoPill(json.nodes, currentFidelity, isDemoMode);
  } catch (error) {
    console.error('Live Update Error:', error);
  }
}

function clearData() {
  hideGalaxyInfoPill();
  localStorage.clear();
  indexedDB.deleteDatabase('GalaxyDB');
  window.location.reload();
}

async function checkSessionHealth() {
  const sessionKey = await loadLocalData('userSessionId');
  if (!sessionKey) return;

  try {
    const response = await verifySession(sessionKey);
    if (response.status === 404) {
      const errorData = await response.json();
      if (errorData.detail === 'SESSION_EXPIRED') {
        console.warn('Proactive check failed. Wiping state.');
        clearData();
      }
    }
  } catch {
    console.log('Could not reach server to verify session.');
  }
}

// 5. Start Render Loop
function animate() {
  requestAnimationFrame(animate);
  sm.updateFlight();
  sm.updateAutoRotate(isDemoMode);
  sm.controls.update();
  const { isAnimating } = galaxy.animatePositions();
  interact.update(isAnimating, isDemoMode);
  sm.render();
}

// Boot
loadCameraState(sm.camera, sm.controls);
restoreVisualSettings();
initGalaxy();
animate();

window.addEventListener('DOMContentLoaded', checkSessionHealth);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    checkSessionHealth();
  }
});
