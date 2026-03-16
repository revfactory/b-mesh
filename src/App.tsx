import { useRef, useEffect, useCallback } from 'react';
import EditorLayout from './ui/EditorLayout';
import Viewport from './ui/panels/Viewport';
import LeftPanel from './ui/panels/LeftPanel';
import RightPanel from './ui/panels/RightPanel';
import { useKeyboard } from './ui/hooks/useKeyboard';
import { SceneManager, CameraController, GridHelper, MeshRenderer } from './engine';
import { BoneSystem } from './mesh/BoneSystem';
import { generateBMesh } from './mesh/BMeshLofting';
import { generate as generateSDF } from './mesh/SDFGenerator';
import { extract as extractMC } from './mesh/MarchingCubes';
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
    // 순수 SDF + Marching Cubes — 이음새 없는 단일 등치면
    const sdfRes = Math.max(64, editor.meshResolution);
    const sdfInfo = generateSDF(structure, sdfRes, editor.boneDensity);
    const rawMesh = extractMC(sdfInfo, 0.0, bonesArray);

    // MC는 공유 정점이 없으므로 먼저 용접하여 공유 정점 생성
    const rawVCount = rawMesh.positions.length / 3;
    if (rawVCount === 0) {
      meshRenderer.updateMesh(rawMesh);
      meshStore.setMeshData(rawMesh);
      eventBus.emit('mesh:updated', { meshData: rawMesh });
      return;
    }

    // 정점 용접: 동일 위치 정점 병합 (공간 해싱)
    const weldThresh = sdfInfo.cellSize * 0.01;
    const invCell = 1.0 / (weldThresh || 1);
    const vertexMap = new Int32Array(rawVCount);
    const uniquePos: number[] = [];
    const uniqueCol: number[] = [];
    let uniqueCount = 0;
    const hashGrid = new Map<string, number[]>();

    for (let i = 0; i < rawVCount; i++) {
      const px = rawMesh.positions[i * 3];
      const py = rawMesh.positions[i * 3 + 1];
      const pz = rawMesh.positions[i * 3 + 2];
      const hx = Math.round(px * invCell);
      const hy = Math.round(py * invCell);
      const hz = Math.round(pz * invCell);
      const key = `${hx},${hy},${hz}`;

      let found = -1;
      const bucket = hashGrid.get(key);
      if (bucket) {
        for (const j of bucket) {
          const dx = uniquePos[j * 3] - px;
          const dy = uniquePos[j * 3 + 1] - py;
          const dz = uniquePos[j * 3 + 2] - pz;
          if (dx * dx + dy * dy + dz * dz < weldThresh * weldThresh) {
            found = j;
            break;
          }
        }
      }

      if (found >= 0) {
        vertexMap[i] = found;
      } else {
        vertexMap[i] = uniqueCount;
        uniquePos.push(px, py, pz);
        uniqueCol.push(rawMesh.colors[i * 3], rawMesh.colors[i * 3 + 1], rawMesh.colors[i * 3 + 2]);
        if (!bucket) hashGrid.set(key, [uniqueCount]);
        else bucket.push(uniqueCount);
        uniqueCount++;
      }
    }

    // 인덱스 재매핑
    const weldedIndices = new Uint32Array(rawMesh.indices.length);
    for (let i = 0; i < rawMesh.indices.length; i++) {
      weldedIndices[i] = vertexMap[rawMesh.indices[i]];
    }

    // 퇴화 삼각형 제거
    const cleanIndices: number[] = [];
    for (let i = 0; i < weldedIndices.length; i += 3) {
      const a = weldedIndices[i], b = weldedIndices[i + 1], c = weldedIndices[i + 2];
      if (a !== b && b !== c && a !== c) cleanIndices.push(a, b, c);
    }

    const wPositions = new Float32Array(uniquePos);
    const wColors = new Float32Array(uniqueCol);
    const wIndices = new Uint32Array(cleanIndices);

    // Laplacian 스무딩 (Taubin: 수축 방지)
    {
      const adj: Set<number>[] = new Array(uniqueCount);
      for (let i = 0; i < uniqueCount; i++) adj[i] = new Set();
      for (let i = 0; i < wIndices.length; i += 3) {
        const a = wIndices[i], b = wIndices[i + 1], c = wIndices[i + 2];
        adj[a].add(b); adj[a].add(c);
        adj[b].add(a); adj[b].add(c);
        adj[c].add(a); adj[c].add(b);
      }

      const lam = 0.5, mu = -0.53;
      function smoothPass(factor: number) {
        const np = new Float32Array(uniqueCount * 3);
        for (let i = 0; i < uniqueCount; i++) {
          if (adj[i].size === 0) {
            np[i * 3] = wPositions[i * 3]; np[i * 3 + 1] = wPositions[i * 3 + 1]; np[i * 3 + 2] = wPositions[i * 3 + 2];
            continue;
          }
          let ax = 0, ay = 0, az = 0;
          for (const j of adj[i]) { ax += wPositions[j * 3]; ay += wPositions[j * 3 + 1]; az += wPositions[j * 3 + 2]; }
          const n = adj[i].size;
          np[i * 3] = wPositions[i * 3] + factor * (ax / n - wPositions[i * 3]);
          np[i * 3 + 1] = wPositions[i * 3 + 1] + factor * (ay / n - wPositions[i * 3 + 1]);
          np[i * 3 + 2] = wPositions[i * 3 + 2] + factor * (az / n - wPositions[i * 3 + 2]);
        }
        for (let i = 0; i < uniqueCount * 3; i++) wPositions[i] = np[i];
      }
      for (let iter = 0; iter < 3; iter++) { smoothPass(lam); smoothPass(mu); }
    }

    // 스무스 노멀 재계산 (face-weighted vertex normals)
    const smoothNormals = new Float32Array(uniqueCount * 3);
    for (let i = 0; i < wIndices.length; i += 3) {
      const ia = wIndices[i], ib = wIndices[i + 1], ic = wIndices[i + 2];
      const ax2 = wPositions[ia * 3], ay2 = wPositions[ia * 3 + 1], az2 = wPositions[ia * 3 + 2];
      const bx = wPositions[ib * 3], by = wPositions[ib * 3 + 1], bz = wPositions[ib * 3 + 2];
      const cx2 = wPositions[ic * 3], cy2 = wPositions[ic * 3 + 1], cz2 = wPositions[ic * 3 + 2];
      const e1x = bx - ax2, e1y = by - ay2, e1z = bz - az2;
      const e2x = cx2 - ax2, e2y = cy2 - ay2, e2z = cz2 - az2;
      const fnx = e1y * e2z - e1z * e2y;
      const fny = e1z * e2x - e1x * e2z;
      const fnz = e1x * e2y - e1y * e2x;
      for (const vi of [ia, ib, ic]) {
        smoothNormals[vi * 3] += fnx; smoothNormals[vi * 3 + 1] += fny; smoothNormals[vi * 3 + 2] += fnz;
      }
    }
    for (let i = 0; i < uniqueCount; i++) {
      const nx = smoothNormals[i * 3], ny = smoothNormals[i * 3 + 1], nz = smoothNormals[i * 3 + 2];
      const l = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (l > 1e-8) { smoothNormals[i * 3] /= l; smoothNormals[i * 3 + 1] /= l; smoothNormals[i * 3 + 2] /= l; }
    }

    const meshData = {
      positions: wPositions,
      normals: smoothNormals,
      indices: wIndices,
      colors: wColors,
    };

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
