---
name: bmesh-project-io
description: "B-Mesh 프로젝트 저장/불러오기, Import/Export, Undo/Redo 시스템을 구현하는 스킬."
---

# B-Mesh Project I/O

프로젝트 직렬화, 파일 입출력, 히스토리 관리를 구현하는 스킬.

## 프로젝트 파일 포맷 (.bmesh)

```json
{
  "version": "1.0",
  "name": "My Character",
  "created": "2026-03-16T00:00:00Z",
  "modified": "2026-03-16T12:00:00Z",
  "settings": {
    "boneDensity": 3.2,
    "meshResolution": 64,
    "symmetry": { "x": true, "y": false, "z": false },
    "options": {
      "stretchMode": true,
      "showGrid": false,
      "wireframe": false,
      "vertexView": false,
      "hideMasked": true,
      "meshPreview": true
    }
  },
  "bones": [
    {
      "id": "bone_001",
      "name": "Head",
      "position": [0, 1.7, 0],
      "radius": 0.12,
      "parentId": "bone_002",
      "color": [0.8, 0.1, 0.1],
      "masked": false
    }
  ],
  "connections": [
    { "boneA": "bone_001", "boneB": "bone_002", "strength": 1.0 }
  ],
  "camera": {
    "position": [0, 1, 5],
    "target": [0, 1, 0],
    "zoom": 1.0
  }
}
```

## 구현 대상

### 1. ProjectIO (`src/io/ProjectIO.ts`)

```typescript
interface ProjectIO {
  // 프로젝트 저장 — Blob 생성 후 다운로드
  save(project: ProjectData): void;

  // 프로젝트 불러오기 — File API로 읽기
  load(file: File): Promise<ProjectData>;

  // 새 프로젝트 — 기본 상태로 초기화
  newProject(): ProjectData;

  // 자동 저장 — localStorage에 주기적 저장 (30초)
  enableAutoSave(interval?: number): void;
  disableAutoSave(): void;
}
```

**저장 구현:**
```typescript
function save(project: ProjectData) {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name || 'untitled'}.bmesh`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**불러오기 구현:**
```typescript
async function load(file: File): Promise<ProjectData> {
  const text = await file.text();
  const data = JSON.parse(text);
  validateProjectData(data);  // 버전 체크, 필수 필드 검증
  return data;
}
```

### 2. MeshExporter (`src/io/MeshExporter.ts`)

```typescript
interface MeshExporter {
  exportOBJ(mesh: MeshData): string;
  exportSTL(mesh: MeshData): ArrayBuffer;
  exportGLB(mesh: MeshData): Promise<ArrayBuffer>;
}
```

**OBJ 내보내기:**
```
# B-Mesh Export
v x y z          // 정점
vn nx ny nz      // 노멀
f v1//n1 v2//n2 v3//n3  // 면
```

**STL 내보내기:**
- Binary STL 포맷 (더 작은 파일 크기)
- 헤더(80바이트) + 삼각형 수(4바이트) + 삼각형 데이터

**GLB 내보내기:**
- Three.js GLTFExporter 활용

### 3. MeshImporter (`src/io/MeshImporter.ts`)

```typescript
interface MeshImporter {
  importOBJ(content: string): MeshData;
  importGLB(buffer: ArrayBuffer): Promise<MeshData>;
  importSTL(buffer: ArrayBuffer): MeshData;
  detect(file: File): 'obj' | 'glb' | 'stl' | 'bmesh' | 'unknown';
}
```

### 4. CommandManager (`src/core/CommandManager.ts`)

```typescript
interface Command {
  execute(): void;
  undo(): void;
  description: string;
}

interface CommandManager {
  execute(command: Command): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  getHistory(): Command[];
  clear(): void;
}
```

**구현 세부:**
- 히스토리 스택: `undoStack: Command[]`, `redoStack: Command[]`
- 최대 100개 커맨드 유지 (초과 시 가장 오래된 것 삭제)
- 새 커맨드 실행 시 redoStack 초기화
- Ctrl+Z / Ctrl+Shift+Z 키보드 바인딩

### 5. EventBus (`src/core/EventBus.ts`)

```typescript
type EventMap = {
  'bone:added': { bone: Bone };
  'bone:removed': { boneId: string };
  'bone:moved': { boneId: string; position: Vec3 };
  'bone:scaled': { boneId: string; radius: number };
  'mesh:updated': { meshData: MeshData };
  'tool:changed': { tool: ToolType };
  'project:loaded': { project: ProjectData };
  'project:saved': {};
  'option:changed': { key: string; value: any };
};

interface EventBus {
  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void;
  off<K extends keyof EventMap>(event: K, handler: Function): void;
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void;
}
```

## 초기화 순서

```
1. EventBus 생성
2. CommandManager 생성
3. Zustand 스토어 초기화
4. BoneSystem 생성 + 이벤트 연결
5. SDFGenerator + MarchingCubes 생성
6. SceneManager 초기화 (DOM mount 후)
7. ToolManager 생성 + 이벤트 연결
8. ProjectIO 자동 저장 활성화
9. 기본 프리셋(Biped) 로드 또는 빈 프로젝트
```
