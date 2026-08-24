import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  DEFAULT_CAMERA_POSITION,
  FOG_COLOR,
  FOG_DENSITY,
  IDLE_TIMEOUT,
  DEFAULT_FLIGHT_SPEED
} from '../utils/constants.js';
import { saveCameraState } from '../utils/persistence.js';

export class SceneManager {
  constructor(container) {
    this.container = container;

    // 1. Scene with exponential fog
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(FOG_COLOR, FOG_DENSITY);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(
      DEFAULT_CAMERA_POSITION.x,
      DEFAULT_CAMERA_POSITION.y,
      DEFAULT_CAMERA_POSITION.z
    );

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.addEventListener('end', () => saveCameraState(this.camera, this.controls));
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = true;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 0.3;
    this.controls.minDistance = 0.3;

    // 5. Flight & Transition State
    this.isFlying = false;
    this.currentFlightSpeed = DEFAULT_FLIGHT_SPEED;
    this.defaultFlightSpeed = DEFAULT_FLIGHT_SPEED;
    this.targetCameraPos = new THREE.Vector3();
    this.targetControlsPos = new THREE.Vector3();

    this.isTransitioningCamera = false;
    this.centertargetCameraPos = new THREE.Vector3();
    this.centertargetControlsPos = new THREE.Vector3();

    // 6. Idle Rotation State
    this.lastInputTime = Date.now();
    this.allowAutoRotate = true;

    // 7. Event Listeners
    this._bindEvents();
  }

  get canvas() {
    return this.renderer.domElement;
  }

  _bindEvents() {
    window.addEventListener('resize', () => this.onResize());

    const domElement = this.renderer.domElement;
    domElement.addEventListener('mousemove', () => this.resetIdleTimer());
    domElement.addEventListener('mousedown', () => this.resetIdleTimer());
    domElement.addEventListener('wheel', () => this.resetIdleTimer());
    domElement.addEventListener('keydown', () => this.resetIdleTimer());
  }

  resetIdleTimer() {
    this.lastInputTime = Date.now();
    if (this.controls.autoRotate) {
      this.controls.autoRotate = false;
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  centerCamera(nodeData, spreadFactor = 1.0, zoomLevel = 1.5) {
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

    this.centertargetControlsPos.set(centerX, centerY, centerZ);
    this.centertargetCameraPos.set(centerX, centerY, centerZ + zoomDistance);

    this.isTransitioningCamera = true;
  }

  flyToNode(targetNode, spreadFactor) {
    const finalPos = new THREE.Vector3(
      targetNode.x * spreadFactor,
      targetNode.y * spreadFactor,
      targetNode.z * spreadFactor
    );

    this.targetControlsPos.copy(finalPos);

    const sightline = new THREE.Vector3().subVectors(this.camera.position, finalPos).normalize();
    const currentDistance = this.camera.position.distanceTo(finalPos);
    const parkDistance = Math.max(currentDistance * 0.1, this.controls.minDistance);

    this.targetCameraPos.copy(finalPos).add(sightline.multiplyScalar(parkDistance));

    this.isFlying = true;
    this.currentFlightSpeed = this.defaultFlightSpeed;
  }

  flyForward(spreadFactor) {
    const forwardVector = new THREE.Vector3();
    this.camera.getWorldDirection(forwardVector);
    forwardVector.normalize().multiplyScalar(4 * spreadFactor);

    this.targetCameraPos.copy(this.camera.position).add(forwardVector);
    this.targetControlsPos.copy(this.controls.target).add(forwardVector);

    this.isFlying = true;
    this.currentFlightSpeed = this.defaultFlightSpeed;
  }

  updateFlight() {
    if (this.isFlying) {
      this.controls.enabled = false;
      this.currentFlightSpeed = Math.min(this.currentFlightSpeed + 0.005, 0.1);
      this.camera.position.lerp(this.targetCameraPos, this.currentFlightSpeed);
      this.controls.target.lerp(this.targetControlsPos, this.currentFlightSpeed);

      if (
        this.camera.position.distanceTo(this.targetCameraPos) < 0.02 &&
        this.controls.target.distanceTo(this.targetControlsPos) < 0.02
      ) {
        this.camera.position.copy(this.targetCameraPos);
        this.controls.target.copy(this.targetControlsPos);
        this.isFlying = false;
        this.controls.enabled = true;
      }
    }

    if (this.isTransitioningCamera) {
      this.camera.position.lerp(this.centertargetCameraPos, 0.05);
      this.controls.target.lerp(this.centertargetControlsPos, 0.05);

      if (this.camera.position.distanceTo(this.centertargetCameraPos) < 0.5) {
        this.isTransitioningCamera = false;
      }
    }
  }

  updateAutoRotate(isDemoMode) {
    if (this.isFlying) return;

    if (isDemoMode) {
      this.controls.autoRotate = true;
    } else {
      if (Date.now() - this.lastInputTime > IDLE_TIMEOUT && this.allowAutoRotate) {
        this.controls.autoRotate = true;
      } else {
        this.controls.autoRotate = false;
      }
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
