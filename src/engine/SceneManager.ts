// ============================================================
// B-Mesh SceneManager — Three.js 씬 + 렌더 루프
// ============================================================

import * as THREE from 'three';

export class SceneManager {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;

  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private container: HTMLElement | null = null;
  private renderCallbacks: Array<() => void> = [];

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#f0f0f0');
    this.renderer = null!;
  }

  init(container: HTMLElement): void {
    this.container = container;

    // WebGL2 렌더러
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // 3포인트 라이팅
    this.setupLighting();

    // 리사이즈 감지
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          this.renderer.setSize(width, height);
          this.onResize(width, height);
        }
      }
    });
    this.resizeObserver.observe(container);

    // 렌더 루프 시작
    this.startLoop();
  }

  private setupLighting(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    // Directional light 1 — 우측 상단 전방
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.6);
    dir1.position.set(5, 8, 5);
    this.scene.add(dir1);

    // Directional light 2 — 좌측 하단 후방
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.6);
    dir2.position.set(-5, -3, -5);
    this.scene.add(dir2);
  }

  private resizeListeners: Array<(w: number, h: number) => void> = [];

  onResizeAdd(fn: (w: number, h: number) => void): void {
    this.resizeListeners.push(fn);
  }

  private onResize(width: number, height: number): void {
    for (const fn of this.resizeListeners) {
      fn(width, height);
    }
  }

  onRender(callback: () => void): void {
    this.renderCallbacks.push(callback);
  }

  private startLoop(): void {
    const loop = () => {
      this.animationId = requestAnimationFrame(loop);
      for (const cb of this.renderCallbacks) cb();
      this.render();
    };
    loop();
  }

  render(): void {
    // render는 외부에서 카메라를 설정해야 하므로
    // CameraController가 연결된 후에만 의미 있음
    // 여기서는 scene만 유지, 실제 render는 카메라와 함께 호출
  }

  renderWithCamera(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera);
  }

  setBackground(color: string): void {
    this.scene.background = new THREE.Color(color);
  }

  addObject(obj: THREE.Object3D): void {
    this.scene.add(obj);
  }

  removeObject(obj: THREE.Object3D): void {
    this.scene.remove(obj);
  }

  getContainer(): HTMLElement | null {
    return this.container;
  }

  getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  getSize(): { width: number; height: number } {
    const container = this.container;
    if (!container) return { width: 0, height: 0 };
    return { width: container.clientWidth, height: container.clientHeight };
  }

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // GPU 메모리 해제
    this.renderer.dispose();
    this.renderer.forceContextLoss();

    // 씬의 모든 객체 정리
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    // DOM에서 캔버스 제거
    if (this.container && this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }

    this.renderCallbacks = [];
    this.resizeListeners = [];
    this.container = null;
  }
}
