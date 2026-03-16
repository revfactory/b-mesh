// ============================================================
// B-Mesh MeshRenderer — 메시 렌더링 + 본 영역 셰이더
// ============================================================

import * as THREE from 'three';
import type { MeshData, RenderMode } from '../mesh/types';
import type { SceneManager } from './SceneManager';

// 셰이더 인라인 (vite에서 glsl import 설정 없이 동작)
const vertexShader = /* glsl */ `
attribute vec3 boneColor;
varying vec3 vBoneColor;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vBoneColor = boneColor;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vBoneColor;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(vec3(0.5, 0.8, 0.5));
  float diffuse = max(dot(normal, lightDir), 0.0);
  float ambient = 0.3;
  vec3 color = vBoneColor * (ambient + diffuse * 0.7);
  gl_FragColor = vec4(color, 1.0);
}
`;

export class MeshRenderer {
  private sceneManager: SceneManager;
  private meshGroup: THREE.Group;
  private solidMesh: THREE.Mesh | null = null;
  private wireframeMesh: THREE.LineSegments | null = null;
  private pointsMesh: THREE.Points | null = null;
  private currentMode: RenderMode = 'solid';
  private currentGeometry: THREE.BufferGeometry | null = null;

  // 머티리얼 캐시
  private boneMaterial: THREE.ShaderMaterial;
  private wireframeMaterial: THREE.MeshBasicMaterial;
  private pointsMaterial: THREE.PointsMaterial;
  private previewMaterial: THREE.MeshStandardMaterial;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.meshGroup = new THREE.Group();
    sceneManager.addObject(this.meshGroup);

    // 본 영역 셰이더 머티리얼
    this.boneMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
    });

    // 와이어프레임 머티리얼
    this.wireframeMaterial = new THREE.MeshBasicMaterial({
      wireframe: true,
      color: 0x333333,
    });

    // 정점 포인트 머티리얼
    this.pointsMaterial = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x0088ff,
      sizeAttenuation: true,
    });

    // 프리뷰 머티리얼 (smooth)
    this.previewMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.5,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
  }

  updateMesh(meshData: MeshData): void {
    this.clearMesh();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));

    // 본 영역 색상 (RGB)
    if (meshData.colors.length > 0) {
      geometry.setAttribute('boneColor', new THREE.BufferAttribute(meshData.colors, 3));
    }

    this.currentGeometry = geometry;
    this.applyMode(this.currentMode);
  }

  setMode(mode: RenderMode): void {
    if (mode === this.currentMode && this.solidMesh) return;
    this.currentMode = mode;
    if (this.currentGeometry) {
      this.clearVisuals();
      this.applyMode(mode);
    }
  }

  getMode(): RenderMode {
    return this.currentMode;
  }

  /** 프리뷰 모드 토글 (smooth normals) */
  setPreview(enabled: boolean): void {
    if (!this.currentGeometry) return;
    this.clearVisuals();
    if (enabled) {
      this.applyPreview();
    } else {
      this.applyMode(this.currentMode);
    }
  }

  private applyMode(mode: RenderMode): void {
    if (!this.currentGeometry) return;

    switch (mode) {
      case 'solid':
        this.applySolid();
        break;
      case 'wireframe':
        this.applyWireframe();
        break;
      case 'vertex':
        this.applyVertex();
        break;
    }
  }

  private applySolid(): void {
    if (!this.currentGeometry) return;
    const hasBoneColor = this.currentGeometry.hasAttribute('boneColor');
    const material = hasBoneColor ? this.boneMaterial : this.previewMaterial;
    this.solidMesh = new THREE.Mesh(this.currentGeometry, material);
    this.meshGroup.add(this.solidMesh);
  }

  private applyWireframe(): void {
    if (!this.currentGeometry) return;
    // solid + wireframe overlay
    this.solidMesh = new THREE.Mesh(this.currentGeometry, this.previewMaterial);
    this.meshGroup.add(this.solidMesh);

    const wireGeo = new THREE.WireframeGeometry(this.currentGeometry);
    this.wireframeMesh = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({
      color: 0x333333,
      linewidth: 1,
    }));
    this.meshGroup.add(this.wireframeMesh);
  }

  private applyVertex(): void {
    if (!this.currentGeometry) return;
    // solid + vertex points overlay
    this.solidMesh = new THREE.Mesh(this.currentGeometry, this.previewMaterial);
    this.solidMesh.material = this.previewMaterial.clone();
    (this.solidMesh.material as THREE.MeshStandardMaterial).opacity = 0.3;
    (this.solidMesh.material as THREE.MeshStandardMaterial).transparent = true;
    this.meshGroup.add(this.solidMesh);

    this.pointsMesh = new THREE.Points(this.currentGeometry, this.pointsMaterial);
    this.meshGroup.add(this.pointsMesh);
  }

  private applyPreview(): void {
    if (!this.currentGeometry) return;
    // smooth normals을 위해 geometry를 복사하고 computeVertexNormals 실행
    const smoothGeo = this.currentGeometry.clone();
    smoothGeo.computeVertexNormals();
    this.solidMesh = new THREE.Mesh(smoothGeo, this.previewMaterial);
    this.meshGroup.add(this.solidMesh);
  }

  getMeshGroup(): THREE.Group {
    return this.meshGroup;
  }

  getBoundingBox(): THREE.Box3 | null {
    if (!this.currentGeometry) return null;
    this.currentGeometry.computeBoundingBox();
    return this.currentGeometry.boundingBox;
  }

  private clearVisuals(): void {
    if (this.solidMesh) {
      this.meshGroup.remove(this.solidMesh);
      this.solidMesh = null;
    }
    if (this.wireframeMesh) {
      this.wireframeMesh.geometry.dispose();
      this.meshGroup.remove(this.wireframeMesh);
      this.wireframeMesh = null;
    }
    if (this.pointsMesh) {
      this.meshGroup.remove(this.pointsMesh);
      this.pointsMesh = null;
    }
  }

  private clearMesh(): void {
    this.clearVisuals();
    if (this.currentGeometry) {
      this.currentGeometry.dispose();
      this.currentGeometry = null;
    }
  }

  dispose(): void {
    this.clearMesh();
    this.sceneManager.removeObject(this.meshGroup);
    this.boneMaterial.dispose();
    this.wireframeMaterial.dispose();
    this.pointsMaterial.dispose();
    this.previewMaterial.dispose();
  }
}
