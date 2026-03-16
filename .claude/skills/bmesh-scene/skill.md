---
name: bmesh-scene
description: "Three.js 씬 초기화, 카메라, 라이팅, 렌더 루프를 구현하는 스킬. 3D 뷰포트 설정."
---

# B-Mesh Scene Setup

Three.js 기반 3D 씬을 초기화하고 렌더링 인프라를 구축하는 스킬.

## 기술 스택
- Three.js (r170+)
- TypeScript strict mode
- WebGL2 렌더러

## 구현 대상

### 1. SceneManager (`src/engine/SceneManager.ts`)

```typescript
// 핵심 인터페이스
interface SceneManager {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  init(container: HTMLElement): void;
  render(): void;
  dispose(): void;
  setBackground(color: string): void;
  addObject(obj: THREE.Object3D): void;
  removeObject(obj: THREE.Object3D): void;
}
```

**구현 사항:**
- WebGL2 렌더러 생성 (antialias, alpha, preserveDrawingBuffer)
- 배경색: `#f0f0f0` (밝은 회색)
- 3포인트 라이팅: ambient(0.4) + directional(0.6) x2
- ResizeObserver로 캔버스 자동 리사이즈
- requestAnimationFrame 기반 렌더 루프
- dispose 시 GPU 메모리 해제

### 2. CameraController (`src/engine/CameraController.ts`)

```typescript
interface CameraController {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  setView(direction: '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z'): void;
  resetView(): void;
  zoomToFit(boundingBox: THREE.Box3): void;
}
```

**구현 사항:**
- PerspectiveCamera (fov: 45, near: 0.1, far: 1000)
- OrbitControls (회전, 줌, 팬)
- 6방향 프리셋 뷰 (스무스 트랜지션 — GSAP 또는 Tween)
- 마우스 휠 줌, 우클릭 팬, 좌클릭 회전
- zoomToFit: 메시 바운딩 박스에 맞게 카메라 자동 조정

### 3. GridHelper (`src/engine/GridHelper.ts`)

```typescript
interface GridConfig {
  visible: boolean;
  size: number;
  divisions: number;
}
```

**구현 사항:**
- THREE.GridHelper (크기 20, 분할 20)
- 토글 on/off
- XZ 평면 기준

### 4. RaycastManager (`src/engine/RaycastManager.ts`)

```typescript
interface RaycastManager {
  cast(mouse: THREE.Vector2, camera: THREE.Camera, targets: THREE.Object3D[]): THREE.Intersection[];
  getHitPoint(): THREE.Vector3 | null;
  getHitFace(): THREE.Face | null;
  getHitNormal(): THREE.Vector3 | null;
}
```

**구현 사항:**
- THREE.Raycaster 기반
- 마우스 좌표 → NDC 변환
- 메시 표면 히트 포인트 반환
- 브러시 도구용 연속 레이캐스트 (mousemove)

## 렌더링 모드

| 모드 | 구현 |
|------|------|
| Solid (기본) | MeshStandardMaterial + 본 영역 색상 |
| Wireframe | wireframe: true 또는 WireframeGeometry |
| Vertex | 정점 위치에 작은 구체/점 렌더링 (THREE.Points) |
| Mesh Preview | 최종 출력용 매끄러운 렌더링 (smooth normals) |

## 셰이더 (본 영역 시각화)

```glsl
// vertex shader — 본 영역별 색상을 보간
attribute vec4 boneColor;  // 각 정점의 본 영향 색상
varying vec4 vBoneColor;

void main() {
  vBoneColor = boneColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// fragment shader
varying vec4 vBoneColor;

void main() {
  gl_FragColor = vBoneColor;
}
```

## 성능 가이드라인
- 정점 10만개 이하: 즉시 렌더링
- 정점 10만~50만: LOD 적용
- 정점 50만 초과: 경고 표시 + 자동 해상도 감소 제안
