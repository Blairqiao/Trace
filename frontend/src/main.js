import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { saveLocalData, loadLocalData } from './db.js';
import demoNodes from './assets/demo_galaxy.json';
import { marked } from 'marked';
import aboutMarkdown from './assets/ABOUT.md?raw';

// --- Scene Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050505, 0.05);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 35); 

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.addEventListener('end', saveCameraState);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = true;
controls.autoRotate = false;
controls.autoRotateSpeed = 0.3;
controls.minDistance = 0.3;


function saveCameraState() {
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

function loadCameraState() {
  const saved = localStorage.getItem('galaxyCameraState');
  if (!saved) return; 

  const state = JSON.parse(saved);
  
  camera.position.set(state.posX, state.posY, state.posZ);
  
  controls.target.set(state.tarX, state.tarY, state.tarZ);
  
  controls.update(); 
}

// --- Globals & State Mechanics ---
let pointCloud = null;
let currentSessionId = null;
let isDemoMode = false;
let node_count = 1500;
let nodeData = []; 
const colors = [
  0xff0a54, 0x00f5d4, 0xffca3a, 0x3377aa, 0x9b5de5,
  0x448855, 0xff9f1c, 0x664488, 0x8ac926, 0x00bbf9,
  0xaa6633, 0xf15bb5, 0x556688, 0xf9c74f, 0xef233c,
  0x48cae4, 0x7f4f24, 0x00ffaa, 0x3a0ca3, 0xfb8500,
  0x6d597a, 0xfee440, 0x386641, 0x0077b6, 0xff477e,
  0x40916c, 0x5a189a, 0x9c6644, 0x90e0ef, 0xb5179e,
  0x887744, 0x06d6a0, 0x775566, 0xf3722c, 0x3d5a80,
  0xaa5566, 0x43aa8b, 0x8338ec, 0x4a5759, 0xf94144
];

let isFlying = false;
let currentFlightSpeed = 0.05;
let defaultFlightSpeed = 0.05;
const targetCameraPos = new THREE.Vector3();
const targetControlsPos = new THREE.Vector3();
let isTransitioningCamera = false;
const centertargetCameraPos = new THREE.Vector3();
const centertargetControlsPos = new THREE.Vector3();

let lastInputTime = Date.now();
const IDLE_TIMEOUT = 5000;
const QUICKSTART_FLAG_KEY = 'hasSeenQuickStart';

const resetIdleTimer = () => {
  lastInputTime = Date.now();
  if (controls.autoRotate) controls.autoRotate = false;
};

function formatChromeTimestamp(timeUsec) {
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

function setModalVisibility(modalId, isVisible) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.toggle('hidden', !isVisible);
}

function setToggleActive(toggleId, isActive) {
  const toggle = document.getElementById(toggleId);
  if (!toggle) return;
  toggle.classList.toggle('open', isActive);
}

function closeAllOverlays() {
  document.getElementById('settings-panel').classList.remove('open');
  document.getElementById('settings-toggle').classList.remove('open');
  document.getElementById('data-panel').classList.remove('open');
  document.getElementById('data-toggle').classList.remove('open');
  setModalVisibility('about-modal', false);
  setModalVisibility('quickstart-modal', false);
  setToggleActive('about-toggle', false);
  setToggleActive('quickstart-toggle', false);
}

function renderMarkdown(target, markdown) {
  if (!target) return;
  target.innerHTML = marked.parse(markdown);
}

function openAboutModal() {
  closeAllOverlays();
  setModalVisibility('about-modal', true);
  setToggleActive('about-toggle', true);
}

function openQuickStartModal() {
  closeAllOverlays();
  setModalVisibility('quickstart-modal', true);
  setToggleActive('quickstart-toggle', true);
}

async function markQuickStartSeen() {
  await saveLocalData(QUICKSTART_FLAG_KEY, true);
}

async function maybeShowQuickStartModal() {
  const hasSeenQuickStart = await loadLocalData(QUICKSTART_FLAG_KEY);
  if (hasSeenQuickStart) return;

  requestAnimationFrame(() => {
    openQuickStartModal();
  });

  await markQuickStartSeen();
}

// Settings Panel
document.getElementById('settings-toggle').addEventListener('click', () => {
  document.getElementById('data-panel').classList.remove('open');
  document.getElementById('data-toggle').classList.remove('open') ;
  setModalVisibility('about-modal', false);
  setModalVisibility('quickstart-modal', false);
  document.getElementById('settings-panel').classList.toggle('open');
  document.getElementById('settings-toggle').classList.toggle('open');
});

document.getElementById('about-toggle').addEventListener('click', () => {
  const aboutModal = document.getElementById('about-modal');
  const shouldOpen = aboutModal.classList.contains('hidden');
  if (shouldOpen) {
    openAboutModal();
  } else {
    setModalVisibility('about-modal', false);
    setToggleActive('about-toggle', false);
  }
});

document.getElementById('quickstart-toggle').addEventListener('click', () => {
  const quickstartModal = document.getElementById('quickstart-modal');
  const shouldOpen = quickstartModal.classList.contains('hidden');
  if (shouldOpen) {
    openQuickStartModal();
  } else {
    setModalVisibility('quickstart-modal', false);
    setToggleActive('quickstart-toggle', false);
  }
});

document.addEventListener('click', (e) => {
  const isAboutModalOpen = !document.getElementById('about-modal').classList.contains('hidden');
  const clickedAboutOutside = !document.getElementById('about-modal').contains(e.target);
  const clickedAboutToggle = document.getElementById('about-toggle').contains(e.target);

  const isQuickStartModalOpen = !document.getElementById('quickstart-modal').classList.contains('hidden');
  const clickedQuickStartOutside = !document.getElementById('quickstart-modal').contains(e.target);
  const clickedQuickStartToggle = document.getElementById('quickstart-toggle').contains(e.target);
  

  if (isAboutModalOpen && clickedAboutOutside && !clickedAboutToggle) {
    setModalVisibility('about-modal', false);
    setToggleActive('about-toggle', false);
  }
  if (isQuickStartModalOpen && clickedQuickStartOutside && !clickedQuickStartToggle) {
    setModalVisibility('quickstart-modal', false);
    setToggleActive('quickstart-toggle', false);
  }
});

document.getElementById('btn-fullscreen').addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.error(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
});

