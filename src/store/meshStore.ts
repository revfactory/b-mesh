// ============================================================
// B-Mesh Mesh Store - 본/연결/메시 데이터 상태
// ============================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { MeshState } from './types';
import type { Bone, Vec3 } from '../mesh/types';

let boneCounter = 0;
const generateBoneId = (): string => `bone_${++boneCounter}_${Date.now().toString(36)}`;

export const useMeshStore = create<MeshState>()(
  immer((set) => ({
    bones: new Map<string, Bone>(),
    connections: [],
    rootId: null,
    meshData: null,

    addBone: (position: Vec3, radius: number, parentId?: string) => {
      const id = generateBoneId();
      set((state) => {
        const bone: Bone = {
          id,
          name: `Bone ${state.bones.size + 1}`,
          position,
          radius,
          parentId: parentId ?? null,
          childIds: [],
          color: [0.8, 0.8, 0.2],
          masked: false,
        };
        state.bones.set(id, bone);

        if (parentId) {
          const parent = state.bones.get(parentId);
          if (parent) {
            parent.childIds.push(id);
          }
        }

        if (state.rootId === null) {
          state.rootId = id;
        }
      });
      return id;
    },

    removeBone: (id) =>
      set((state) => {
        const bone = state.bones.get(id);
        if (!bone) return;

        // Remove from parent's childIds
        if (bone.parentId) {
          const parent = state.bones.get(bone.parentId);
          if (parent) {
            parent.childIds = parent.childIds.filter((cid) => cid !== id);
          }
        }

        // Reparent children to this bone's parent
        for (const childId of bone.childIds) {
          const child = state.bones.get(childId);
          if (child) {
            child.parentId = bone.parentId;
            if (bone.parentId) {
              const parent = state.bones.get(bone.parentId);
              if (parent && !parent.childIds.includes(childId)) {
                parent.childIds.push(childId);
              }
            }
          }
        }

        // Remove connections involving this bone
        state.connections = state.connections.filter(
          (c) => c.boneA !== id && c.boneB !== id
        );

        state.bones.delete(id);

        if (state.rootId === id) {
          state.rootId = state.bones.size > 0 ? state.bones.keys().next().value ?? null : null;
        }
      }),

    updateBone: (id, updates) =>
      set((state) => {
        const bone = state.bones.get(id);
        if (bone) {
          Object.assign(bone, updates);
        }
      }),

    addConnection: (boneA, boneB, strength = 1.0) =>
      set((state) => {
        const exists = state.connections.some(
          (c) =>
            (c.boneA === boneA && c.boneB === boneB) ||
            (c.boneA === boneB && c.boneB === boneA)
        );
        if (!exists) {
          state.connections.push({ boneA, boneB, strength });
        }
      }),

    removeConnection: (boneA, boneB) =>
      set((state) => {
        state.connections = state.connections.filter(
          (c) =>
            !(
              (c.boneA === boneA && c.boneB === boneB) ||
              (c.boneA === boneB && c.boneB === boneA)
            )
        );
      }),

    setMeshData: (data) =>
      set((state) => {
        state.meshData = data;
      }),

    loadBones: (bones, connections, rootId) =>
      set((state) => {
        state.bones = new Map(bones.map((b) => [b.id, b]));
        state.connections = connections;
        state.rootId = rootId;
      }),

    clear: () =>
      set((state) => {
        state.bones = new Map();
        state.connections = [];
        state.rootId = null;
        state.meshData = null;
      }),

    applyEdit: (edit) =>
      set((state) => {
        const bone = state.bones.get(edit.boneId);
        if (!bone) return;
        switch (edit.type) {
          case 'move':
            bone.position = edit.position;
            break;
          case 'scale':
            bone.radius = edit.radius;
            break;
          case 'color':
            bone.color = edit.color;
            break;
          case 'mask':
            bone.masked = edit.masked;
            break;
        }
      }),
  }))
);
