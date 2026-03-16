// ============================================================
// B-Mesh SymmetryManager — X/Y/Z축 대칭 미러링
// ============================================================

import type { Vec3, SymmetryState, BoneEdit, Bone } from './types';
import type { BoneSystem } from './BoneSystem';

const MIRROR_THRESHOLD = 0.01;

export class SymmetryManager {
  axes: SymmetryState = { x: false, y: false, z: false };

  setAxes(axes: Partial<SymmetryState>): void {
    if (axes.x !== undefined) this.axes.x = axes.x;
    if (axes.y !== undefined) this.axes.y = axes.y;
    if (axes.z !== undefined) this.axes.z = axes.z;
  }

  /** 위치를 활성 축 기준으로 미러링한 좌표 목록 반환 (원본 제외) */
  mirrorPosition(pos: Vec3): Vec3[] {
    const activeAxes: number[] = [];
    if (this.axes.x) activeAxes.push(0);
    if (this.axes.y) activeAxes.push(1);
    if (this.axes.z) activeAxes.push(2);

    if (activeAxes.length === 0) return [];

    const results: Vec3[] = [];
    const combos = (1 << activeAxes.length) - 1;

    for (let mask = 1; mask <= combos; mask++) {
      const mirrored: Vec3 = [...pos] as Vec3;
      for (let i = 0; i < activeAxes.length; i++) {
        if (mask & (1 << i)) {
          mirrored[activeAxes[i]] = -mirrored[activeAxes[i]];
        }
      }
      results.push(mirrored);
    }

    return results;
  }

  /** BoneEdit를 미러링한 편집 목록 반환 (원본 제외) */
  mirrorBoneEdit(edit: BoneEdit): BoneEdit[] {
    const activeAxes: number[] = [];
    if (this.axes.x) activeAxes.push(0);
    if (this.axes.y) activeAxes.push(1);
    if (this.axes.z) activeAxes.push(2);

    if (activeAxes.length === 0) return [];

    const results: BoneEdit[] = [];
    const combos = (1 << activeAxes.length) - 1;

    for (let mask = 1; mask <= combos; mask++) {
      if (edit.type === 'move') {
        const mirrored: Vec3 = [...edit.position] as Vec3;
        for (let i = 0; i < activeAxes.length; i++) {
          if (mask & (1 << i)) {
            mirrored[activeAxes[i]] = -mirrored[activeAxes[i]];
          }
        }
        results.push({ type: 'move', boneId: edit.boneId, position: mirrored });
      } else if (edit.type === 'scale') {
        results.push({ type: 'scale', boneId: edit.boneId, radius: edit.radius });
      } else if (edit.type === 'color') {
        results.push({ type: 'color', boneId: edit.boneId, color: [...edit.color] as Vec3 });
      } else if (edit.type === 'mask') {
        results.push({ type: 'mask', boneId: edit.boneId, masked: edit.masked });
      }
    }

    return results;
  }

  /**
   * BoneSystem과 연동하여 대칭 본 쌍을 찾아 편집을 적용.
   * boneId의 미러 위치에 가장 가까운 본을 찾아 대칭 편집 목록 반환.
   */
  mirrorBoneEditWithSystem(
    edit: BoneEdit,
    boneSystem: BoneSystem,
  ): BoneEdit[] {
    if (!this.isActive()) return [];

    const bone = boneSystem.getBone(edit.boneId);
    if (!bone) return [];

    // 중심축 위의 본은 미러링 하지 않음
    if (this.isOnAxis(bone.position)) return [];

    const mirroredPositions = this.mirrorPosition(bone.position);
    const allBones = boneSystem.getAllBones();
    const results: BoneEdit[] = [];

    for (const mirrorPos of mirroredPositions) {
      const mirrorBone = this.findNearestBone(allBones, mirrorPos, edit.boneId);
      if (!mirrorBone) continue;

      if (edit.type === 'move') {
        const mirroredNewPos = this.mirrorPosition(edit.position);
        if (mirroredNewPos.length > 0) {
          results.push({ type: 'move', boneId: mirrorBone.id, position: mirroredNewPos[0] });
        }
      } else if (edit.type === 'scale') {
        results.push({ type: 'scale', boneId: mirrorBone.id, radius: edit.radius });
      } else if (edit.type === 'color') {
        results.push({ type: 'color', boneId: mirrorBone.id, color: [...edit.color] as Vec3 });
      } else if (edit.type === 'mask') {
        results.push({ type: 'mask', boneId: mirrorBone.id, masked: edit.masked });
      }
    }

    return results;
  }

  /** 중심축 위에 있는 본인지 판별 */
  isOnAxis(position: Vec3): boolean {
    if (this.axes.x && Math.abs(position[0]) < MIRROR_THRESHOLD) return true;
    if (this.axes.y && Math.abs(position[1]) < MIRROR_THRESHOLD) return true;
    if (this.axes.z && Math.abs(position[2]) < MIRROR_THRESHOLD) return true;
    return false;
  }

  isActive(): boolean {
    return this.axes.x || this.axes.y || this.axes.z;
  }

  private findNearestBone(
    bones: Bone[],
    targetPos: Vec3,
    excludeId: string,
  ): Bone | null {
    let nearest: Bone | null = null;
    let nearestDist = Infinity;

    for (const bone of bones) {
      if (bone.id === excludeId) continue;
      const dist = this.distanceSq(bone.position, targetPos);
      if (dist < nearestDist && dist < MIRROR_THRESHOLD * 10) {
        nearestDist = dist;
        nearest = bone;
      }
    }

    return nearest;
  }

  private distanceSq(a: Vec3, b: Vec3): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return dx * dx + dy * dy + dz * dz;
  }
}
