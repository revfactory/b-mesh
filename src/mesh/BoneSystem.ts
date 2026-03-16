// ============================================================
// B-Mesh BoneSystem — 본 계층 구조 관리
// ============================================================

import type { Bone, BoneConnection, BoneStructure, Vec3 } from './types';

let _nextId = 0;
function generateId(): string {
  return `bone_${++_nextId}_${Date.now().toString(36)}`;
}

export class BoneSystem {
  private bones: Map<string, Bone> = new Map();
  private connections: BoneConnection[] = [];
  private density = 3.2;

  get structure(): BoneStructure {
    const rootBone = this.findRoot();
    return {
      bones: new Map(this.bones),
      connections: [...this.connections],
      rootId: rootBone?.id ?? '',
    };
  }

  addBone(
    position: Vec3,
    radius: number,
    parentId?: string | null,
    options?: Partial<Pick<Bone, 'id' | 'name' | 'color' | 'masked'>>,
  ): string {
    const id = options?.id ?? generateId();
    const bone: Bone = {
      id,
      name: options?.name ?? `Bone ${this.bones.size}`,
      position: [...position] as Vec3,
      radius,
      parentId: parentId ?? null,
      childIds: [],
      color: options?.color ?? [0.8, 0.8, 0.8],
      masked: options?.masked ?? false,
    };

    this.bones.set(id, bone);

    if (parentId && this.bones.has(parentId)) {
      const parent = this.bones.get(parentId)!;
      parent.childIds.push(id);
      this.connections.push({ boneA: parentId, boneB: id, strength: 1.0 });
    }

    return id;
  }

  removeBone(id: string): void {
    const bone = this.bones.get(id);
    if (!bone) return;

    // Reconnect children to parent
    for (const childId of bone.childIds) {
      const child = this.bones.get(childId);
      if (child) {
        child.parentId = bone.parentId;
        if (bone.parentId) {
          const parent = this.bones.get(bone.parentId);
          if (parent && !parent.childIds.includes(childId)) {
            parent.childIds.push(childId);
          }
          // Add connection from parent to child
          if (!this.connections.some(c =>
            (c.boneA === bone.parentId && c.boneB === childId) ||
            (c.boneA === childId && c.boneB === bone.parentId),
          )) {
            this.connections.push({ boneA: bone.parentId, boneB: childId, strength: 1.0 });
          }
        }
      }
    }

    // Remove from parent's childIds
    if (bone.parentId) {
      const parent = this.bones.get(bone.parentId);
      if (parent) {
        parent.childIds = parent.childIds.filter(cid => cid !== id);
      }
    }

    // Remove connections involving this bone
    this.connections = this.connections.filter(c => c.boneA !== id && c.boneB !== id);

    this.bones.delete(id);
  }

  moveBone(id: string, position: Vec3): void {
    const bone = this.bones.get(id);
    if (bone) {
      bone.position = [...position] as Vec3;
    }
  }

  scaleBone(id: string, radius: number): void {
    const bone = this.bones.get(id);
    if (bone) {
      bone.radius = Math.max(0.01, radius);
    }
  }

  getBone(id: string): Bone | undefined {
    return this.bones.get(id);
  }

  getAllBones(): Bone[] {
    return Array.from(this.bones.values());
  }

  getConnections(): BoneConnection[] {
    return [...this.connections];
  }

  setBoneDensity(density: number): void {
    this.density = Math.max(0.1, Math.min(10.0, density));
  }

  getDensity(): number {
    return this.density;
  }

  addConnection(boneA: string, boneB: string, strength = 1.0): void {
    if (!this.bones.has(boneA) || !this.bones.has(boneB)) return;
    if (this.connections.some(c =>
      (c.boneA === boneA && c.boneB === boneB) ||
      (c.boneA === boneB && c.boneB === boneA),
    )) return;
    this.connections.push({ boneA, boneB, strength });
  }

  clear(): void {
    this.bones.clear();
    this.connections = [];
  }

  loadBones(bones: Bone[], connections: BoneConnection[]): void {
    this.clear();
    for (const bone of bones) {
      this.bones.set(bone.id, {
        ...bone,
        position: [...bone.position] as Vec3,
        color: [...bone.color] as Vec3,
        childIds: [...(bone.childIds ?? [])],
      });
    }
    this.connections = connections.map(c => ({ ...c }));
  }

  private findRoot(): Bone | undefined {
    for (const bone of this.bones.values()) {
      if (!bone.parentId) return bone;
    }
    return this.bones.values().next().value;
  }
}
