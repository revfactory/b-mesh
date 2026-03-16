// ============================================================
// B-Mesh Zustand 스토어 인터페이스 정의
// ============================================================

import type {
  Bone,
  BoneConnection,
  BoneEdit,
  CameraState,
  Command,
  EditorOptions,
  MeshData,
  ProjectData,
  SymmetryState,
  ToolType,
  Vec3,
  ViewDirection,
} from '../mesh/types';

// --- Editor Store ---

export interface EditorState {
  // 현재 활성 도구
  activeTool: ToolType;
  // 대칭 설정
  symmetry: SymmetryState;
  // 에디터 옵션
  options: EditorOptions;
  // 본 밀도 (전역 계수, 0.1 ~ 10.0)
  boneDensity: number;
  // 메시 해상도 (8 ~ 128)
  meshResolution: number;
  // 선택된 본 ID
  selectedBoneId: string | null;

  // 액션
  setActiveTool: (tool: ToolType) => void;
  setSymmetry: (axis: keyof SymmetryState, value: boolean) => void;
  setOption: <K extends keyof EditorOptions>(key: K, value: EditorOptions[K]) => void;
  setBoneDensity: (density: number) => void;
  setMeshResolution: (resolution: number) => void;
  setSelectedBoneId: (id: string | null) => void;
  resetOptions: () => void;
}

// --- Mesh Store ---

export interface MeshState {
  // 본 데이터
  bones: Map<string, Bone>;
  // 본 연결
  connections: BoneConnection[];
  // 루트 본 ID
  rootId: string | null;
  // 생성된 메시 데이터
  meshData: MeshData | null;

  // 본 관리 액션
  addBone: (position: Vec3, radius: number, parentId?: string) => string;
  removeBone: (id: string) => void;
  updateBone: (id: string, updates: Partial<Pick<Bone, 'position' | 'radius' | 'name' | 'color' | 'masked'>>) => void;

  // 연결 관리
  addConnection: (boneA: string, boneB: string, strength?: number) => void;
  removeConnection: (boneA: string, boneB: string) => void;

  // 메시 업데이트
  setMeshData: (data: MeshData | null) => void;

  // 프리셋/프로젝트 로드
  loadBones: (bones: Bone[], connections: BoneConnection[], rootId: string) => void;
  clear: () => void;

  // 본 편집 (대칭 적용 전)
  applyEdit: (edit: BoneEdit) => void;
}

// --- History Store ---

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;

  undo: () => void;
  redo: () => void;
  execute: (command: Command) => void;
  clear: () => void;
  getHistory: () => Command[];
}

// --- Camera Store ---

export interface CameraStoreState {
  camera: CameraState;

  setCamera: (state: Partial<CameraState>) => void;
  setViewDirection: (dir: ViewDirection) => void;
  resetCamera: () => void;
}

// --- Project Store ---

export interface ProjectState {
  projectName: string;
  isDirty: boolean;

  setProjectName: (name: string) => void;
  markDirty: () => void;
  markClean: () => void;
  loadProject: (data: ProjectData) => void;
  exportProject: () => ProjectData;
}
