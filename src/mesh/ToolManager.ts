// ============================================================
// B-Mesh ToolManager — 도구 관리 및 입력 라우팅
// ============================================================

import type { Command, ToolType, Vec3 } from './types';
import type { SculptTool, ToolContext } from './SculptTools';
import { DrawTool, MoveTool, ScaleTool, DeleteTool } from './SculptTools';
import { commandManager } from '../core/CommandManager';
import { eventBus } from '../core/EventBus';

export class ToolManager {
  private tools: Map<ToolType, SculptTool>;
  private activeToolType: ToolType = 'add';
  private ctx: ToolContext;

  constructor(ctx: ToolContext) {
    this.ctx = ctx;

    this.tools = new Map<ToolType, SculptTool>([
      ['add', new DrawTool()],
      ['grab', new MoveTool()],
      ['scale', new ScaleTool()],
      ['delete', new DeleteTool()],
    ]);
  }

  get activeTool(): SculptTool | undefined {
    return this.tools.get(this.activeToolType);
  }

  get activeType(): ToolType {
    return this.activeToolType;
  }

  setTool(type: ToolType): void {
    const currentTool = this.activeTool;
    if (currentTool && currentTool.state !== 'idle') {
      currentTool.cancel();
    }
    this.activeToolType = type;
    eventBus.emit('tool:changed', { tool: type });
  }

  onPointerDown(position: Vec3, hitBoneId: string | null): void {
    const tool = this.activeTool;
    if (!tool) return;

    const command = tool.onPointerDown(position, hitBoneId, this.ctx);
    this.executeCommand(command);
  }

  onPointerMove(position: Vec3): void {
    const tool = this.activeTool;
    if (!tool) return;

    tool.onPointerMove(position, this.ctx);
  }

  onPointerUp(): void {
    const tool = this.activeTool;
    if (!tool) return;

    const command = tool.onPointerUp(this.ctx);
    this.executeCommand(command);
  }

  cancel(): void {
    this.activeTool?.cancel();
  }

  private executeCommand(command: Command | null): void {
    if (command) {
      commandManager.execute(command);
    }
  }
}
