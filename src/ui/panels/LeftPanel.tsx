import Button from '../components/Button';
import SectionHeader from '../components/SectionHeader';
import { useEditorStore } from '../../store/editorStore';
import { useHistoryStore } from '../../store/historyStore';
import { eventBus } from '../../core/EventBus';
import type { ToolType } from '../../mesh/types';

const TOOLS: { label: string; tool: ToolType }[] = [
  { label: 'Draw', tool: 'add' },
  { label: 'Move', tool: 'grab' },
  { label: 'Scale', tool: 'scale' },
  { label: 'Delete', tool: 'delete' },
];

export default function LeftPanel() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);

  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  return (
    <>
      {/* File & Project */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <SectionHeader title="FILE & PROJECT" />
        <Button label="New Project" variant="danger" onClick={() => eventBus.emit('project:new', {})} fullWidth />
        <div className="flex gap-2">
          <Button label="Import" onClick={() => eventBus.emit('project:import', {})} />
          <Button label="Export" onClick={() => eventBus.emit('project:export', {})} />
        </div>
      </div>

      {/* Tools */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <SectionHeader title="TOOLS" />
        {TOOLS.map(({ label, tool }) => (
          <Button
            key={tool}
            label={label}
            active={activeTool === tool}
            onClick={() => setActiveTool(tool)}
            fullWidth
          />
        ))}
      </div>

      {/* History */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <SectionHeader title="HISTORY" />
        <div className="flex gap-2">
          <Button label="Undo" onClick={undo} disabled={!canUndo} />
          <Button label="Redo" onClick={redo} disabled={!canRedo} />
        </div>
      </div>

      {/* Presets */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <SectionHeader title="PRESETS" />
        <Button label="Biped" onClick={() => eventBus.emit('preset:load', { preset: 'biped' })} fullWidth />
        <Button label="Dog" onClick={() => eventBus.emit('preset:load', { preset: 'dog' })} fullWidth />
        <Button label="Walking Man" onClick={() => eventBus.emit('preset:load', { preset: 'walking_man' })} fullWidth />
      </div>
    </>
  );
}