function saveUISettings() {
  const settings = {
    max_items: document.getElementById('val-limit').value,
    n_neighbors: document.getElementById('val-neighbors').value,
    min_dist: document.getElementById('val-dist').value,
    seed: document.getElementById('val-seed').value,
    eps: document.getElementById('val-eps').value,
    min_samples: document.getElementById('val-samples').value,
    size: document.getElementById('val-size').value,
    intensity: document.getElementById('val-intensity').value,
    opacity: document.getElementById('val-opacity').value,
    spread: document.getElementById('val-spread').value,
    autoRotate: document.getElementById('toggle-sleep-rotate').checked
  };
  
  localStorage.setItem('galaxyVisualSettings', JSON.stringify(settings));
}

function loadUISettings() {
  const saved = localStorage.getItem('galaxyVisualSettings');
  if (!saved) return; 

  const settings = JSON.parse(saved);
  document.getElementById('val-limit').value = settings.max_items;
  document.getElementById('val-neighbors').value = settings.n_neighbors;
  document.getElementById('val-dist').value = settings.min_dist;
  document.getElementById('val-seed').value = settings.seed;
  document.getElementById('val-eps').value = settings.eps;
  document.getElementById('val-samples').value = settings.min_samples;
  document.getElementById('val-size').value = settings.size;
  document.getElementById('val-intensity').value = settings.intensity;
  document.getElementById('val-opacity').value = settings.opacity;
  document.getElementById('val-spread').value = settings.spread;
  document.getElementById('toggle-sleep-rotate').checked = settings.autoRotate;

  shaderUniforms.uSize.value = parseFloat(settings.size);
  shaderUniforms.uIntensity.value = 5 - parseFloat(settings.intensity);
  shaderUniforms.uOpacity.value = parseFloat(settings.opacity);
  spreadFactor = parseFloat(settings.spread);
  allowAutoRotate = settings.autoRotate;

  updateAllTooltips(); 
}

function updateAllTooltips() {
  const event = new Event('input');
  document.getElementById('val-limit').dispatchEvent(event);
  document.getElementById('val-neighbors').dispatchEvent(event);
  document.getElementById('val-dist').dispatchEvent(event);
  document.getElementById('val-seed').dispatchEvent(event);
  document.getElementById('val-eps').dispatchEvent(event);
  document.getElementById('val-samples').dispatchEvent(event);
  document.getElementById('val-size').dispatchEvent(event);
  document.getElementById('val-intensity').dispatchEvent(event);
  document.getElementById('val-opacity').dispatchEvent(event);
  document.getElementById('val-spread').dispatchEvent(event);
}

