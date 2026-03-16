// ============================================================
// B-Mesh Cross-section Lofting — 개선된 구현
// 접합점에서 링을 공유하여 연속 메시 생성
// ============================================================

import type { BoneStructure, Bone, BoneConnection, MeshData, Vec3 } from './types';
import {
  add, sub, scale, normalize, cross, dot, length, lerp, distance,
} from '../core/math';

const N_GON = 12;
const TWO_PI = Math.PI * 2;
const EPSILON = 1e-8;

// ─── 기저 함수 ─────────────────────────────────────────

function orthonormalBasis(dir: Vec3): [Vec3, Vec3] {
  const absDir: Vec3 = [Math.abs(dir[0]), Math.abs(dir[1]), Math.abs(dir[2])];
  let up: Vec3;
  if (absDir[0] <= absDir[1] && absDir[0] <= absDir[2]) up = [1, 0, 0];
  else if (absDir[1] <= absDir[2]) up = [0, 1, 0];
  else up = [0, 0, 1];
  const u = normalize(cross(dir, up));
  const v = normalize(cross(dir, u));
  return [u, v];
}

function createRing(center: Vec3, u: Vec3, v: Vec3, radius: number): Vec3[] {
  const ring: Vec3[] = [];
  for (let i = 0; i < N_GON; i++) {
    const angle = (TWO_PI * i) / N_GON;
    ring.push(add(center, add(scale(u, Math.cos(angle) * radius), scale(v, Math.sin(angle) * radius))));
  }
  return ring;
}

function ringCenter(ring: Vec3[]): Vec3 {
  let cx = 0, cy = 0, cz = 0;
  for (const p of ring) { cx += p[0]; cy += p[1]; cz += p[2]; }
  const n = ring.length;
  return [cx / n, cy / n, cz / n];
}

/** 링B를 회전하여 링A와 최소 비틀림으로 정렬 */
function alignRing(ringA: Vec3[], ringB: Vec3[]): Vec3[] {
  const n = ringA.length;
  let bestShift = 0, bestDist = Infinity;
  for (let shift = 0; shift < n; shift++) {
    let total = 0;
    for (let i = 0; i < n; i++) total += distance(ringA[i], ringB[(i + shift) % n]);
    if (total < bestDist) { bestDist = total; bestShift = shift; }
  }
  if (bestShift === 0) return ringB;
  return ringB.map((_, i) => ringB[(i + bestShift) % n]);
}

// ─── 메시 빌더 ─────────────────────────────────────────

interface MeshBuilder {
  positions: number[];
  normals: number[];
  indices: number[];
  colors: number[];
  vertexCount: number;
}

function createBuilder(): MeshBuilder {
  return { positions: [], normals: [], indices: [], colors: [], vertexCount: 0 };
}

function pushVertex(b: MeshBuilder, pos: Vec3, normal: Vec3, color: Vec3): number {
  const idx = b.vertexCount++;
  b.positions.push(pos[0], pos[1], pos[2]);
  b.normals.push(normal[0], normal[1], normal[2]);
  b.colors.push(color[0], color[1], color[2]);
  return idx;
}

/** 링 정점들을 빌더에 추가하고 인덱스 배열 반환 */
function pushRing(b: MeshBuilder, ring: Vec3[], color: Vec3): number[] {
  const center = ringCenter(ring);
  const indices: number[] = [];
  for (const p of ring) {
    const normal = normalize(sub(p, center));
    indices.push(pushVertex(b, p, normal, color));
  }
  return indices;
}

/** 두 인덱스 배열의 링을 쿼드로 연결 */
function bridgeRingIndices(b: MeshBuilder, idxA: number[], idxB: number[]): void {
  const n = idxA.length;
  for (let i = 0; i < n; i++) {
    const i1 = (i + 1) % n;
    b.indices.push(idxA[i], idxB[i], idxB[i1]);
    b.indices.push(idxA[i], idxB[i1], idxA[i1]);
  }
}

// ─── 인접성 유틸 ───────────────────────────────────────

function getNeighborIds(boneId: string, connections: BoneConnection[]): string[] {
  const neighbors: string[] = [];
  for (const c of connections) {
    if (c.boneA === boneId) neighbors.push(c.boneB);
    else if (c.boneB === boneId) neighbors.push(c.boneA);
  }
  return neighbors;
}

// ─── 핵심: 연속 튜브 생성 ──────────────────────────────

