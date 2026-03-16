// ============================================================
// B-Mesh SculptTools — Draw/Move/Scale/Delete 도구 구현
// ============================================================

import type { Bone, Command, ToolType, Vec3 } from './types';
import { BoneSystem } from './BoneSystem';
import { eventBus } from '../core/EventBus';

// --- 도구 상태 머신 ---

export type ToolState = 'idle' | 'active' | 'dragging';

export interface ToolContext {
  boneSystem: BoneSystem;
  selectedBoneId: string | null;
  setSelectedBoneId: (id: string | null) => void;
}

// --- 기본 도구 인터페이스 ---

export interface SculptTool {
  readonly type: ToolType;
  state: ToolState;

  onPointerDown(position: Vec3, hitBoneId: string | null, ctx: ToolContext): Command | null;
  onPointerMove(position: Vec3, ctx: ToolContext): void;
  onPointerUp(ctx: ToolContext): Command | null;
  cancel(): void;
}

// --- Draw Tool ---

export class DrawTool implements SculptTool {
  readonly type: ToolType = 'add';
  state: ToolState = 'idle';

  private addedBoneId: string | null = null;
  private parentId: string | null = null;
  private position: Vec3 = [0, 0, 0];

  onPointerDown(position: Vec3, hitBoneId: string | null, ctx: ToolContext): Command | null {
    this.state = 'active';
    this.position = [...position] as Vec3;
    this.parentId = hitBoneId ?? ctx.selectedBoneId;

    const parentId = this.parentId;
    const pos = this.position;
    const boneSystem = ctx.boneSystem;
    let addedId: string | null = null;

    const command: Command = {
      description: `Add bone at (${pos[0].toFixed(1)}, ${pos[1].toFixed(1)}, ${pos[2].toFixed(1)})`,
      execute: () => {
        addedId = boneSystem.addBone(pos, 0.5, parentId);
        this.addedBoneId = addedId;
        ctx.setSelectedBoneId(addedId);
        eventBus.emit('bone:added', { bone: boneSystem.getBone(addedId)! });
      },
      undo: () => {
        if (addedId) {
          boneSystem.removeBone(addedId);
          eventBus.emit('bone:removed', { boneId: addedId });
          ctx.setSelectedBoneId(parentId);
        }
      },
    };

    this.state = 'idle';
    return command;
  }

  onPointerMove(_position: Vec3, _ctx: ToolContext): void {
    // Draw tool doesn't drag
  }

  onPointerUp(_ctx: ToolContext): Command | null {
    this.state = 'idle';
    return null;
  }

  cancel(): void {
    this.state = 'idle';
    this.addedBoneId = null;
  }
}

// --- Move Tool ---

export class MoveTool implements SculptTool {
  readonly type: ToolType = 'grab';
  state: ToolState = 'idle';

  private targetBoneId: string | null = null;
  private originalPosition: Vec3 = [0, 0, 0];
  private currentPosition: Vec3 = [0, 0, 0];

  onPointerDown(_position: Vec3, hitBoneId: string | null, ctx: ToolContext): Command | null {
    if (!hitBoneId) return null;

    const bone = ctx.boneSystem.getBone(hitBoneId);
    if (!bone) return null;

    this.state = 'dragging';
    this.targetBoneId = hitBoneId;
    this.originalPosition = [...bone.position] as Vec3;
    this.currentPosition = [...bone.position] as Vec3;
    ctx.setSelectedBoneId(hitBoneId);
    return null;
  }

  onPointerMove(position: Vec3, ctx: ToolContext): void {
    if (this.state !== 'dragging' || !this.targetBoneId) return;

    this.currentPosition = [...position] as Vec3;
    ctx.boneSystem.moveBone(this.targetBoneId, this.currentPosition);
  }

  onPointerUp(ctx: ToolContext): Command | null {
    if (this.state !== 'dragging' || !this.targetBoneId) {
      this.state = 'idle';
      return null;
    }

    const boneId = this.targetBoneId;
    const originalPos = [...this.originalPosition] as Vec3;
    const finalPos = [...this.currentPosition] as Vec3;
    const boneSystem = ctx.boneSystem;

    this.state = 'idle';
    this.targetBoneId = null;

    // Skip if bone hasn't moved
    if (
      originalPos[0] === finalPos[0] &&
      originalPos[1] === finalPos[1] &&
      originalPos[2] === finalPos[2]
    ) {
      return null;
    }

    return {
      description: `Move bone ${boneId}`,
      execute: () => {
        boneSystem.moveBone(boneId, finalPos);
        eventBus.emit('bone:moved', { boneId, position: finalPos });
      },
      undo: () => {
        boneSystem.moveBone(boneId, originalPos);
        eventBus.emit('bone:moved', { boneId, position: originalPos });
      },
    };
  }