// Slider Tooltip
const sliderWrappers = document.querySelectorAll('.slider-wrapper');

sliderWrappers.forEach(wrapper => {
  const slider = wrapper.querySelector('input[type="range"]');
  const tooltip = wrapper.querySelector('.slider-tooltip');

  const updateTooltip = () => {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);

    tooltip.innerText = val;

    const percent = (val - min) / (max - min);

    const thumbWidth = 12; 
    const offset = (0.5 - percent) * thumbWidth;

    tooltip.style.left = `calc(${percent * 100}% + ${offset}px)`;
  };

  slider.addEventListener('input', updateTooltip);
  
  updateTooltip();
});

// Data Panel
document.getElementById('data-toggle').addEventListener('click', () => {
  document.getElementById('settings-panel').classList.remove('open');
  document.getElementById('settings-toggle').classList.remove('open') ;
  setModalVisibility('about-modal', false);
  setModalVisibility('quickstart-modal', false);
  document.getElementById('data-panel').classList.toggle('open');
  document.getElementById('data-toggle').classList.toggle('open');
});

// Auto-Rotate Logic
let allowAutoRotate = true;
document.getElementById('toggle-sleep-rotate').addEventListener('change', (e) => {
  allowAutoRotate = e.target.checked;
});

// --- Live Parameters ---
let spreadFactor = parseFloat(document.getElementById('val-spread').value);

const shaderUniforms = {
  uSize: { value: parseFloat(document.getElementById('val-size').value) },
  uIntensity: { value: 5 - parseFloat(document.getElementById('val-intensity').value) },
  uOpacity: { value: parseFloat(document.getElementById('val-opacity').value) }
};
// Settings Listeners
document.getElementById('val-limit').addEventListener('input', saveUISettings);
document.getElementById('val-neighbors').addEventListener('input', saveUISettings);
document.getElementById('val-dist').addEventListener('input', saveUISettings);
document.getElementById('val-seed').addEventListener('input', saveUISettings);

document.getElementById('val-size').addEventListener('input', (e) => {
  shaderUniforms.uSize.value = parseFloat(e.target.value);
  updateHitbox();
  saveUISettings();
});
document.getElementById('val-intensity').addEventListener('input', (e) => {
  shaderUniforms.uIntensity.value = 5 - parseFloat(e.target.value);
  saveUISettings();
});
document.getElementById('val-opacity').addEventListener('input', (e) => {
  shaderUniforms.uOpacity.value = parseFloat(e.target.value);
  saveUISettings();
});

document.getElementById('val-spread').addEventListener('input', (e) => {
  spreadFactor = parseFloat(e.target.value);
  if (pointCloud) {
    pointCloud.scale.set(spreadFactor, spreadFactor, spreadFactor);
    updateHitbox();
  }
  saveUISettings();
});


renderer.domElement.addEventListener('mousemove', resetIdleTimer);
renderer.domElement.addEventListener('mousedown', resetIdleTimer);
renderer.domElement.addEventListener('wheel', resetIdleTimer);
renderer.domElement.addEventListener('keydown', resetIdleTimer);

const getClusterColorHex = (clusterId) => {
  if (clusterId === -1) return 0x888888;
  return colors[clusterId % colors.length];
};

// --- Custom Neon Shader Definitions ---
const vertexShader = `
  uniform float uSize;
  attribute vec3 customColor;
  varying vec3 vColor;
  void main() {
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (10.0 / -mvPosition.z);
    // gl_PointSize = 512;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform float uIntensity;
  uniform float uOpacity;
  varying vec3 vColor;
  
  void main() {
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    float distance = length(xy);
    if(distance > 0.5) discard;
    float core = 1.0 - smoothstep(0.12, 0.15, distance);
    float glow = 1.0 - (distance * 2.0);
    glow = pow(glow, uIntensity); 
    float finalAlpha = max(core, glow);
    gl_FragColor = vec4(vColor, finalAlpha * uOpacity);
  }
`;

// --- Data Pipeline ---

// Build Demo Galaxy
function buildDemoGalaxy() {
  isDemoMode = true;
  
  // Add dummy text back in just to satisfy the renderer's requirements
  demoNodes.forEach((node, i) => {
    node.id = i;
    node.title = "Encrypted Node"; 
    node.url = "";
  });

  buildThreeJsScene(demoNodes);

  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableRotate = false;
  controls.autoRotate = true;
  
  centerCamera(0.75);

}

