// ============================================================
// B-Mesh RaycastManager — 마우스 → 3D 교차 검사
// ============================================================

import * as THREE from 'three';

export class RaycastManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private lastHit: THREE.Intersection | null = null;

  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  /** 마우스 이벤트로부터 NDC 좌표 업데이트 */
  updateMouse(event: MouseEvent, domElement: HTMLElement): void {
    const rect = domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /** NDC 좌표를 직접 설정 */
  setMouseNDC(x: number, y: number): void {
    this.mouse.set(x, y);
  }

  /** 레이캐스트 실행 */
  cast(
    camera: THREE.Camera,
    targets: THREE.Object3D[],
  ): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.mouse, camera);
    const intersections = this.raycaster.intersectObjects(targets, true);
    this.lastHit = intersections.length > 0 ? intersections[0] : null;
    return intersections;
  }

  /** 마우스 이벤트로부터 레이캐스트 (편의 메서드) */
  castFromEvent(
    event: MouseEvent,
    domElement: HTMLElement,
    camera: THREE.Camera,
    targets: THREE.Object3D[],
  ): THREE.Intersection[] {
    this.updateMouse(event, domElement);
    return this.cast(camera, targets);
  }

  getHitPoint(): THREE.Vector3 | null {
    return this.lastHit?.point.clone() ?? null;
  }

  getHitFace(): THREE.Face | null {
    return this.lastHit?.face ?? null;
  }

  getHitNormal(): THREE.Vector3 | null {
    return this.lastHit?.face?.normal.clone() ?? null;
  }

  getLastHit(): THREE.Intersection | null {
    return this.lastHit;
  }
}
