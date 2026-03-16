// ============================================================
// B-Mesh GridHelper — XZ 평면 그리드
// ============================================================

import * as THREE from 'three';

export class GridHelper {
  grid: THREE.GridHelper;
  private visible: boolean;

  constructor(size = 20, divisions = 20) {
    this.grid = new THREE.GridHelper(size, divisions, 0x888888, 0xcccccc);
    this.grid.material.opacity = 0.5;
    (this.grid.material as THREE.Material).transparent = true;
    this.visible = true;
  }

  toggle(): void {
    this.visible = !this.visible;
    this.grid.visible = this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.grid.visible = visible;
  }

  isVisible(): boolean {
    return this.visible;
  }

  getObject(): THREE.GridHelper {
    return this.grid;
  }
}