async function initGalaxy() {
  const savedGalaxy = await loadLocalData('userGalaxy');
  const savedSessionId = await loadLocalData('userSessionId');
  const savedFileName = localStorage.getItem('galaxyFileName');
  
  if (savedGalaxy) {
    currentSessionId = savedSessionId;
    const hasSeenQuickStart = await loadLocalData(QUICKSTART_FLAG_KEY);
    if (!hasSeenQuickStart) {
      await markQuickStartSeen();
    }
    document.getElementById('upload-prompt').style.display = 'none';
    updateDataPanelUI(savedFileName);
    buildThreeJsScene(savedGalaxy);
  } else {;
    document.getElementById('upload-prompt').style.display = 'block';
    buildDemoGalaxy();
  }
}


// Load New Data
async function processFileUpload(file) {
  if (!file) return;
  
  const btn = document.getElementById('btn-recalculate');
  btn.disabled = true;
  const emptyStateLabel = document.querySelector('label[for="file-upload"]');
  const emptyStateInput = document.getElementById('file-upload');
  
  const sidePanelLabel = document.querySelector('label[for="data-panel-upload"]');
  const sidePanelInput = document.getElementById('data-panel-upload');
  
  emptyStateLabel.textContent = "Extracting Embeddings...";
  emptyStateLabel.classList.add('disabled');
  emptyStateInput.disabled = true;
  
  sidePanelLabel.textContent = "Extracting Embeddings...";
  sidePanelLabel.classList.add('disabled');
  sidePanelInput.disabled = true;

  try {
    const fileText = await file.text();

    const response = await fetch('https://api.trace-app.net/api/upload-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: fileText,
    });

    if (!response.ok) throw new Error("Server rejected the upload.");

    const json = await response.json();
    
    await saveLocalData('userGalaxy', json.nodes);
    await saveLocalData('userSessionId', json.session_id);
    
    localStorage.setItem('galaxyFileName', file.name);
    
    currentSessionId = json.session_id;
    
    updateDataPanelUI(file.name);
    document.getElementById('upload-prompt').style.display = 'none';
    sidePanelLabel.textContent = "Upload New History!";

    isDemoMode = false;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.autoRotate = allowAutoRotate;
    
    if (pointCloud) {
      scene.remove(pointCloud);
      pointCloud.geometry.dispose();
      pointCloud.material.dispose();
      pointCloud = null;
    }
    
    buildThreeJsScene(json.nodes);

    await maybeShowQuickStartModal();

  } catch (error) {
    console.error(error);
    emptyStateLabel.textContent = "Upload Failed";
    sidePanelLabel.textContent = "Upload Failed";
    alert("Upload failed.");
  } finally {
    btn.disabled = false;
    
    emptyStateLabel.classList.remove('disabled');
    emptyStateInput.disabled = false;
    
    sidePanelLabel.classList.remove('disabled');
    sidePanelInput.disabled = false;
    
    emptyStateInput.value = '';
    sidePanelInput.value = '';
  }
}
document.getElementById('file-upload').addEventListener('change', (e) => {
  processFileUpload(e.target.files[0]);
});

document.getElementById('data-panel-upload').addEventListener('change', (e) => {
  processFileUpload(e.target.files[0]);
});

// Data Status
function updateDataPanelUI(fileName) {
  const statusText = document.getElementById('current-file-name');
  const statusDot = document.querySelector('.status-dot');
  
  if (fileName) {
    statusText.innerText = `Active: ${fileName}`;
    statusDot.classList.add('active');
  } else {
    statusText.innerText = "No data loaded";
    statusDot.classList.remove('active');
  }
}

// Clear Data
function clearData() {
  localStorage.clear();
  indexedDB.deleteDatabase('GalaxyDB');
  window.location.reload(); 
}

document.getElementById('btn-clear-data').addEventListener('click', () => {
  const confirmWipe = confirm("This will permanently delete your saved 3D map and reset the app. Continue?");
  if (confirmWipe) {
    clearData();
  }
});