/**
 * 본 체인(leaf→...→branch 또는 leaf→...→leaf)을 따라 연속 튜브 생성.
 * 각 본 위치에 하나의 공유 링을 만들어 인접 세그먼트가 정점을 공유한다.
 */
function generateChainTube(
  b: MeshBuilder,
  chain: Bone[],   // 연속 본 배열 (최소 2개)
  density: number,
  segments: number,
): { startRing: Vec3[]; endRing: Vec3[]; startIndices: number[]; endIndices: number[] } {
  // 체인 전체 방향으로 일관된 기저 벡터 계산
  const overallDir = normalize(sub(chain[chain.length - 1].position, chain[0].position));
  const [baseU, baseV] = orthonormalBasis(overallDir);

  // 각 본 위치에 링 생성
  const boneRings: Vec3[][] = [];
  for (let ci = 0; ci < chain.length; ci++) {
    const bone = chain[ci];
    // 로컬 방향: 인접 본 사이의 방향
    let localDir: Vec3;
    if (ci === 0) {
      localDir = normalize(sub(chain[1].position, bone.position));
    } else if (ci === chain.length - 1) {
      localDir = normalize(sub(bone.position, chain[ci - 1].position));
    } else {
      localDir = normalize(sub(chain[ci + 1].position, chain[ci - 1].position));
    }
    const [u, v] = orthonormalBasis(localDir);
    const radius = bone.radius * density;
    boneRings.push(createRing(bone.position, u, v, radius));
  }

  // 링 정렬 (비틀림 최소화)
  for (let i = 1; i < boneRings.length; i++) {
    boneRings[i] = alignRing(boneRings[i - 1], boneRings[i]);
  }

  // 각 본 쌍 사이에 중간 프레임 생성 및 브리지
  let prevRingIndices: number[] | null = null;
  let firstRingIndices: number[] | null = null;

  for (let ci = 0; ci < chain.length - 1; ci++) {
    const boneA = chain[ci];
    const boneB = chain[ci + 1];
    const ringA = boneRings[ci];
    const ringB = boneRings[ci + 1];

    // boneA 위치의 링 (첫 세그먼트이거나 이전과 공유)
    let currentIndices: number[];
    if (prevRingIndices) {
      currentIndices = prevRingIndices;  // 이전 세그먼트의 끝 링 재사용
    } else {
      const colorA = boneA.color;
      currentIndices = pushRing(b, ringA, colorA);
      firstRingIndices = currentIndices;
    }

    // 중간 프레임 생성 + 브리지
    const localDir = normalize(sub(boneB.position, boneA.position));
    const [mu, mv] = orthonormalBasis(localDir);

    for (let s = 1; s <= segments; s++) {
      const t = s / segments;
      const center = lerp(boneA.position, boneB.position, t);
      const radius = boneA.radius * (1 - t) + boneB.radius * t;
      const color: Vec3 = lerp(boneA.color, boneB.color, t);

      let ring: Vec3[];
      if (s === segments) {
        // 마지막 링 = boneB 위치의 프리셋 링 사용
        ring = ringB;
      } else {
        ring = createRing(center, mu, mv, radius * density);
        ring = alignRing(boneRings[ci], ring);
      }

      const newIndices = pushRing(b, ring, color);
      bridgeRingIndices(b, currentIndices, newIndices);
      currentIndices = newIndices;
    }

    prevRingIndices = currentIndices;
  }

  return {
    startRing: boneRings[0],
    endRing: boneRings[boneRings.length - 1],
    startIndices: firstRingIndices!,
    endIndices: prevRingIndices!,
  };
}

// ─── 분기 노드 브리징 ──────────────────────────────────

