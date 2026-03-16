// ============================================================
// B-Mesh ProjectIO - 프로젝트 저장/불러오기
// ============================================================

import type { Bone, BoneConnection, CameraState, ProjectData } from '../mesh/types';
import { useEditorStore } from '../store/editorStore';
import { useMeshStore } from '../store/meshStore';

const PROJECT_VERSION = '1.0.0';
const AUTOSAVE_KEY = 'bmesh-autosave';
const AUTOSAVE_INTERVAL = 30_000;

let autoSaveTimer: ReturnType<typeof setInterval> | null = null;

function serializeBones(bones: Map<string, Bone>): Omit<Bone, 'childIds'>[] {
  return Array.from(bones.values()).map(({ childIds: _, ...rest }) => rest);
}

function rebuildChildIds(bones: Bone[]): Bone[] {
  const childMap = new Map<string, string[]>();
  for (const bone of bones) {
    if (bone.parentId) {
      const children = childMap.get(bone.parentId) ?? [];
      children.push(bone.id);
      childMap.set(bone.parentId, children);
    }
  }
  return bones.map((bone) => ({
    ...bone,
    childIds: childMap.get(bone.id) ?? [],
  }));
}

function buildProjectData(): ProjectData {
  const editor = useEditorStore.getState();
  const mesh = useMeshStore.getState();
  const now = new Date().toISOString();

  return {
    version: PROJECT_VERSION,
    name: 'Untitled',
    created: now,
    modified: now,
    settings: {
      boneDensity: editor.boneDensity,
      meshResolution: editor.meshResolution,
      symmetry: { ...editor.symmetry },
      options: { ...editor.options },
    },
    bones: serializeBones(mesh.bones),
    connections: [...mesh.connections],
    camera: { position: [0, 5, 10], target: [0, 0, 0], zoom: 1 },
  };
}

function applyProjectData(data: ProjectData): void {
  const editor = useEditorStore.getState();
  const mesh = useMeshStore.getState();

  // Restore editor settings
  editor.setBoneDensity(data.settings.boneDensity);
  editor.setMeshResolution(data.settings.meshResolution);
  editor.setSymmetry('x', data.settings.symmetry.x);
  editor.setSymmetry('y', data.settings.symmetry.y);
  editor.setSymmetry('z', data.settings.symmetry.z);
  for (const [key, value] of Object.entries(data.settings.options)) {
    editor.setOption(key as any, value as any);
  }

  // Restore mesh data
  const fullBones = rebuildChildIds(data.bones.map((b) => ({ ...b, childIds: [] })));
  const rootBone = fullBones.find((b) => b.parentId === null);
  mesh.loadBones(fullBones, data.connections, rootBone?.id ?? '');
}

export const ProjectIO = {
  save(): void {
    const data = buildProjectData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name || 'project'}.bmesh`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async load(file: File): Promise<ProjectData> {
    const text = await file.text();
    const data = JSON.parse(text) as ProjectData;
    applyProjectData(data);
    return data;
  },

  newProject(): void {
    const mesh = useMeshStore.getState();
    const editor = useEditorStore.getState();
    mesh.clear();
    editor.resetOptions();
    editor.setBoneDensity(3.2);
    editor.setMeshResolution(64);
    editor.setSelectedBoneId(null);
  },

  enableAutoSave(): void {
    if (autoSaveTimer) return;
    autoSaveTimer = setInterval(() => {
      try {
        const data = buildProjectData();
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
      } catch {
        // localStorage full or unavailable
      }
    }, AUTOSAVE_INTERVAL);
  },

  disableAutoSave(): void {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }
  },

  async loadFromDialog(): Promise<ProjectData | null> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.bmesh,.json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { reject(new Error('No file selected')); return; }
        try {
          const data = await ProjectIO.load(file);
          resolve(data);
        } catch (e) {
          reject(e);
        }
      };
      input.click();
    });
  },

  loadAutoSave(): ProjectData | null {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as ProjectData;
      applyProjectData(data);
      return data;
    } catch {
      return null;
    }
  },
};
