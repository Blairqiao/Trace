import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = true;
controls.autoRotate = false;
controls.autoRotateSpeed = 0.4;
controls.minDistance = 0.3;

// --- Globals & State Mechanics ---
let pointCloud = null;
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

// Settings Panel
document.getElementById('settings-toggle').addEventListener('click', () => {
  document.getElementById('settings-panel').classList.toggle('open');
  document.getElementById('settings-toggle').classList.toggle('open');
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

// Slider Tooltip
const sliderWrappers = document.querySelectorAll('.slider-wrapper');

sliderWrappers.forEach(wrapper => {
  const slider = wrapper.querySelector('input[type="range"]');
  const tooltip = wrapper.querySelector('.slider-tooltip');

  const updateTooltip = () => {
    // 1. Get the current, min, and max values
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const val = parseFloat(slider.value);

    // 2. Update the text inside the bubble
    tooltip.innerText = val;

    // 3. Calculate the percentage (0.0 to 1.0)
    const percent = (val - min) / (max - min);

    // 4. The Magic Math: Adjust for the physical width of the browser's slider thumb
    // (Standard thumb width is about 16px). We offset the percentage so the bubble 
    // doesn't overshoot the edges of the input box.
    const thumbWidth = 4; 
    const offset = (0.5 - percent) * thumbWidth;

    // 5. Move the bubble!
    tooltip.style.left = `calc(${percent * 100}% + ${offset}px)`;
  };

  // Run the math every time the user drags the slider
  slider.addEventListener('input', updateTooltip);
  
  // Run it once on load so the bubble starts in the correct position
  updateTooltip();
});

// Auto-Rotate Logic
let allowAutoRotate = true;
document.getElementById('toggle-sleep-rotate').addEventListener('change', (e) => {
  allowAutoRotate = e.target.checked;
});

// --- Live Parameters ---
let spreadFactor = parseFloat(document.getElementById('val-spread')?.value || 2.0);

const shaderUniforms = {
  uSize: { value: parseFloat(document.getElementById('val-size').value) },
  uIntensity: { value: 5 - parseFloat(document.getElementById('val-intensity').value) },
  uOpacity: { value: parseFloat(document.getElementById('val-opacity').value) }
};

// Slider Listeners
document.getElementById('val-size').addEventListener('input', (e) => {
  shaderUniforms.uSize.value = parseFloat(e.target.value);
  updateHitbox();
});
document.getElementById('val-intensity').addEventListener('input', (e) => {
  shaderUniforms.uIntensity.value = 5 - parseFloat(e.target.value);
});
document.getElementById('val-opacity').addEventListener('input', (e) => {
  shaderUniforms.uOpacity.value = parseFloat(e.target.value);
});

// New Spread Listener
document.getElementById('val-spread')?.addEventListener('input', (e) => {
  spreadFactor = parseFloat(e.target.value);
  if (pointCloud) {
    pointCloud.scale.set(spreadFactor, spreadFactor, spreadFactor);
    updateHitbox();
  }
});

let isFlying = false;
let currentFlightSpeed = 0.05;
let defaultFlightSpeed = 0.05;
const targetCameraPos = new THREE.Vector3();
const targetControlsPos = new THREE.Vector3();

let lastInputTime = Date.now();
const IDLE_TIMEOUT = 5000;

const resetIdleTimer = () => {
  lastInputTime = Date.now();
  if (controls.autoRotate) controls.autoRotate = false;
};

window.addEventListener('mousemove', resetIdleTimer);
window.addEventListener('mousedown', resetIdleTimer);
window.addEventListener('wheel', resetIdleTimer);
window.addEventListener('keydown', resetIdleTimer);

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
async function loadData() {
  const limit = document.getElementById('val-limit').value;
  const n_neighbors = document.getElementById('val-neighbors').value;
  const min_dist = document.getElementById('val-dist').value;
  const seed = document.getElementById('val-seed').value;
  const eps = document.getElementById('val-eps').value;
  const min_samples = document.getElementById('val-samples').value;

  const btn = document.getElementById('btn-recalculate');
  btn.innerText = "Crunching Math...";
  btn.disabled = true;
  btn.style.opacity = "0.5"; 
  btn.style.cursor = "not-allowed";
  
  try {
    const url = `http://localhost:8000/api/history-galaxy?limit=${limit}&n_neighbors=${n_neighbors}&min_dist=${min_dist}&seed=${seed}&eps=${eps}&min_samples=${min_samples}`;
    const response = await fetch(url);
    const json = await response.json();
    
    if (!pointCloud || pointCloud.geometry.attributes.position.count !== json.nodes.length){
      
      if (pointCloud) {
        scene.remove(pointCloud);
        pointCloud.geometry.dispose();
        pointCloud.material.dispose();
      }

      nodeData = json.nodes;

      const positions = [];
      const colorArray = [];
      const colorObj = new THREE.Color();

      nodeData.forEach((dataPoint) => {
        // Store the RAW 1.0 scale coordinates in the geometry
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

    } else {
      nodeData = json.nodes;

      const colorsAttr = pointCloud.geometry.attributes.customColor;
      const colorObj = new THREE.Color();

      nodeData.forEach((dataPoint, i) => {
        colorObj.setHex(getClusterColorHex(dataPoint.cluster));
        colorsAttr.setXYZ(i, colorObj.r, colorObj.g, colorObj.b);
      });

      colorsAttr.needsUpdate = true;
    }
    

    
    
    btn.innerText = "Recalculate Galaxy";
    resetIdleTimer();
  } catch (error) {
    console.error("Error:", error);
    btn.innerText = "Error (See Console)";
  } finally {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
  }
}

document.getElementById('btn-recalculate').addEventListener('click', loadData);
loadData();



function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

async function liveUpdateColors() {
  if (!pointCloud) return;

  const eps = document.getElementById('val-eps').value;
  const min_samples = document.getElementById('val-samples').value;

  try {
    const url = `http://localhost:8000/api/cluster?eps=${eps}&min_samples=${min_samples}`;
    const response = await fetch(url);
    const json = await response.json();
    console.log(json);
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

const debouncedLiveUpdate = debounce(liveUpdateColors, 50);

document.getElementById('val-eps').addEventListener('input', debouncedLiveUpdate);
document.getElementById('val-samples').addEventListener('input', debouncedLiveUpdate);

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
  opacity: 0.4,                      // Overall brightness multiplier
  blending: THREE.AdditiveBlending,  // Math: RGB + RGB = Brighter Core
  depthWrite: false                  // Stops it from clipping into neighboring nodes
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
    if (Date.now() - lastInputTime > IDLE_TIMEOUT && allowAutoRotate) {
      controls.autoRotate = true;
    } else {
      controls.autoRotate = false;
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

    if (isAnimating) {
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

animate();