function generateBranchBridge(
  b: MeshBuilder,
  branchBone: Bone,
  neighborBones: Bone[],
  density: number,
  neighborRingIndices: Map<string, number[]>,
): void {
  const center = branchBone.position;
  const radius = branchBone.radius * density;
  const color = branchBone.color;

  // 분기점에 작은 구체 생성 (4 stacks으로 가벼움)
  const stacks = 4, slices = N_GON;
  const sphereStartIdx = b.vertexCount;
  for (let lat = 0; lat <= stacks; lat++) {
    const theta = (Math.PI * lat) / stacks;
    const sinT = Math.sin(theta), cosT = Math.cos(theta);
    for (let lon = 0; lon <= slices; lon++) {
      const phi = (TWO_PI * lon) / slices;
      const x = sinT * Math.cos(phi), y = cosT, z = sinT * Math.sin(phi);
      const normal: Vec3 = [x, y, z];
      pushVertex(b, add(center, scale(normal, radius * 0.7)), normal, color);
    }
  }
  // 구체 면 생성
  for (let lat = 0; lat < stacks; lat++) {
    for (let lon = 0; lon < slices; lon++) {
      const a = sphereStartIdx + lat * (slices + 1) + lon;
      const c = a + slices + 1;
      b.indices.push(a, c, a + 1);
      b.indices.push(a + 1, c, c + 1);
    }
  }

  // 각 이웃 방향의 튜브 끝 링을 구체의 적도 부근 링과 연결
  for (const nb of neighborBones) {
    const existingIndices = neighborRingIndices.get(nb.id);
    if (!existingIndices) continue;

    // 이웃 방향의 중간 링 생성 (튜브 끝과 구체 사이)
    const dir = normalize(sub(nb.position, center));
    const [u, v] = orthonormalBasis(dir);
    const midCenter = add(center, scale(dir, radius * 0.5));
    const midRing = createRing(midCenter, u, v, radius * 0.85);
    const alignedMid = alignRing(
      existingIndices.map(idx => [
        b.positions[idx * 3], b.positions[idx * 3 + 1], b.positions[idx * 3 + 2]
      ] as Vec3),
      midRing
    );
    const midIndices = pushRing(b, alignedMid, color);

    // 튜브 끝 링 → 중간 링 브리지
    bridgeRingIndices(b, existingIndices, midIndices);
  }
}

function generateSphereMesh(b: MeshBuilder, center: Vec3, radius: number, color: Vec3): void {
  const stacks = 6, slices = N_GON;
  const startIdx = b.vertexCount;
  for (let lat = 0; lat <= stacks; lat++) {
    const theta = (Math.PI * lat) / stacks;
    const sinT = Math.sin(theta), cosT = Math.cos(theta);
    for (let lon = 0; lon <= slices; lon++) {
      const phi = (TWO_PI * lon) / slices;
      const x = sinT * Math.cos(phi), y = cosT, z = sinT * Math.sin(phi);
      const normal: Vec3 = [x, y, z];
      pushVertex(b, add(center, scale(normal, radius)), normal, color);
    }
  }
  for (let lat = 0; lat < stacks; lat++) {
    for (let lon = 0; lon < slices; lon++) {
      const a = startIdx + lat * (slices + 1) + lon;
      const c = a + slices + 1;
      b.indices.push(a, c, a + 1);
      b.indices.push(a + 1, c, c + 1);
    }
  }
}

/** 리프 노드 캡 */
function generateEndCap(b: MeshBuilder, ringIndices: number[], ring: Vec3[], bone: Bone, outDir: Vec3, density: number): void {
  const tipPos = add(bone.position, scale(outDir, bone.radius * density * 0.5));
  const tipIdx = pushVertex(b, tipPos, outDir, bone.color);
  const n = ringIndices.length;
  for (let i = 0; i < n; i++) {
    const i1 = (i + 1) % n;
    b.indices.push(tipIdx, ringIndices[i1], ringIndices[i]);
  }
}

// ─── Laplacian 스무딩 ────────────────────────────────────

/** Taubin 스무딩: λ|μ 교대 적용으로 수축 없이 스무딩
 *  λ > 0 (스무딩), μ < 0 (팽창)을 교대 적용 */
