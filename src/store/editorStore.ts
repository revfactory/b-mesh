// ============================================================
// B-Mesh Editor Store - 도구/옵션/설정 상태
// ============================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { EditorState } from './types';
import type { EditorOptions, SymmetryState } from '../mesh/types';

const DEFAULT_OPTIONS: EditorOptions = {
  stretchMode: true,
  showGrid: false,
  wireframe: false,
  vertexView: false,
  hideMasked: true,
  meshPreview: false,
};

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    activeTool: 'select',
    symmetry: { x: true, y: false, z: false },
    options: { ...DEFAULT_OPTIONS },
    boneDensity: 1.2,
    meshResolution: 64,
    selectedBoneId: null,

    setActiveTool: (tool) =>
      set((state) => {
        state.activeTool = tool;
      }),

    setSymmetry: (axis: keyof SymmetryState, value: boolean) =>
      set((state) => {
        state.symmetry[axis] = value;
      }),

    setOption: <K extends keyof EditorOptions>(key: K, value: EditorOptions[K]) =>
      set((state: EditorState) => {
        state.options[key] = value;
      }),

    setBoneDensity: (density) =>
      set((state) => {
        state.boneDensity = Math.max(0.1, Math.min(10.0, density));
      }),

    setMeshResolution: (resolution) =>
      set((state) => {
        state.meshResolution = Math.max(8, Math.min(128, resolution));
      }),

    setSelectedBoneId: (id) =>
      set((state) => {
        state.selectedBoneId = id;
      }),

    resetOptions: () =>
      set((state) => {
        state.options = { ...DEFAULT_OPTIONS };
      }),
  }))
);
