import { useRef, useEffect, useCallback } from 'react';
import EditorLayout from './ui/EditorLayout';
import Viewport from './ui/panels/Viewport';
import LeftPanel from './ui/panels/LeftPanel';
import RightPanel from './ui/panels/RightPanel';
import { useKeyboard } from './ui/hooks/useKeyboard';
import { SceneManager, CameraController, GridHelper, MeshRenderer } from './engine';
import { BoneSystem } from './mesh/BoneSystem';
import { generateBMesh } from './mesh/BMeshLofting';
import { useEditorStore } from './store/editorStore';
import { useMeshStore } from './store/meshStore';
import { ProjectIO } from './io/ProjectIO';
import { eventBus } from './core/EventBus';
import { BIPED_PRESET } from './mesh/Presets';

export default function App() {
  const sceneRef = useRef<SceneManager | null>(null);
  const cameraRef = useRef<CameraController | null>(null);
  const rendererRef = useRef<MeshRenderer | null>(null);
  const gridRef = useRef<GridHelper | null>(null);
  const boneSystemRef = useRef<BoneSystem>(new BoneSystem());

  useKeyboard();

  const regenerateMesh = useCallback(() => {
    const meshRenderer = rendererRef.current;
    const boneSystem = boneSystemRef.current;
    if (!meshRenderer) return;

    const editor = useEditorStore.getState();
    const meshStore = useMeshStore.getState();

    // Sync BoneSystem from store
    const bonesArray = Array.from(meshStore.bones.values());
    boneSystem.loadBones(bonesArray, meshStore.connections);

    if (bonesArray.length === 0) return;

    const structure = boneSystem.structure;
    const meshData = generateBMesh(structure, editor.boneDensity, Math.max(4, Math.floor(editor.meshResolution / 8)));

    meshRenderer.updateMesh(meshData);
    meshStore.setMeshData(meshData);
    eventBus.emit('mesh:updated', { meshData });
  }, []);

  const loadBipedPreset = useCallback(() => {
    const meshStore = useMeshStore.getState();
    const { bones, connections } = BIPED_PRESET;
    // Build childIds from parentId relationships
    const fullBones = bones.map(b => ({ ...b, childIds: [] as string[] }));
    for (const b of fullBones) {
      if (b.parentId) {
        const parent = fullBones.find(p => p.id === b.parentId);
        if (parent) parent.childIds.push(b.id);
      }
    }
    const rootBone = fullBones.find(b => b.parentId === null);
    meshStore.loadBones(fullBones, connections, rootBone?.id ?? '');
    regenerateMesh();
  }, [regenerateMesh]);

  const handleMount = useCallback((container: HTMLDivElement) => {
    // SceneManager
    const scene = new SceneManager();
    scene.init(container);
    sceneRef.current = scene;

    // Camera
    const camera = new CameraController(scene);
    cameraRef.current = camera;

    // Grid
    const grid = new GridHelper();
    scene.addObject(grid.getObject());
    gridRef.current = grid;

    // MeshRenderer
    const meshRenderer = new MeshRenderer(scene);
    rendererRef.current = meshRenderer;

    // Load Biped preset
    loadBipedPreset();

    // Auto-save
    ProjectIO.enableAutoSave();

    // Subscribe to store changes for mesh regeneration
    let prevDensity = useEditorStore.getState().boneDensity;
    let prevResolution = useEditorStore.getState().meshResolution;
    const unsubEditor = useEditorStore.subscribe((state) => {
      if (state.boneDensity !== prevDensity || state.meshResolution !== prevResolution) {
        prevDensity = state.boneDensity;
        prevResolution = state.meshResolution;
        regenerateMesh();
      }
      grid.setVisible(state.options.showGrid);
      if (state.options.vertexView) {
        meshRenderer.setMode('vertex');
      } else if (state.options.wireframe) {
        meshRenderer.setMode('wireframe');
      } else {
        meshRenderer.setMode('solid');
      }
      meshRenderer.setPreview(state.options.meshPreview);
    });

    let prevBoneCount = useMeshStore.getState().bones.size;
    const unsubMesh = useMeshStore.subscribe((state) => {
      if (state.bones.size !== prevBoneCount) {
        prevBoneCount = state.bones.size;
        regenerateMesh();
      }
    });

    // EventBus listeners
    eventBus.on('camera:setView', ({ direction }) => {
      camera.setView(direction as '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z');
    });

    eventBus.on('preset:load', () => {
      loadBipedPreset();
    });

    eventBus.on('project:new', () => {
      ProjectIO.newProject();
      meshRenderer.updateMesh({ positions: new Float32Array(0), normals: new Float32Array(0), indices: new Uint32Array(0), colors: new Float32Array(0) });
    });

    eventBus.on('project:export', () => {
      ProjectIO.save();
    });

    eventBus.on('project:import', () => {
      ProjectIO.loadFromDialog().then(() => {
        regenerateMesh();
      }).catch(() => {});
    });

    // Store cleanup references
    (container as any).__bmeshCleanup = () => {
      unsubEditor();
      unsubMesh();
      eventBus.clear();
      ProjectIO.disableAutoSave();
      meshRenderer.dispose();
      camera.dispose();
      scene.dispose();
    };
  }, [loadBipedPreset, regenerateMesh]);

  const handleUnmount = useCallback(() => {
    const scene = sceneRef.current;
    if (scene) {
      const container = scene.getContainer();
      if (container) {
        (container as any).__bmeshCleanup?.();
      }
    }
    sceneRef.current = null;
    cameraRef.current = null;
    rendererRef.current = null;
    gridRef.current = null;
  }, []);

  return (
    <EditorLayout
      left={<LeftPanel />}
      viewport={<Viewport onMount={handleMount} onUnmount={handleUnmount} />}
      right={<RightPanel />}
    />
  );
}
