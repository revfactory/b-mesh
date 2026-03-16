// ============================================================
// B-Mesh MeshImporter - OBJ 가져오기
// ============================================================

import type { MeshData } from '../mesh/types';

export const MeshImporter = {
  async importOBJ(file: File): Promise<MeshData> {
    const text = await file.text();
    return parseOBJ(text);
  },

  parseOBJ(text: string): MeshData {
    return parseOBJ(text);
  },
};

function parseOBJ(text: string): MeshData {
  const vertices: number[] = [];
  const normals: number[] = [];
  const faceIndices: number[] = [];
  const faceNormalIndices: number[] = [];

  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.length === 0) continue;

    const parts = trimmed.split(/\s+/);
    const type = parts[0];

    switch (type) {
      case 'v':
        vertices.push(
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3])
        );
        break;

      case 'vn':
        normals.push(
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3])
        );
        break;

      case 'f': {
        // Support: f v, f v//vn, f v/vt, f v/vt/vn
        const faceVerts: number[] = [];
        const faceNorms: number[] = [];
        for (let i = 1; i < parts.length; i++) {
          const segments = parts[i].split('/');
          faceVerts.push(parseInt(segments[0]) - 1); // OBJ is 1-indexed
          if (segments.length >= 3 && segments[2]) {
            faceNorms.push(parseInt(segments[2]) - 1);
          }
        }
        // Triangulate (fan)
        for (let i = 1; i < faceVerts.length - 1; i++) {
          faceIndices.push(faceVerts[0], faceVerts[i], faceVerts[i + 1]);
          if (faceNorms.length === faceVerts.length) {
            faceNormalIndices.push(faceNorms[0], faceNorms[i], faceNorms[i + 1]);
          }
        }
        break;
      }
    }
  }

  const positions = new Float32Array(vertices);
  const indices = new Uint32Array(faceIndices);
  const vertexCount = vertices.length / 3;

  // Build normals array
  let outNormals: Float32Array;
  if (normals.length > 0 && faceNormalIndices.length === faceIndices.length) {
    // Remap normals per vertex (use first encountered normal per vertex)
    outNormals = new Float32Array(vertexCount * 3);
    for (let i = 0; i < faceIndices.length; i++) {
      const vi = faceIndices[i];
      const ni = faceNormalIndices[i];
      outNormals[vi * 3] = normals[ni * 3];
      outNormals[vi * 3 + 1] = normals[ni * 3 + 1];
      outNormals[vi * 3 + 2] = normals[ni * 3 + 2];
    }
  } else if (normals.length === vertices.length) {
    outNormals = new Float32Array(normals);
  } else {
    // Compute flat normals
    outNormals = computeNormals(positions, indices);
  }

  // Default white colors
  const colors = new Float32Array(vertexCount * 3);
  colors.fill(1.0);

  return { positions, normals: outNormals, indices, colors };
}

function computeNormals(positions: Float32Array, indices: Uint32Array): Float32Array {
  const normals = new Float32Array(positions.length);
  const triCount = indices.length / 3;

  for (let i = 0; i < triCount; i++) {
    const ia = indices[i * 3];
    const ib = indices[i * 3 + 1];
    const ic = indices[i * 3 + 2];

    const ax = positions[ia * 3], ay = positions[ia * 3 + 1], az = positions[ia * 3 + 2];
    const bx = positions[ib * 3], by = positions[ib * 3 + 1], bz = positions[ib * 3 + 2];
    const cx = positions[ic * 3], cy = positions[ic * 3 + 1], cz = positions[ic * 3 + 2];

    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;

    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;

    for (const idx of [ia, ib, ic]) {
      normals[idx * 3] += nx;
      normals[idx * 3 + 1] += ny;
      normals[idx * 3 + 2] += nz;
    }
  }

  // Normalize
  const vertCount = positions.length / 3;
  for (let i = 0; i < vertCount; i++) {
    const x = normals[i * 3], y = normals[i * 3 + 1], z = normals[i * 3 + 2];
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    normals[i * 3] /= len;
    normals[i * 3 + 1] /= len;
    normals[i * 3 + 2] /= len;
  }

  return normals;
}
