// ============================================================
// B-Mesh Cross-section Lofting — 튜브 관통 + 정점 용접 방식
// 분기점에서 튜브를 관통시키고 정점 용접으로 자연스러운 접합
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

// ─── 핵심: 연속 튜브 생성 (분기점 관통 포함) ─────────────

/**
 * 본 체인(leaf→...→branch 또는 leaf→...→leaf)을 따라 연속 튜브 생성.
 * 분기점(degree >= 3)이 체인 끝에 있으면, 튜브를 분기점 중심 안쪽으로
 * 약간 더 연장하여 여러 튜브가 분기점에서 겹치도록 한다.
 */
function generateChainTube(
  b: MeshBuilder,
  chain: Bone[],
  density: number,
  segments: number,
  adjacency: Map<string, string[]>,
): { startRing: Vec3[]; endRing: Vec3[]; startIndices: number[]; endIndices: number[] } {
  const overallDir = normalize(sub(chain[chain.length - 1].position, chain[0].position));
  const [baseU, baseV] = orthonormalBasis(overallDir);

  // 체인 시작/끝이 분기점인지 확인
  const startDeg = adjacency.get(chain[0].id)?.length ?? 0;
  const endDeg = adjacency.get(chain[chain.length - 1].id)?.length ?? 0;
  const startIsBranch = startDeg >= 3;
  const endIsBranch = endDeg >= 3;

  // 관통 깊이/테이퍼 설정
  const penetrationSteps = 3;       // 관통 링 개수
  const penetrationMaxDepth = 0.5;  // 최대 관통 깊이 (반지름 비율)
  const penetrationMinRadius = 0.3; // 관통 끝 반지름 비율

  // 각 본 위치에 링 생성 (분기점이면 관통 위치 추가)
  const boneRings: Vec3[][] = [];
  const ringColors: Vec3[] = [];

  // 분기점 관통: 시작이 분기점이면 체인 반대 방향으로 여러 테이퍼 링 추가
  if (startIsBranch) {
    const bone = chain[0];
    const dirInward = normalize(sub(bone.position, chain[1].position));
    const baseRadius = bone.radius * density;
    const [u, v] = orthonormalBasis(dirInward);
    // 가장 안쪽(좁은)부터 바깥쪽(넓은)으로
    for (let step = penetrationSteps; step >= 1; step--) {
      const t = step / penetrationSteps;
      const depth = baseRadius * penetrationMaxDepth * t;
      const radius = baseRadius * (penetrationMinRadius + (1 - penetrationMinRadius) * (1 - t));
      const center = add(bone.position, scale(dirInward, depth));
      boneRings.push(createRing(center, u, v, radius));
      ringColors.push(bone.color);
    }
  }

  for (let ci = 0; ci < chain.length; ci++) {
    const bone = chain[ci];
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
    ringColors.push(bone.color);
  }

  // 분기점 관통: 끝이 분기점이면 체인 진행 방향으로 여러 테이퍼 링 추가
  if (endIsBranch) {
    const bone = chain[chain.length - 1];
    const dirInward = normalize(sub(bone.position, chain[chain.length - 2].position));
    const baseRadius = bone.radius * density;
    const [u, v] = orthonormalBasis(dirInward);
    // 바깥쪽(넓은)부터 안쪽(좁은)으로
    for (let step = 1; step <= penetrationSteps; step++) {
      const t = step / penetrationSteps;
      const depth = baseRadius * penetrationMaxDepth * t;
      const radius = baseRadius * (penetrationMinRadius + (1 - penetrationMinRadius) * (1 - t));
      const center = add(bone.position, scale(dirInward, depth));
      boneRings.push(createRing(center, u, v, radius));
      ringColors.push(bone.color);
    }
  }

  // 링 정렬 (비틀림 최소화)
  for (let i = 1; i < boneRings.length; i++) {
    boneRings[i] = alignRing(boneRings[i - 1], boneRings[i]);
  }

  // 각 링 쌍 사이를 세그먼트로 보간 + 브리지
  let prevRingIndices: number[] | null = null;
  let firstRingIndices: number[] | null = null;

  for (let ci = 0; ci < boneRings.length - 1; ci++) {
    const ringA = boneRings[ci];
    const ringB = boneRings[ci + 1];
    const colorA = ringColors[ci];
    const colorB = ringColors[ci + 1];

    let currentIndices: number[];
    if (prevRingIndices) {
      currentIndices = prevRingIndices;
    } else {
      currentIndices = pushRing(b, ringA, colorA);
      firstRingIndices = currentIndices;
    }

    // 중간 프레임 생성 + 브리지
    const centerA = ringCenter(ringA);
    const centerB = ringCenter(ringB);
    const localDir = normalize(sub(centerB, centerA));
    const [mu, mv] = orthonormalBasis(localDir);

    // 각 링 쌍의 대략적 반지름 계산
    const radiusA = distance(ringA[0], ringCenter(ringA));
    const radiusB = distance(ringB[0], ringCenter(ringB));

    for (let s = 1; s <= segments; s++) {
      const t = s / segments;
      const center = lerp(centerA, centerB, t);
      const radius = radiusA * (1 - t) + radiusB * t;
      const color: Vec3 = lerp(colorA, colorB, t);

      let ring: Vec3[];
      if (s === segments) {
        ring = ringB;
      } else {
        ring = createRing(center, mu, mv, radius);
        ring = alignRing(boneRings[ci], ring);
      }

      const newIndices = pushRing(b, ring, color);
      bridgeRingIndices(b, currentIndices, newIndices);
      currentIndices = newIndices;
    }

    prevRingIndices = currentIndices;
  }

  // 실제 체인 본 기준의 시작/끝 링 반환 (관통 링 포함된 상태)
  return {
    startRing: boneRings[0],
    endRing: boneRings[boneRings.length - 1],
    startIndices: firstRingIndices!,
    endIndices: prevRingIndices!,
  };
}