// Recalculate Galaxy with new parameters
async function recalculateGalaxy() {
  if (!currentSessionId) {
    alert("Please upload a file first!");
    return;
  }

  const btn = document.getElementById('btn-recalculate');
  btn.innerText = "Recalculating...";
  btn.disabled = true;

  try {
    const max_items = document.getElementById('val-limit').value;
    const n_neighbors = document.getElementById('val-neighbors').value;
    const min_dist = document.getElementById('val-dist').value;
    const seed = document.getElementById('val-seed').value;
    const eps = document.getElementById('val-eps').value;
    const min_samples = document.getElementById('val-samples').value;

    const url = `https://api.trace-app.net/api/recalculate?session_id=${currentSessionId}&max_items=${max_items}&n_neighbors=${n_neighbors}&min_dist=${min_dist}&seed=${seed}&eps=${eps}&min_samples=${min_samples}`;
    
    const response = await fetch(url, { method: 'POST' });
    
    if (response.status === 404) {
       alert("Server memory cleared. Please re-upload your file.");
       return;
    }
    
    const json = await response.json();
    node_count = max_items;
    
    await saveLocalData('userGalaxy', json.nodes);
    
    buildThreeJsScene(json.nodes);

  } catch (error) {
    console.error(error);
    btn.innerText = "Error";
  } finally {
    btn.innerText = "Recalculate Galaxy";
    btn.disabled = false;
  }
}

document.getElementById('btn-recalculate').addEventListener('click', recalculateGalaxy);

function buildThreeJsScene(nodes) {
  if (pointCloud && pointCloud.geometry.attributes.position.count === nodes.length) {
    
    nodeData = nodes;

    const colorsAttr = pointCloud.geometry.attributes.customColor;
    const colorObj = new THREE.Color();

    nodeData.forEach((dataPoint, i) => {
      colorObj.setHex(getClusterColorHex(dataPoint.cluster));
      colorsAttr.setXYZ(i, colorObj.r, colorObj.g, colorObj.b);
    });

    colorsAttr.needsUpdate = true;
    centerCamera(1.5);
    resetIdleTimer();
    
    return; 
  }

  if (pointCloud) {
    scene.remove(pointCloud);
    pointCloud.geometry.dispose();
    pointCloud.material.dispose();
  }

  nodeData = nodes;

  const positions = [];
  const colorArray = [];
  const colorObj = new THREE.Color();

  nodeData.forEach((dataPoint) => {

    positions.push(dataPoint.x, dataPoint.y, dataPoint.z);
    colorObj.setHex(getClusterColorHex(dataPoint.cluster));
    colorArray.push(colorObj.r, colorObj.g, colorObj.b);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('customColor', new THREE.Float32BufferAttribute(colorArray, 3));

  const material = new THREE.ShaderMaterial({
    uniforms: shaderUniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    depthWrite: false, 
    blending: THREE.AdditiveBlending 
  });

  pointCloud = new THREE.Points(geometry, material);
  pointCloud.scale.set(spreadFactor, spreadFactor, spreadFactor);
  scene.add(pointCloud);

  centerCamera(1.5);
  

  resetIdleTimer();
}

function centerCamera(zoomLevel) {
  if (!nodeData || nodeData.length === 0) return;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < nodeData.length; i++) {
    const p = nodeData[i];
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
    if (p.z > maxZ) maxZ = p.z;
  }

  const centerX = ((minX + maxX) / 2) * spreadFactor;
  const centerY = ((minY + maxY) / 2) * spreadFactor;
  const centerZ = ((minZ + maxZ) / 2) * spreadFactor;

  const radiusX = (maxX - minX) / 2;
  const radiusY = (maxY - minY) / 2;
  const radiusZ = (maxZ - minZ) / 2;
  const maxRadius = Math.max(radiusX, radiusY, radiusZ); 

  const zoomDistance = maxRadius * spreadFactor * zoomLevel;

  centertargetControlsPos.set(centerX, centerY, centerZ);
  centertargetCameraPos.set(centerX, centerY, centerZ + zoomDistance);
  
  isTransitioningCamera = true;
}


function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

async function liveUpdateColors() {
  if (!pointCloud || !currentSessionId) return;

  const max_items = node_count;
  const eps = document.getElementById('val-eps').value;
  const min_samples = document.getElementById('val-samples').value;

  try {
    const url = `https://api.trace-app.net/api/recluster?session_id=${currentSessionId}&max_items=${max_items}&eps=${eps}&min_samples=${min_samples}`;

    const response = await fetch(url);
    const json = await response.json();

    const colorsAttr = pointCloud.geometry.attributes.customColor;
    const colorObj = new THREE.Color();

    json.nodes.forEach((dataPoint, i) => {
      nodeData[i].cluster = dataPoint.cluster; 
      
      colorObj.setHex(getClusterColorHex(dataPoint.cluster));
      colorsAttr.setXYZ(i, colorObj.r, colorObj.g, colorObj.b);
    });

    colorsAttr.needsUpdate = true;

  } catch (error) {
    console.error("Live Update Error:", error);
  }
}

const debouncedLiveUpdate = debounce(liveUpdateColors, 150);

document.getElementById('val-eps').addEventListener('input', (e) => {
  debouncedLiveUpdate();
  saveUISettings();
});
document.getElementById('val-samples').addEventListener('input', (e) => {
  debouncedLiveUpdate();
  saveUISettings();
});

// --- Raycasting & Navigation Actions ---
const raycaster = new THREE.Raycaster();

const updateHitbox = () => {
  raycaster.params.Points.threshold = 0.0015 * shaderUniforms.uSize.value;
};
updateHitbox();

function createForcefieldTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  // Draw a soft, filled radial gradient
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');   // Solid core
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');  // Soft mid-glow
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');   // Faded transparent edge
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  
  return new THREE.CanvasTexture(canvas);
}