function taubinSmooth(builder: MeshBuilder, iterations: number = 5): void {
  const vc = builder.vertexCount;
  const lambda = 0.5;   // 스무딩 강도
  const mu = -0.53;     // 팽창 강도 (|μ| > λ 이면 수축 방지)

  // 인접 정점 맵 구축
  const adj: Set<number>[] = new Array(vc);
  for (let i = 0; i < vc; i++) adj[i] = new Set();
  for (let i = 0; i < builder.indices.length; i += 3) {
    const a = builder.indices[i], b2 = builder.indices[i + 1], c = builder.indices[i + 2];
    adj[a].add(b2); adj[a].add(c);
    adj[b2].add(a); adj[b2].add(c);
    adj[c].add(a); adj[c].add(b2);
  }

  // 리프 캡 팁 등 경계 정점 고정
  const pinned = new Uint8Array(vc);
  for (let i = 0; i < vc; i++) {
    if (adj[i].size <= 2) pinned[i] = 1;
  }

  function smoothPass(factor: number): void {
    const newPos = new Float64Array(vc * 3);
    for (let i = 0; i < vc; i++) {
      const px = builder.positions[i * 3], py = builder.positions[i * 3 + 1], pz = builder.positions[i * 3 + 2];
      if (pinned[i] || adj[i].size === 0) {
        newPos[i * 3] = px; newPos[i * 3 + 1] = py; newPos[i * 3 + 2] = pz;
        continue;
      }
      let ax = 0, ay = 0, az = 0;
      for (const j of adj[i]) {
        ax += builder.positions[j * 3]; ay += builder.positions[j * 3 + 1]; az += builder.positions[j * 3 + 2];
      }
      const n = adj[i].size;
      ax /= n; ay /= n; az /= n;
      newPos[i * 3]     = px + factor * (ax - px);
      newPos[i * 3 + 1] = py + factor * (ay - py);
      newPos[i * 3 + 2] = pz + factor * (az - pz);
    }
    for (let i = 0; i < vc * 3; i++) builder.positions[i] = newPos[i];
  }

  for (let iter = 0; iter < iterations; iter++) {
    smoothPass(lambda);  // 스무딩
    smoothPass(mu);      // 팽창 (수축 보정)
  }
}

// ─── 스무스 노멀 ───────────────────────────────────────

function recomputeSmoothNormals(builder: MeshBuilder): void {
  const vc = builder.vertexCount;
  const normals = new Float32Array(vc * 3);
  for (let i = 0; i < builder.indices.length; i += 3) {
    const ia = builder.indices[i], ib = builder.indices[i + 1], ic = builder.indices[i + 2];
    const pa: Vec3 = [builder.positions[ia*3], builder.positions[ia*3+1], builder.positions[ia*3+2]];
    const pb: Vec3 = [builder.positions[ib*3], builder.positions[ib*3+1], builder.positions[ib*3+2]];
    const pc: Vec3 = [builder.positions[ic*3], builder.positions[ic*3+1], builder.positions[ic*3+2]];
    const fn = cross(sub(pb, pa), sub(pc, pa));
    for (const idx of [ia, ib, ic]) {
      normals[idx*3] += fn[0]; normals[idx*3+1] += fn[1]; normals[idx*3+2] += fn[2];
    }
  }
  for (let i = 0; i < vc; i++) {
    const x = normals[i*3], y = normals[i*3+1], z = normals[i*3+2];
    const len = Math.sqrt(x*x + y*y + z*z);
    if (len > EPSILON) { normals[i*3] = x/len; normals[i*3+1] = y/len; normals[i*3+2] = z/len; }
  }
  builder.normals = Array.from(normals);
}

// ─── 체인 탐색: leaf→branch 또는 leaf→leaf ─────────────

function findChains(
  bones: Map<string, Bone>,
  connections: BoneConnection[],
  adjacency: Map<string, string[]>,
): Bone[][] {
  const chains: Bone[][] = [];
  const visitedEdges = new Set<string>();

  // 시작점: leaf(degree 1) 또는 branch(degree 3+)
  const startNodes: string[] = [];
  for (const [id, neighbors] of adjacency) {
    if (neighbors.length !== 2) startNodes.push(id);
  }

  // 각 시작 노드에서 각 방향으로 체인 추적
  for (const startId of startNodes) {
    const neighbors = adjacency.get(startId)!;
    for (const nextId of neighbors) {
      const edgeKey = startId < nextId ? `${startId}-${nextId}` : `${nextId}-${startId}`;
      if (visitedEdges.has(edgeKey)) continue;

      // 체인 추적
      const chain: Bone[] = [];
      const startBone = bones.get(startId);
      if (!startBone || startBone.masked) continue;
      chain.push(startBone);

      let prevId = startId;
      let currentId = nextId;

      while (true) {
        const ek = prevId < currentId ? `${prevId}-${currentId}` : `${currentId}-${prevId}`;
        visitedEdges.add(ek);

        const currentBone = bones.get(currentId);
        if (!currentBone || currentBone.masked) break;
        chain.push(currentBone);

        const currentNeighbors = adjacency.get(currentId)!;
        if (currentNeighbors.length !== 2) break; // branch 또는 leaf에서 종료

        // 다음 본으로 이동 (이전이 아닌 쪽)
        const nextIds = currentNeighbors.filter(id => id !== prevId);
        if (nextIds.length === 0) break;
        prevId = currentId;
        currentId = nextIds[0];
      }

      if (chain.length >= 2) chains.push(chain);
    }
  }

  return chains;
}