// ─── 정점 용접 (Vertex Welding) ──────────────────────────

/**
 * 거리 threshold 이내의 정점들을 하나로 병합.
 * 공간 해싱(grid hash)으로 효율적으로 가까운 정점을 찾아 Union-Find로 그룹화.
 */
function weldVertices(builder: MeshBuilder, threshold: number = 0.02): void {
  const vc = builder.vertexCount;
  if (vc === 0) return;

  const cellSize = threshold;
  const invCell = 1.0 / cellSize;

  // Union-Find
  const parent = new Int32Array(vc);
  const rank = new Int32Array(vc);
  for (let i = 0; i < vc; i++) parent[i] = i;

  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]; // path compression
      x = parent[x];
    }
    return x;
  }

  function union(a: number, b: number): void {
    const ra = find(a), rb = find(b);
    if (ra === rb) return;
    if (rank[ra] < rank[rb]) parent[ra] = rb;
    else if (rank[ra] > rank[rb]) parent[rb] = ra;
    else { parent[rb] = ra; rank[ra]++; }
  }

  // 공간 해싱: 각 셀에 정점 인덱스 저장
  const grid = new Map<string, number[]>();

  function cellKey(x: number, y: number, z: number): string {
    const cx = Math.floor(x * invCell);
    const cy = Math.floor(y * invCell);
    const cz = Math.floor(z * invCell);
    return `${cx},${cy},${cz}`;
  }

  for (let i = 0; i < vc; i++) {
    const px = builder.positions[i * 3];
    const py = builder.positions[i * 3 + 1];
    const pz = builder.positions[i * 3 + 2];
    const key = cellKey(px, py, pz);
    let list = grid.get(key);
    if (!list) { list = []; grid.set(key, list); }
    list.push(i);
  }

  // 각 정점에 대해 자신의 셀 + 인접 26셀 탐색
  const thresholdSq = threshold * threshold;

  for (let i = 0; i < vc; i++) {
    const px = builder.positions[i * 3];
    const py = builder.positions[i * 3 + 1];
    const pz = builder.positions[i * 3 + 2];
    const cx = Math.floor(px * invCell);
    const cy = Math.floor(py * invCell);
    const cz = Math.floor(pz * invCell);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          const list = grid.get(key);
          if (!list) continue;
          for (const j of list) {
            if (j <= i) continue; // 중복 방지
            const dpx = builder.positions[j * 3] - px;
            const dpy = builder.positions[j * 3 + 1] - py;
            const dpz = builder.positions[j * 3 + 2] - pz;
            if (dpx * dpx + dpy * dpy + dpz * dpz < thresholdSq) {
              union(i, j);
            }
          }
        }
      }
    }
  }

  // 각 그룹의 대표 정점 결정 및 평균 위치/색상 계산
  const groupMembers = new Map<number, number[]>();
  for (let i = 0; i < vc; i++) {
    const root = find(i);
    let members = groupMembers.get(root);
    if (!members) { members = []; groupMembers.set(root, members); }
    members.push(i);
  }

  // 각 그룹의 평균 위치/색상으로 대표 정점 업데이트
  for (const [_root, members] of groupMembers) {
    if (members.length <= 1) continue;
    let ax = 0, ay = 0, az = 0;
    let cr = 0, cg = 0, cb = 0;
    for (const m of members) {
      ax += builder.positions[m * 3];
      ay += builder.positions[m * 3 + 1];
      az += builder.positions[m * 3 + 2];
      cr += builder.colors[m * 3];
      cg += builder.colors[m * 3 + 1];
      cb += builder.colors[m * 3 + 2];
    }
    const n = members.length;
    ax /= n; ay /= n; az /= n;
    cr /= n; cg /= n; cb /= n;
    // 모든 멤버의 위치/색상을 평균으로 설정
    for (const m of members) {
      builder.positions[m * 3] = ax;
      builder.positions[m * 3 + 1] = ay;
      builder.positions[m * 3 + 2] = az;
      builder.colors[m * 3] = cr;
      builder.colors[m * 3 + 1] = cg;
      builder.colors[m * 3 + 2] = cb;
    }
  }

  // 인덱스 재매핑: 각 정점을 그룹의 대표(최소 인덱스)로
  const remap = new Int32Array(vc);
  // 먼저, 새 인덱스 할당 (사용되는 대표 정점만)
  const newIndexOf = new Int32Array(vc).fill(-1);
  let newCount = 0;

  for (let i = 0; i < vc; i++) {
    const root = find(i);
    if (newIndexOf[root] === -1) {
      newIndexOf[root] = newCount++;
    }
    remap[i] = newIndexOf[root];
  }

  // 새 배열 구축
  const newPositions: number[] = new Array(newCount * 3);
  const newNormals: number[] = new Array(newCount * 3);
  const newColors: number[] = new Array(newCount * 3);

  for (let i = 0; i < vc; i++) {
    const root = find(i);
    if (root === i || newIndexOf[root] === remap[i]) {
      const ni = remap[i];
      newPositions[ni * 3] = builder.positions[i * 3];
      newPositions[ni * 3 + 1] = builder.positions[i * 3 + 1];
      newPositions[ni * 3 + 2] = builder.positions[i * 3 + 2];
      newNormals[ni * 3] = builder.normals[i * 3];
      newNormals[ni * 3 + 1] = builder.normals[i * 3 + 1];
      newNormals[ni * 3 + 2] = builder.normals[i * 3 + 2];
      newColors[ni * 3] = builder.colors[i * 3];
      newColors[ni * 3 + 1] = builder.colors[i * 3 + 1];
      newColors[ni * 3 + 2] = builder.colors[i * 3 + 2];
    }
  }

  // 인덱스 재매핑
  for (let i = 0; i < builder.indices.length; i++) {
    builder.indices[i] = remap[builder.indices[i]];
  }

  builder.positions = newPositions;
  builder.normals = newNormals;
  builder.colors = newColors;
  builder.vertexCount = newCount;
}

