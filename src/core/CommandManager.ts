// ============================================================
// B-Mesh CommandManager - Undo/Redo 시스템
// ============================================================

import type { Command } from '../mesh/types';

const MAX_HISTORY = 100;

class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
    }
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getHistory(): Command[] {
    return [...this.undoStack];
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

export const commandManager = new CommandManager();
export { CommandManager };