  cancel(): void {
    if (this.targetBoneId && this.state === 'dragging') {
      // Revert to original position would need ctx — handled externally
    }
    this.state = 'idle';
    this.targetBoneId = null;
  }
}

// --- Scale Tool ---

export class ScaleTool implements SculptTool {
  readonly type: ToolType = 'scale';
  state: ToolState = 'idle';

  private targetBoneId: string | null = null;
  private originalRadius = 0;
  private startY = 0;

  onPointerDown(position: Vec3, hitBoneId: string | null, ctx: ToolContext): Command | null {
    if (!hitBoneId) return null;

    const bone = ctx.boneSystem.getBone(hitBoneId);
    if (!bone) return null;

    this.state = 'dragging';
    this.targetBoneId = hitBoneId;
    this.originalRadius = bone.radius;
    this.startY = position[1];
    ctx.setSelectedBoneId(hitBoneId);
    return null;
  }

  onPointerMove(position: Vec3, ctx: ToolContext): void {
    if (this.state !== 'dragging' || !this.targetBoneId) return;

    const deltaY = position[1] - this.startY;
    const newRadius = Math.max(0.01, this.originalRadius + deltaY * 0.5);
    ctx.boneSystem.scaleBone(this.targetBoneId, newRadius);
  }

  onPointerUp(ctx: ToolContext): Command | null {
    if (this.state !== 'dragging' || !this.targetBoneId) {
      this.state = 'idle';
      return null;
    }

    const boneId = this.targetBoneId;
    const originalRadius = this.originalRadius;
    const bone = ctx.boneSystem.getBone(boneId);
    const finalRadius = bone?.radius ?? originalRadius;
    const boneSystem = ctx.boneSystem;

    this.state = 'idle';
    this.targetBoneId = null;

    if (originalRadius === finalRadius) return null;

    return {
      description: `Scale bone ${boneId} (${originalRadius.toFixed(2)} → ${finalRadius.toFixed(2)})`,
      execute: () => {
        boneSystem.scaleBone(boneId, finalRadius);
        eventBus.emit('bone:scaled', { boneId, radius: finalRadius });
      },
      undo: () => {
        boneSystem.scaleBone(boneId, originalRadius);
        eventBus.emit('bone:scaled', { boneId, radius: originalRadius });
      },
    };
  }

  cancel(): void {
    this.state = 'idle';
    this.targetBoneId = null;
  }
}

// --- Delete Tool ---

export class DeleteTool implements SculptTool {
  readonly type: ToolType = 'delete';
  state: ToolState = 'idle';

  onPointerDown(_position: Vec3, hitBoneId: string | null, ctx: ToolContext): Command | null {
    if (!hitBoneId) return null;

    const bone = ctx.boneSystem.getBone(hitBoneId);
    if (!bone) return null;

    this.state = 'active';

    const boneData: Bone = {
      ...bone,
      position: [...bone.position] as Vec3,
      color: [...bone.color] as Vec3,
      childIds: [...bone.childIds],
    };
    const boneSystem = ctx.boneSystem;
    const connections = boneSystem.getConnections().filter(
      (c) => c.boneA === hitBoneId || c.boneB === hitBoneId,
    );

    const command: Command = {
      description: `Delete bone ${bone.name}`,
      execute: () => {
        boneSystem.removeBone(boneData.id);
        ctx.setSelectedBoneId(null);
        eventBus.emit('bone:removed', { boneId: boneData.id });
      },
      undo: () => {
        boneSystem.addBone(boneData.position, boneData.radius, boneData.parentId, {
          id: boneData.id,
          name: boneData.name,
          color: boneData.color,
          masked: boneData.masked,
        });
        for (const conn of connections) {
          boneSystem.addConnection(conn.boneA, conn.boneB, conn.strength);
        }
        ctx.setSelectedBoneId(boneData.id);
        eventBus.emit('bone:added', { bone: boneSystem.getBone(boneData.id)! });
      },
    };

    this.state = 'idle';
    return command;
  }

  onPointerMove(_position: Vec3, _ctx: ToolContext): void {
    // Delete doesn't support dragging
  }

  onPointerUp(_ctx: ToolContext): Command | null {
    this.state = 'idle';
    return null;
  }

  cancel(): void {
    this.state = 'idle';
  }
}