// ─── 퇴화 삼각형 제거 ────────────────────────────────────

/**
 * 같은 정점을 2개 이상 공유하는 삼각형(면적 0) 제거
 */
function removeDegenerateTriangles(builder: MeshBuilder): void {
  const newIndices: number[] = [];
  for (let i = 0; i < builder.indices.length; i += 3) {
    const a = builder.indices[i];
    const b2 = builder.indices[i + 1];
    const c = builder.indices[i + 2];
    // 같은 정점이 2개 이상이면 퇴화
    if (a === b2 || b2 === c || a === c) continue;

    // 면적이 거의 0인 삼각형도 제거
    const pa: Vec3 = [
      builder.positions[a * 3], builder.positions[a * 3 + 1], builder.positions[a * 3 + 2]
    ];
    const pb: Vec3 = [
      builder.positions[b2 * 3], builder.positions[b2 * 3 + 1], builder.positions[b2 * 3 + 2]
    ];
    const pc: Vec3 = [
      builder.positions[c * 3], builder.positions[c * 3 + 1], builder.positions[c * 3 + 2]
    ];
    const crossVec = cross(sub(pb, pa), sub(pc, pa));
    const area = length(crossVec);
    if (area < EPSILON) continue;

    newIndices.push(a, b2, c);
  }
  builder.indices = newIndices;
}

