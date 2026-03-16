import { useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useHistoryStore } from '../../store/historyStore';

export function useKeyboard() {
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        redo();
        return;
      }

      if (ctrl && e.key === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      // Tool shortcuts (no modifiers)
      if (ctrl || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case 'd':
          setActiveTool('add');
          break;
        case 'g':
          setActiveTool('grab');
          break;
        case 's':
          e.preventDefault(); // prevent browser save
          setActiveTool('scale');
          break;
        case 'x':
          setActiveTool('delete');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, undo, redo]);
}
