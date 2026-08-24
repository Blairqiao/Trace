import * as THREE from 'three';

export class InteractionManager {
  constructor(sceneManager, galaxyMesh) {
    this.sceneManager = sceneManager;
    this.galaxyMesh = galaxyMesh;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.mouseScreen = { x: 0, y: 0 };
    this.hoveredId = null;

    // Forcefield hover glow sprite
    this.forcefieldSprite = this._createForcefieldSprite();
    this.sceneManager.scene.add(this.forcefieldSprite);

    // Callbacks
    this._onHover = null;
    this._onHoverEnd = null;
    this._onFlyTo = null;
    this._onFlyToEmpty = null;
    this._onOpenLink = null;

    this.updateHitbox(this.galaxyMesh.uniforms.uSize.value);
    this._bindEvents();
  }

  onHover(callback) {
    this._onHover = callback;
  }

  onHoverEnd(callback) {
    this._onHoverEnd = callback;
  }

  onFlyTo(callback) {
    this._onFlyTo = callback;
  }

  onFlyToEmpty(callback) {
    this._onFlyToEmpty = callback;
  }

  onOpenLink(callback) {
    this._onOpenLink = callback;
  }

  updateHitbox(uSize) {
    this.raycaster.params.Points.threshold = 0.0015 * uSize;
  }

  _createForcefieldSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    return sprite;
  }

  _bindEvents() {
    const canvas = this.sceneManager.canvas;

    canvas.addEventListener('mousemove', (event) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      this.mouseScreen.x = event.clientX;
      this.mouseScreen.y = event.clientY;
    });

    canvas.addEventListener('dblclick', () => {
      this.sceneManager.resetIdleTimer();

      if (this.hoveredId !== null && this.galaxyMesh.nodes[this.hoveredId]) {
        const targetNode = this.galaxyMesh.nodes[this.hoveredId];
        if (this._onFlyTo) {
          this._onFlyTo(targetNode);
        }
      } else {
        if (this._onFlyToEmpty) {
          this._onFlyToEmpty();
        }
      }
    });

    canvas.addEventListener('auxclick', (event) => {
      if (event.button === 1 && this.hoveredId !== null) {
        const node = this.galaxyMesh.nodes[this.hoveredId];
        if (node && node.url && this._onOpenLink) {
          this._onOpenLink(node.url);
        }
      }
    });

    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0 && (event.ctrlKey || event.metaKey) && this.hoveredId !== null) {
        const node = this.galaxyMesh.nodes[this.hoveredId];
        if (node && node.url && this._onOpenLink) {
          this._onOpenLink(node.url);
        }
      }
    });
  }

  update(isAnimating, isDemoMode) {
    const pointCloud = this.galaxyMesh.mesh;
    const nodeData = this.galaxyMesh.nodes;
    const controls = this.sceneManager.controls;
    const camera = this.sceneManager.camera;

    if (!pointCloud || isAnimating || isDemoMode || controls.autoRotate) {
      if (this.hoveredId !== null) {
        this.hoveredId = null;
        if (this._onHoverEnd) this._onHoverEnd();
        this.forcefieldSprite.visible = false;
      }
      return;
    }

    this.raycaster.setFromCamera(this.mouse, camera);
    const intersects = this.raycaster.intersectObject(pointCloud);

    if (intersects.length > 0) {
      const targetIndex = intersects[0].index;
      if (this.hoveredId !== targetIndex) {
        this.hoveredId = targetIndex;
        const ud = nodeData[targetIndex];

        if (ud && this._onHover) {
          this._onHover(ud, this.mouseScreen.x, this.mouseScreen.y);
        }

        if (ud) {
          this.forcefieldSprite.position.set(ud.x, ud.y, ud.z);
          this.forcefieldSprite.position.multiplyScalar(this.galaxyMesh.spreadFactor);
          this.forcefieldSprite.visible = true;
        }
      }

      const baseScale = this.galaxyMesh.uniforms.uSize.value * 0.005;
      this.forcefieldSprite.scale.set(baseScale, baseScale, 1);
    } else {
      if (this.hoveredId !== null) {
        this.hoveredId = null;
        if (this._onHoverEnd) this._onHoverEnd();
        this.forcefieldSprite.visible = false;
      }
    }
  }
}
