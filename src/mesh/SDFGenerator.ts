// ============================================================
// B-Mesh SDFGenerator — 본 위치로부터 3D 스칼라 필드 생성
// ============================================================

import type { Bone, BoneConnection, BoneStructure, Vec3 } from './types';
import { length, sub, dot, scale, add, smoothMin } from '../core/math';

export interface SDFFieldInfo {
  field: Float32Array;
  resolution: number;
  boundsMin: Vec3;
  boundsMax: Vec3;
  cellSize: number;
}

function sphereSDF(p: Vec3, center: Vec3, radius: number): number {
  return length(sub(p, center)) - radius;
}

function capsuleSDF(p: Vec3, a: Vec3, b: Vec3, ra: number, rb: number): number {
  const pa = sub(p, a);
  const ba = sub(b, a);
  const baDot = dot(ba, ba);
  const h = baDot > 0 ? Math.max(0, Math.min(1, dot(pa, ba) / baDot)) : 0;
  const r = ra + (rb - ra) * h;
  const proj = add(a, scale(ba, h));
  return length(sub(p, proj)) - r;
}

function computeBounds(bones: Bone[], density: number, margin: number): [Vec3, Vec3] {
  if (bones.length === 0) {
    return [[-1, -1, -1], [1, 1, 1]];
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const bone of bones) {
    const r = bone.radius * density + margin;
    const [x, y, z] = bone.position;
    if (x - r < minX) minX = x - r;
    if (y - r < minY) minY = y - r;
    if (z - r < minZ) minZ = z - r;
    if (x + r > maxX) maxX = x + r;
    if (y + r > maxY) maxY = y + r;
    if (z + r > maxZ) maxZ = z + r;
  }

  return [[minX, minY, minZ], [maxX, maxY, maxZ]];
}

export function generate(
  structure: BoneStructure,
  resolution: number,
  density: number,
): SDFFieldInfo {
  const allBones = Array.from(structure.bones.values()).filter(b => !b.masked);
  const connections = structure.connections;

  const margin = 0.5;
  const [boundsMin, boundsMax] = computeBounds(allBones, density, margin);

  const sizeX = boundsMax[0] - boundsMin[0];
  const sizeY = boundsMax[1] - boundsMin[1];
  const sizeZ = boundsMax[2] - boundsMin[2];
  const maxSize = Math.max(sizeX, sizeY, sizeZ);
  const cellSize = maxSize / (resolution - 1);

  // Center the grid
  const centerX = (boundsMin[0] + boundsMax[0]) * 0.5;
  const centerY = (boundsMin[1] + boundsMax[1]) * 0.5;
  const centerZ = (boundsMin[2] + boundsMax[2]) * 0.5;
  const halfGrid = maxSize * 0.5;
  const gridMin: Vec3 = [centerX - halfGrid, centerY - halfGrid, centerZ - halfGrid];
  const gridMax: Vec3 = [centerX + halfGrid, centerY + halfGrid, centerZ + halfGrid];

  const total = resolution * resolution * resolution;
  const field = new Float32Array(total);
  field.fill(1e10);

  const k = 0.15; // smooth min factor — lower = sharper separation between bones

  // Precompute bone data
  const bonePositions = allBones.map(b => b.position);
  const boneRadii = allBones.map(b => b.radius * density);

  // Precompute connection data
  const connData: { a: Vec3; b: Vec3; ra: number; rb: number }[] = [];
  for (const conn of connections) {
    const bA = structure.bones.get(conn.boneA);
    const bB = structure.bones.get(conn.boneB);
    if (!bA || !bB || bA.masked || bB.masked) continue;
    connData.push({
      a: bA.position,
      b: bB.position,
      ra: bA.radius * density,
      rb: bB.radius * density,
    });
  }

  const resXres = resolution * resolution;

  for (let iz = 0; iz < resolution; iz++) {
    const pz = gridMin[2] + iz * cellSize;
    for (let iy = 0; iy < resolution; iy++) {
      const py = gridMin[1] + iy * cellSize;
      const baseIdx = iz * resXres + iy * resolution;
      for (let ix = 0; ix < resolution; ix++) {
        const px = gridMin[0] + ix * cellSize;
        const p: Vec3 = [px, py, pz];

        let d = 1e10;

        // Sphere SDF for each bone
        for (let bi = 0; bi < allBones.length; bi++) {
          const sd = sphereSDF(p, bonePositions[bi], boneRadii[bi]);
          d = smoothMin(d, sd, k);
        }

        // Capsule SDF for each connection
        for (let ci = 0; ci < connData.length; ci++) {
          const c = connData[ci];
          const cd = capsuleSDF(p, c.a, c.b, c.ra, c.rb);
          d = smoothMin(d, cd, k);
        }

        field[baseIdx + ix] = d;
      }
    }
  }

  return { field, resolution, boundsMin: gridMin, boundsMax: gridMax, cellSize };
}
