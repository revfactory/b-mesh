// ============================================================
// B-Mesh CameraController — 카메라 + OrbitControls
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SceneManager } from './SceneManager';
import type { ViewDirection } from '../mesh/types';

const VIEW_DISTANCE = 8;

const VIEW_POSITIONS: Record<ViewDirection, THREE.Vector3> = {
  front:  new THREE.Vector3(0, 0, VIEW_DISTANCE),
  back:   new THREE.Vector3(0, 0, -VIEW_DISTANCE),
  left:   new THREE.Vector3(-VIEW_DISTANCE, 0, 0),
  right:  new THREE.Vector3(VIEW_DISTANCE, 0, 0),
  top:    new THREE.Vector3(0, VIEW_DISTANCE, 0),
  bottom: new THREE.Vector3(0, -VIEW_DISTANCE, 0),
};

// +X/-X/+Y/-Y/+Z/-Z 매핑
const AXIS_TO_VIEW: Record<string, ViewDirection> = {
  '+X': 'right',
  '-X': 'left',
  '+Y': 'top',
  '-Y': 'bottom',
  '+Z': 'front',
  '-Z': 'back',
};

export class CameraController {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;

  private sceneManager: SceneManager;
  private transitionId: number | null = null;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    const { width, height } = sceneManager.getSize();
    const aspect = width > 0 && height > 0 ? width / height : 1;

    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 1.0, 4);

    this.controls = new OrbitControls(this.camera, sceneManager.getDomElement());
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.target.set(0, 0.9, 0);
    this.controls.update();

    // 리사이즈 시 종횡비 업데이트
    sceneManager.onResizeAdd((w, h) => {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    });

    // 렌더 루프에 controls 업데이트 + 렌더링 등록
    sceneManager.onRender(() => {
      this.controls.update();
      sceneManager.renderWithCamera(this.camera);
    });
  }

  setView(direction: '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z'): void {
    const viewDir = AXIS_TO_VIEW[direction];
    if (!viewDir) return;

    const targetPos = VIEW_POSITIONS[viewDir].clone();
    const targetLook = new THREE.Vector3(0, 0, 0);

    this.animateTransition(targetPos, targetLook);
  }

  setViewByName(direction: ViewDirection): void {
    const targetPos = VIEW_POSITIONS[direction].clone();
    const targetLook = new THREE.Vector3(0, 0, 0);
    this.animateTransition(targetPos, targetLook);
  }

  resetView(): void {
    this.animateTransition(
      new THREE.Vector3(5, 5, 5),
      new THREE.Vector3(0, 0, 0),
    );
  }

  zoomToFit(boundingBox: THREE.Box3): void {
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);

    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = (maxDim / 2) / Math.tan(fov / 2) * 1.5;

    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    const newPos = center.clone().add(direction.multiplyScalar(distance));

    this.animateTransition(newPos, center);
  }

  private animateTransition(
    targetPos: THREE.Vector3,
    targetLook: THREE.Vector3,
    duration = 500,
  ): void {
    // 이전 트랜지션 취소
    if (this.transitionId !== null) {
      cancelAnimationFrame(this.transitionId);
      this.transitionId = null;
    }

    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);

      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.controls.target.lerpVectors(startTarget, targetLook, ease);
      this.controls.update();

      if (t < 1) {
        this.transitionId = requestAnimationFrame(animate);
      } else {
        this.transitionId = null;
      }
    };

    this.transitionId = requestAnimationFrame(animate);
  }

  dispose(): void {
    if (this.transitionId !== null) {
      cancelAnimationFrame(this.transitionId);
      this.transitionId = null;
    }
    this.controls.dispose();
  }
}
