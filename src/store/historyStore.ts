// ============================================================
// B-Mesh History Store - Undo/Redo 상태
// ============================================================

import { create } from 'zustand';
import type { HistoryState } from './types';
import { commandManager } from '../core/CommandManager';
import type { Command } from '../mesh/types';

export const useHistoryStore = create<HistoryState>()((set) => ({
  canUndo: false,
  canRedo: false,

  execute: (command: Command) => {
    commandManager.execute(command);
    set({
      canUndo: commandManager.canUndo(),
      canRedo: commandManager.canRedo(),
    });
  },

  undo: () => {
    commandManager.undo();
    set({
      canUndo: commandManager.canUndo(),
      canRedo: commandManager.canRedo(),
    });
  },

  redo: () => {
    commandManager.redo();
    set({
      canUndo: commandManager.canUndo(),
      canRedo: commandManager.canRedo(),
    });
  },

  clear: () => {
    commandManager.clear();
    set({ canUndo: false, canRedo: false });
  },

  getHistory: () => commandManager.getHistory(),
}));