// ─── 기타 기하 생성 ──────────────────────────────────────

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

// ─── Taubin 스무딩 ────────────────────────────────────

/** Taubin 스무딩: λ|μ 교대 적용으로 수축 없이 스무딩 */
function taubinSmooth(builder: MeshBuilder, iterations: number = 10): void {
  const vc = builder.vertexCount;
  const lambda = 0.5;
  const mu = -0.53;

  // 인접 정점 맵 구축
  const adj: Set<number>[] = new Array(vc);
  for (let i = 0; i < vc; i++) adj[i] = new Set();
  for (let i = 0; i < builder.indices.length; i += 3) {
    const a = builder.indices[i], b2 = builder.indices[i + 1], c = builder.indices[i + 2];
    adj[a].add(b2); adj[a].add(c);
    adj[b2].add(a); adj[b2].add(c);
    adj[c].add(a); adj[c].add(b2);
  }

  // 경계 정점 고정
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
    smoothPass(lambda);
    smoothPass(mu);
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

// ─── 체인 탐색 ─────────────────────────────────────────

function findChains(
  bones: Map<string, Bone>,
  connections: BoneConnection[],
  adjacency: Map<string, string[]>,
): Bone[][] {
  const chains: Bone[][] = [];
  const visitedEdges = new Set<string>();

  const startNodes: string[] = [];
  for (const [id, neighbors] of adjacency) {
    if (neighbors.length !== 2) startNodes.push(id);
  }

  for (const startId of startNodes) {
    const neighbors = adjacency.get(startId)!;
    for (const nextId of neighbors) {
      const edgeKey = startId < nextId ? `${startId}-${nextId}` : `${nextId}-${startId}`;
      if (visitedEdges.has(edgeKey)) continue;

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
        if (currentNeighbors.length !== 2) break;

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

  // ── 2. 각 체인에 대해 연속 튜브 생성 (분기점 관통 포함) ──
  for (const chain of chains) {
    const result = generateChainTube(builder, chain, d, segments, adjacency);

    // ── 리프 노드 캡 ──
    const startBone = chain[0];
    const endBone = chain[chain.length - 1];
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

  // ── 3. 고립 본 → 구 ──
  for (const bone of bones.values()) {
    if (bone.masked) continue;
    const neighbors = adjacency.get(bone.id);
    if (!neighbors || neighbors.length === 0) {
      generateSphereMesh(builder, bone.position, bone.radius * d, bone.color);
    }
  }

  // ── 4. 정점 용접 (분기 접합부 봉합) ──
  // threshold는 가장 작은 본 반지름 기준으로 동적 결정
  let minRadius = Infinity;
  for (const bone of bones.values()) {
    if (!bone.masked && bone.radius < minRadius) minRadius = bone.radius;
  }
  const weldThreshold = Math.max(0.01, minRadius * d * 0.08);
  weldVertices(builder, weldThreshold);

  // ── 5. 퇴화 삼각형 제거 ──
  removeDegenerateTriangles(builder);

  // ── 6. Taubin 스무딩 (12회 — 강한 스무딩으로 용접 부위 자연스럽게) ──
  taubinSmooth(builder, 12);

  // ── 7. 스무스 노멀 재계산 ──
  recomputeSmoothNormals(builder);

  return {
    positions: new Float32Array(builder.positions),
    normals: new Float32Array(builder.normals),
    indices: new Uint32Array(builder.indices),
    colors: new Float32Array(builder.colors),
  };
}