const forcefieldMat = new THREE.SpriteMaterial({ 
  map: createForcefieldTexture(), 
  color: 0xffffff,
  transparent: true,
  opacity: 0.4,
  blending: THREE.AdditiveBlending, 
  depthWrite: false
});

const forcefieldSprite = new THREE.Sprite(forcefieldMat);
forcefieldSprite.visible = false;
scene.add(forcefieldSprite);

const mouse = new THREE.Vector2();
const tooltip = document.getElementById('tooltip');
let hoveredId = null;

renderer.domElement.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  tooltip.style.left = event.clientX + 'px';
  tooltip.style.top = event.clientY + 'px';
});

renderer.domElement.addEventListener('dblclick', () => {
  if (isDemoMode) return;
  resetIdleTimer();
  if (hoveredId !== null) {
    const targetData = nodeData[hoveredId];
    
    const finalPos = new THREE.Vector3(
      targetData.x * spreadFactor, 
      targetData.y * spreadFactor, 
      targetData.z * spreadFactor
    );

    targetControlsPos.copy(finalPos);

    const sightline = new THREE.Vector3().subVectors(camera.position, finalPos).normalize();
    const currentDistance = camera.position.distanceTo(finalPos);    
    const parkDistance = Math.max(currentDistance * 0.1, controls.minDistance);
    
    targetCameraPos.copy(finalPos).add(sightline.multiplyScalar(parkDistance));
    
    isFlying = true;
    currentFlightSpeed = defaultFlightSpeed;
  } else {
    raycaster.setFromCamera(mouse, camera);
    const forwardVector = new THREE.Vector3();
    camera.getWorldDirection(forwardVector);
    forwardVector.normalize().multiplyScalar(4 * spreadFactor); 
    
    targetCameraPos.copy(camera.position).add(forwardVector);
    targetControlsPos.copy(controls.target).add(forwardVector);
    isFlying = true;
    currentFlightSpeed = defaultFlightSpeed;
  }
});

renderer.domElement.addEventListener('auxclick', (event) => {
  if (event.button === 1 && hoveredId !== null && nodeData[hoveredId].url) {
    window.open(nodeData[hoveredId].url, '_blank');
  }
});

renderer.domElement.addEventListener('mousedown', (event) => {
  if (event.button === 0 && (event.ctrlKey || event.metaKey) && hoveredId !== null ) {
    window.open(nodeData[hoveredId].url, '_blank');
  }
});

