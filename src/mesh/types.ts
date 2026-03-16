// ============================================================
// B-Mesh 핵심 타입 정의
// ============================================================

// --- 기본 타입 ---

export type Vec3 = [number, number, number];

// --- Bone 시스템 ---

export interface Bone {
  id: string;
  name: string;
  position: Vec3;
  radius: number;
  parentId: string | null;
  childIds: string[];
  color: Vec3; // RGB 0~1
  masked: boolean;
}

export interface BoneConnection {
  boneA: string;
  boneB: string;
  strength: number; // 0~1
}

export interface BoneStructure {
  bones: Map<string, Bone>;
  connections: BoneConnection[];
  rootId: string;
}

// --- 메시 데이터 ---

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  colors: Float32Array;
}

// --- 프로젝트 ---

export interface SymmetryState {
  x: boolean;
  y: boolean;
  z: boolean;
}

export interface EditorOptions {
  stretchMode: boolean;
  showGrid: boolean;
  wireframe: boolean;
  vertexView: boolean;
  hideMasked: boolean;
  meshPreview: boolean;
}

export interface CameraState {
  position: Vec3;
  target: Vec3;
  zoom: number;
}

export interface ProjectSettings {
  boneDensity: number;
  meshResolution: number;
  symmetry: SymmetryState;
  options: EditorOptions;
}

export interface ProjectData {
  version: string;
  name: string;
  created: string;
  modified: string;
  settings: ProjectSettings;
  bones: Omit<Bone, 'childIds'>[];
  connections: BoneConnection[];
  camera: CameraState;
}

// --- 도구/렌더 열거형 ---

export type ToolType =
  | 'select'
  | 'grab'
  | 'scale'
  | 'add'
  | 'delete'
  | 'connect'
  | 'mask'
  | 'paint';

export type RenderMode = 'solid' | 'wireframe' | 'vertex';

export type ViewDirection = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

// --- 프리셋 ---

export interface Preset {
  name: string;
  bones: Bone[];
  connections: BoneConnection[];
}

// --- 커맨드 (Undo/Redo) ---

export interface Command {
  execute(): void;
  undo(): void;
  description: string;
}

// --- 이벤트 맵 ---

export type EventMap = {
  'bone:added': { bone: Bone };
  'bone:removed': { boneId: string };
  'bone:moved': { boneId: string; position: Vec3 };
  'bone:scaled': { boneId: string; radius: number };
  'mesh:updated': { meshData: MeshData };
  'tool:changed': { tool: ToolType };
  'project:loaded': { project: ProjectData };
  'project:saved': Record<string, never>;
  'option:changed': { key: string; value: unknown };
  'camera:setView': { direction: string };
  'project:new': Record<string, never>;
  'project:import': Record<string, never>;
  'project:export': Record<string, never>;
  'preset:load': { preset: string };
};

// --- Bone 편집 ---

export type BoneEdit =
  | { type: 'move'; boneId: string; position: Vec3 }
  | { type: 'scale'; boneId: string; radius: number }
  | { type: 'color'; boneId: string; color: Vec3 }
  | { type: 'mask'; boneId: string; masked: boolean };

// --- Marching Cubes 결과 (MeshData와 동일하지만 명시적 별칭) ---

export type MarchingCubesResult = MeshData;
