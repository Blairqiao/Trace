import * as THREE from 'three';
import { getClusterColorHex } from '../utils/helpers.js';

const vertexShader = `
  uniform float uSize;
  attribute vec3 customColor;
  varying vec3 vColor;
  void main() {
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (10.0 / -mvPosition.z);
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

export class GalaxyMesh {
  constructor(scene) {
    this.scene = scene;
    this.pointCloud = null;
    this.nodeData = [];
    this.spreadFactor = 2.0;

    this.shaderUniforms = {
      uSize: { value: 10.0 },
      uIntensity: { value: 3.5 }, // 5.0 - 1.5
      uOpacity: { value: 1.0 }
    };
  }

  get uniforms() {
    return this.shaderUniforms;
  }

  get mesh() {
    return this.pointCloud;
  }

  get nodes() {
    return this.nodeData;
  }

  build(nodes, spreadFactor = this.spreadFactor) {
    this.spreadFactor = spreadFactor;
    this.nodeData = nodes;

    if (this.pointCloud && this.pointCloud.geometry.attributes.position.count === nodes.length) {
      const colorsAttr = this.pointCloud.geometry.attributes.customColor;
      const colorObj = new THREE.Color();

      this.nodeData.forEach((dataPoint, i) => {
        colorObj.setHex(getClusterColorHex(dataPoint.cluster));
        colorsAttr.setXYZ(i, colorObj.r, colorObj.g, colorObj.b);
      });

      colorsAttr.needsUpdate = true;
      return;
    }

    if (this.pointCloud) {
      this.dispose();
    }

    const positions = [];
    const colorArray = [];
    const colorObj = new THREE.Color();

    this.nodeData.forEach((dataPoint) => {
      positions.push(dataPoint.x, dataPoint.y, dataPoint.z);
      colorObj.setHex(getClusterColorHex(dataPoint.cluster));
      colorArray.push(colorObj.r, colorObj.g, colorObj.b);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('customColor', new THREE.Float32BufferAttribute(colorArray, 3));

    const material = new THREE.ShaderMaterial({
      uniforms: this.shaderUniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.pointCloud = new THREE.Points(geometry, material);
    this.pointCloud.scale.set(this.spreadFactor, this.spreadFactor, this.spreadFactor);
    this.scene.add(this.pointCloud);
  }

  updateColors(clusterNodes) {
    if (!this.pointCloud || !this.nodeData || !clusterNodes) return;

    const colorsAttr = this.pointCloud.geometry.attributes.customColor;
    const colorObj = new THREE.Color();

    clusterNodes.forEach((dataPoint, i) => {
      if (this.nodeData[i]) {
        this.nodeData[i].cluster = dataPoint.cluster;
      }
      colorObj.setHex(getClusterColorHex(dataPoint.cluster));
      colorsAttr.setXYZ(i, colorObj.r, colorObj.g, colorObj.b);
    });

    colorsAttr.needsUpdate = true;
  }

  setSpread(factor) {
    this.spreadFactor = factor;
    if (this.pointCloud) {
      this.pointCloud.scale.set(factor, factor, factor);
    }
  }

  animatePositions() {
    if (!this.pointCloud || !this.nodeData || this.nodeData.length === 0) {
      return { isAnimating: false };
    }

    const positions = this.pointCloud.geometry.attributes.position.array;
    let geometryNeedsUpdate = false;
    let isAnimating = false;

    for (let i = 0; i < this.nodeData.length; i++) {
      const idx = i * 3;

      const targetX = this.nodeData[i].x;
      const targetY = this.nodeData[i].y;
      const targetZ = this.nodeData[i].z;

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
      this.pointCloud.geometry.attributes.position.needsUpdate = true;
      this.pointCloud.geometry.computeBoundingSphere();
    }

    return { isAnimating };
  }

  dispose() {
    if (this.pointCloud) {
      this.scene.remove(this.pointCloud);
      this.pointCloud.geometry.dispose();
      this.pointCloud.material.dispose();
      this.pointCloud = null;
    }
  }
}