// ─── 메인 파이프라인 ───────────────────────────────────

export function generateBMesh(
  structure: BoneStructure,
  density: number,
  segments: number = 6,
): MeshData {
  const builder = createBuilder();
  const { bones, connections } = structure;

  if (bones.size === 0) {
    return {
      positions: new Float32Array(0),
      normals: new Float32Array(0),
      indices: new Uint32Array(0),
      colors: new Float32Array(0),
    };
  }

  const d = Math.max(0.3, Math.min(density, 5.0));

  // 인접 목록
  const adjacency = new Map<string, string[]>();
  for (const bone of bones.values()) {
    adjacency.set(bone.id, getNeighborIds(bone.id, connections));
  }

  // ── 1. 체인 탐색 ──
  const chains = findChains(bones, connections, adjacency);

  // 각 본의 체인 끝 링 인덱스를 추적 (분기점 브리징용)
  const boneEndRingIndices = new Map<string, number[]>();
  const boneEndRings = new Map<string, Vec3[]>();

  // ── 2. 각 체인에 대해 연속 튜브 생성 ──
  for (const chain of chains) {
    const result = generateChainTube(builder, chain, d, segments);

    // 체인의 시작/끝 본 ID와 링 인덱스 기록
    const startBone = chain[0];
    const endBone = chain[chain.length - 1];

    boneEndRingIndices.set(`${startBone.id}→${chain[1].id}`, result.startIndices);
    boneEndRings.set(`${startBone.id}→${chain[1].id}`, result.startRing);

    boneEndRingIndices.set(`${endBone.id}→${chain[chain.length - 2].id}`, result.endIndices);
    boneEndRings.set(`${endBone.id}→${chain[chain.length - 2].id}`, result.endRing);

    // ── 리프 노드 캡 ──
    const startDeg = adjacency.get(startBone.id)?.length ?? 0;
    const endDeg = adjacency.get(endBone.id)?.length ?? 0;

    if (startDeg === 1) {
      const outDir = normalize(sub(startBone.position, chain[1].position));
      generateEndCap(builder, result.startIndices, result.startRing, startBone, outDir, d);
    }
    if (endDeg === 1) {
      const outDir = normalize(sub(endBone.position, chain[chain.length - 2].position));
      generateEndCap(builder, result.endIndices, result.endRing, endBone, outDir, d);
    }
  }

  // ── 3. 분기 노드 브리징 ──
  for (const [boneId, neighborIds] of adjacency) {
    if (neighborIds.length < 3) continue;
    const bone = bones.get(boneId);
    if (!bone || bone.masked) continue;

    const validNeighbors: Bone[] = [];
    const ringIndicesMap = new Map<string, number[]>();

    for (const nid of neighborIds) {
      const nb = bones.get(nid);
      if (!nb || nb.masked) continue;
      validNeighbors.push(nb);

      // 이 분기 본에서 해당 이웃 방향으로 나가는 체인의 끝 링 찾기
      const key = `${boneId}→${nid}`;
      const indices = boneEndRingIndices.get(key);
      if (indices) ringIndicesMap.set(nid, indices);
    }

    if (validNeighbors.length >= 2) {
      generateBranchBridge(builder, bone, validNeighbors, d, ringIndicesMap);
    }
  }

  // ── 4. 고립 본 → 구 ──
  for (const bone of bones.values()) {
    if (bone.masked) continue;
    const neighbors = adjacency.get(bone.id);
    if (!neighbors || neighbors.length === 0) {
      generateSphereMesh(builder, bone.position, bone.radius * d, bone.color);
    }
  }

  // ── 5. Taubin 스무딩 (수축 없는 스무딩, 5회) ──
  taubinSmooth(builder, 5);

  // ── 6. 스무스 노멀 ──
  recomputeSmoothNormals(builder);

  return {
    positions: new Float32Array(builder.positions),
    normals: new Float32Array(builder.normals),
    indices: new Uint32Array(builder.indices),
    colors: new Float32Array(builder.colors),
  };
}
