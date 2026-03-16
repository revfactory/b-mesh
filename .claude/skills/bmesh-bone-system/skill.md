---
name: bmesh-bone-system
description: "본(Bone) 기반 메시 생성 시스템을 구현하는 스킬. SDF, Marching Cubes, 대칭, 프리셋."
---

# B-Mesh Bone System

본(Bone) 계층 구조로부터 3D 메시를 절차적으로 생성하는 핵심 엔진 스킬.

## 알고리즘 파이프라인

```
Bones → SDF Field → Marching Cubes → Mesh (positions, normals, indices, colors)
```

## 구현 대상

### 1. Bone 데이터 구조 (`src/mesh/types.ts`)

```typescript
interface Bone {
  id: string;
  name: string;
  position: [number, number, number];  // 월드 좌표
  radius: number;                       // 메타볼 반경
  parentId: string | null;
  childIds: string[];
  color: [number, number, number];      // RGB 0~1
}

interface BoneConnection {
  boneA: string;   // Bone ID
  boneB: string;   // Bone ID
  strength: number; // 연결 강도 (0~1)
}

interface BoneStructure {
  bones: Map<string, Bone>;
  connections: BoneConnection[];
  rootId: string;
}
```

### 2. BoneSystem (`src/mesh/BoneSystem.ts`)

```typescript
interface BoneSystem {
  structure: BoneStructure;
  addBone(position: Vec3, radius: number, parentId?: string): string;
  removeBone(id: string): void;
  moveBone(id: string, position: Vec3): void;
  scaleBone(id: string, radius: number): void;
  getBone(id: string): Bone;
  getAllBones(): Bone[];
  getConnections(): BoneConnection[];
  setBoneDensity(density: number): void;  // 전역 밀도 계수
}
```

**Bone Density (본 밀도):**
- 각 본의 radius에 곱해지는 전역 계수 (0.1 ~ 10.0)
- 높을수록 본 영향 범위가 넓어져 메시가 두꺼워짐
- 스크린샷 기본값: 3.2

### 3. SDFGenerator (`src/mesh/SDFGenerator.ts`)

```typescript
interface SDFGenerator {
  generate(bones: BoneStructure, resolution: number, density: number): Float32Array;
  // 3D 스칼라 필드 반환 (resolution^3 크기)
}
```

**SDF 계산:**
```
각 그리드 셀의 SDF 값 = smoothMin(모든 본의 거리 함수)

본 거리 함수:
  d(p, bone) = length(p - bone.position) - bone.radius * density

Smooth minimum (k = 0.5):
  smin(a, b, k) = -log(exp(-k*a) + exp(-k*b)) / k
```

**본 연결(Connection) 처리:**
- 연결된 두 본 사이를 캡슐 SDF로 모델링
- `capsuleSDF(p, boneA.pos, boneB.pos, lerp(boneA.radius, boneB.radius, t))`

### 4. MarchingCubes (`src/mesh/MarchingCubes.ts`)

```typescript
interface MarchingCubesResult {
  positions: Float32Array;  // [x,y,z, x,y,z, ...]
  normals: Float32Array;    // [nx,ny,nz, ...]
  indices: Uint32Array;
  colors: Float32Array;     // [r,g,b, r,g,b, ...] 본 영역별 색상
}

interface MarchingCubes {
  extract(sdfField: Float32Array, resolution: number, isoLevel: number): MarchingCubesResult;
}
```

**구현 포인트:**
- 표준 Marching Cubes 256 케이스 테이블 사용
- isoLevel = 0 (SDF 등치면)
- 정점 보간: 엣지 교차점에서 선형 보간
- 노멀: SDF 그래디언트로 계산 (중앙 차분)
- 색상: 각 정점에서 가장 가까운 본의 색상으로 할당 (거리 가중 평균)

**Mesh Resolution:**
- Marching Cubes 그리드 해상도
- 범위: 8 ~ 128 (스크린샷 기본값: 64)
- 낮을수록 각진 메시, 높을수록 부드러운 메시

### 5. SymmetryManager (`src/mesh/SymmetryManager.ts`)

```typescript
interface SymmetryManager {
  axes: { x: boolean; y: boolean; z: boolean };
  mirrorPosition(pos: Vec3): Vec3[];  // 활성 축에 대한 미러 좌표들
  mirrorBoneEdit(boneId: string, edit: BoneEdit): BoneEdit[];
}
```

**대칭 로직:**
- X축 대칭: x좌표 부호 반전 → [-x, y, z]
- Y축 대칭: y좌표 부호 반전
- Z축 대칭: z좌표 부호 반전
- 다중 축 활성 시 모든 조합의 미러 적용 (2^n - 1 개)

### 6. Presets (`src/mesh/Presets.ts`)

```typescript
interface Preset {
  name: string;
  bones: Bone[];
  connections: BoneConnection[];
}

const BIPED_PRESET: Preset = {
  name: 'Biped',
  bones: [
    // 머리, 목, 상체, 하체, 팔(좌/우), 손(좌/우), 다리(좌/우), 발(좌/우)
    { id: 'head', position: [0, 1.7, 0], radius: 0.12, ... },
    { id: 'neck', position: [0, 1.5, 0], radius: 0.06, ... },
    { id: 'chest', position: [0, 1.2, 0], radius: 0.18, ... },
    { id: 'abdomen', position: [0, 0.9, 0], radius: 0.15, ... },
    { id: 'hip', position: [0, 0.7, 0], radius: 0.16, ... },
    // 좌/우 팔, 손, 다리, 발...
  ],
  connections: [
    { boneA: 'head', boneB: 'neck', strength: 1.0 },
    { boneA: 'neck', boneB: 'chest', strength: 1.0 },
    // ...
  ]
};
```

## Stretch Mode

Stretch Mode 활성 시:
- 본 편집(이동/스케일) 시 메시를 실시간 업데이트
- SDF → Marching Cubes 파이프라인을 프레임마다 실행
- 비활성 시 편집 완료 후 한 번만 재생성

## 마스킹 (Hide Masked)

- 각 본에 `masked: boolean` 속성
- masked된 본은 SDF 계산에서 제외
- "Hide Masked" 옵션: masked 본 영역을 렌더링에서 숨김