// --- Loop ---
function animate() {
  requestAnimationFrame(animate);

  if (isFlying) {
    controls.enabled = false;
    currentFlightSpeed = Math.min(currentFlightSpeed + 0.005, 0.1);
    camera.position.lerp(targetCameraPos, currentFlightSpeed);
    controls.target.lerp(targetControlsPos, currentFlightSpeed);
    
    if (camera.position.distanceTo(targetCameraPos) < 0.02 && controls.target.distanceTo(targetControlsPos) < 0.02) {
      camera.position.copy(targetCameraPos);
      controls.target.copy(targetControlsPos);
      isFlying = false;
      controls.enabled = true; 
    }
  } else {
    if (isDemoMode) {
      controls.autoRotate = true;
    } else {
      if (Date.now() - lastInputTime > IDLE_TIMEOUT && allowAutoRotate) {
        controls.autoRotate = true;
      } else {
        controls.autoRotate = false;
      }
    }
    
  }

  if (isTransitioningCamera) {
    camera.position.lerp(centertargetCameraPos, 0.05);
    controls.target.lerp(centertargetControlsPos, 0.05);

    if (camera.position.distanceTo(centertargetCameraPos) < 0.5) {
      isTransitioningCamera = false;
    }
  }

  controls.update();

  if (pointCloud) {
    
    const positions = pointCloud.geometry.attributes.position.array;
    let geometryNeedsUpdate = false;
    let isAnimating = false;

    for (let i = 0; i < nodeData.length; i++) {
      const idx = i * 3;
      
      const targetX = nodeData[i].x;
      const targetY = nodeData[i].y;
      const targetZ = nodeData[i].z;

      const curX = positions[idx];
      const curY = positions[idx + 1];
      const curZ = positions[idx + 2];

      const diffX = targetX - curX;
      const diffY = targetY - curY;
      const diffZ = targetZ - curZ;

      if (Math.abs(diffX) > 0.0001 || Math.abs(diffY) > 0.0001 || Math.abs(diffZ) > 0.0001) {
        positions[idx] += diffX * 0.05;
        positions[idx + 1] += diffY * 0.05;
        positions[idx + 2] += diffZ * 0.05;
        geometryNeedsUpdate = true;
        isAnimating = true;
      } else {
        if (curX !== targetX || curY !== targetY || curZ !== targetZ) {
          positions[idx] = targetX;
          positions[idx + 1] = targetY;
          positions[idx + 2] = targetZ;
          geometryNeedsUpdate = true;
        }
      }
    }

    if (geometryNeedsUpdate) {
      pointCloud.geometry.attributes.position.needsUpdate = true;
      pointCloud.geometry.computeBoundingSphere();
    }

    if (isAnimating || isDemoMode || controls.autoRotate) {
      if (hoveredId !== null) {
        hoveredId = null;
        if (tooltip) tooltip.style.opacity = 0;
        document.body.style.cursor = 'default';
        forcefieldSprite.visible = false;
      }
    } else {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(pointCloud);
      
      if (intersects.length > 0) {
        const targetIndex = intersects[0].index;
        if (hoveredId !== targetIndex) {
          hoveredId = targetIndex;
          const ud = nodeData[targetIndex];
          
          document.getElementById('tt-cluster').innerText = ud.cluster === -1 ? 'Isolated Search' : `Cluster ${ud.cluster}`;
          document.getElementById('tt-title').innerText = ud.title;
          document.getElementById('tt-date').innerText = formatChromeTimestamp(ud.timestamp);
          tooltip.style.opacity = 1;
          document.body.style.cursor = 'pointer';

          forcefieldSprite.position.set(ud.x, ud.y, ud.z);
          forcefieldSprite.position.multiplyScalar(spreadFactor);
          forcefieldSprite.visible = true;
        }
        const baseScale = shaderUniforms.uSize.value * 0.005;
        forcefieldSprite.scale.set(baseScale, baseScale, 1);

      } else {
        if (hoveredId !== null) {
          hoveredId = null;
          tooltip.style.opacity = 0;
          document.body.style.cursor = 'default';
          forcefieldSprite.visible = false;
        }
      }
    }
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Check Session Health
async function checkSessionHealth() {
  const sessionKey = await loadLocalData('userSessionId');
  
  if (!sessionKey) return; 

  try {
    const response = await fetch('https://api.trace-app.net/api/verify-session', {
      headers: {
        'Authorization': `Bearer ${sessionKey}`
      }
    });

    if (response.status === 404) {
      const errorData = await response.json();
      if (errorData.detail === "SESSION_EXPIRED") {
        console.warn("Proactive check failed. Wiping state.");
        clearData();
      }
    }
  } catch (error) {
    console.log("Could not reach server to verify session.");
  }
}

window.addEventListener('DOMContentLoaded', checkSessionHealth);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    console.log("Tab is active again, checking session health...");
    checkSessionHealth();
  }
});


loadCameraState();
loadUISettings();
renderMarkdown(document.getElementById('about-modal-content'), aboutMarkdown);
initGalaxy();

animate();


