// ============================================================
// B-Mesh MeshExporter - OBJ/STL 내보내기
// ============================================================

import type { MeshData } from '../mesh/types';

export const MeshExporter = {
  exportOBJ(mesh: MeshData, name = 'bmesh'): string {
    const { positions, normals, indices } = mesh;
    const vertexCount = positions.length / 3;
    const lines: string[] = [`# B-Mesh OBJ Export`, `o ${name}`, ''];

    // Vertices
    for (let i = 0; i < vertexCount; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      lines.push(`v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}`);
    }
    lines.push('');

    // Normals
    for (let i = 0; i < vertexCount; i++) {
      const nx = normals[i * 3];
      const ny = normals[i * 3 + 1];
      const nz = normals[i * 3 + 2];
      lines.push(`vn ${nx.toFixed(6)} ${ny.toFixed(6)} ${nz.toFixed(6)}`);
    }
    lines.push('');

    // Faces (OBJ is 1-indexed)
    const triCount = indices.length / 3;
    for (let i = 0; i < triCount; i++) {
      const a = indices[i * 3] + 1;
      const b = indices[i * 3 + 1] + 1;
      const c = indices[i * 3 + 2] + 1;
      lines.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
    }

    return lines.join('\n');
  },

  exportSTL(mesh: MeshData): ArrayBuffer {
    const { positions, normals, indices } = mesh;
    const triCount = indices.length / 3;

    // Binary STL: 80-byte header + 4-byte tri count + 50 bytes per triangle
    const bufferSize = 80 + 4 + triCount * 50;
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // Header (80 bytes, zeros)
    const headerText = 'B-Mesh STL Export';
    for (let i = 0; i < headerText.length && i < 80; i++) {
      view.setUint8(i, headerText.charCodeAt(i));
    }

    // Triangle count
    view.setUint32(80, triCount, true);

    let offset = 84;
    for (let i = 0; i < triCount; i++) {
      const ia = indices[i * 3];
      const ib = indices[i * 3 + 1];
      const ic = indices[i * 3 + 2];

      // Compute face normal (average of vertex normals)
      let nx = 0, ny = 0, nz = 0;
      for (const idx of [ia, ib, ic]) {
        nx += normals[idx * 3];
        ny += normals[idx * 3 + 1];
        nz += normals[idx * 3 + 2];
      }
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      view.setFloat32(offset, nx / len, true); offset += 4;
      view.setFloat32(offset, ny / len, true); offset += 4;
      view.setFloat32(offset, nz / len, true); offset += 4;

      // Vertices
      for (const idx of [ia, ib, ic]) {
        view.setFloat32(offset, positions[idx * 3], true); offset += 4;
        view.setFloat32(offset, positions[idx * 3 + 1], true); offset += 4;
        view.setFloat32(offset, positions[idx * 3 + 2], true); offset += 4;
      }

      // Attribute byte count
      view.setUint16(offset, 0, true); offset += 2;
    }

    return buffer;
  },

  downloadOBJ(mesh: MeshData, filename = 'model.obj'): void {
    const obj = this.exportOBJ(mesh);
    const blob = new Blob([obj], { type: 'text/plain' });
    downloadBlob(blob, filename);
  },

  downloadSTL(mesh: MeshData, filename = 'model.stl'): void {
    const stl = this.exportSTL(mesh);
    const blob = new Blob([stl], { type: 'application/octet-stream' });
    downloadBlob(blob, filename);
  },
};

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
