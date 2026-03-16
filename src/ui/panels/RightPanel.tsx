import Button from '../components/Button';
import Slider from '../components/Slider';
import SectionHeader from '../components/SectionHeader';
import { useEditorStore } from '../../store/editorStore';
import { eventBus } from '../../core/EventBus';
import type { EditorOptions, SymmetryState, ViewDirection } from '../../mesh/types';

const SYMMETRY_AXES: (keyof SymmetryState)[] = ['x', 'y', 'z'];

const CAMERA_VIEWS: { label: string; dir: ViewDirection }[] = [
  { label: '+X', dir: 'right' },
  { label: '+Y', dir: 'top' },
  { label: '+Z', dir: 'front' },
  { label: '-X', dir: 'left' },
  { label: '-Y', dir: 'bottom' },
  { label: '-Z', dir: 'back' },
];

interface OptionDef {
  key: keyof EditorOptions;
  label: string;
  variant: 'default' | 'accent' | 'lavender' | 'purple';
}

const OPTIONS: OptionDef[] = [
  { key: 'stretchMode', label: 'Stretch Mode', variant: 'accent' },
  { key: 'showGrid', label: 'Show Grid', variant: 'default' },
  { key: 'wireframe', label: 'Wireframe View', variant: 'default' },
  { key: 'vertexView', label: 'Vertex View', variant: 'default' },
  { key: 'hideMasked', label: 'Hide Masked', variant: 'lavender' },
  { key: 'meshPreview', label: 'Mesh Preview', variant: 'purple' },
];

export default function RightPanel() {
  const symmetry = useEditorStore((s) => s.symmetry);
  const setSymmetry = useEditorStore((s) => s.setSymmetry);
  const options = useEditorStore((s) => s.options);
  const setOption = useEditorStore((s) => s.setOption);
  const boneDensity = useEditorStore((s) => s.boneDensity);
  const setBoneDensity = useEditorStore((s) => s.setBoneDensity);
  const meshResolution = useEditorStore((s) => s.meshResolution);
  const setMeshResolution = useEditorStore((s) => s.setMeshResolution);

  return (
    <>
      {/* Symmetry */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <SectionHeader title="SYMMETRY" />
        <div className="flex gap-2">
          {SYMMETRY_AXES.map((axis) => (
            <Button
              key={axis}
              label={axis.toUpperCase()}
              active={symmetry[axis]}
              onClick={() => setSymmetry(axis, !symmetry[axis])}
            />
          ))}
        </div>
      </div>

      {/* Camera Views */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <SectionHeader title="CAMERA VIEWS" />
        <div className="grid grid-cols-3 gap-2">
          {CAMERA_VIEWS.map(({ label }) => (
            <Button key={label} label={label} onClick={() => eventBus.emit('camera:setView', { direction: label })} />
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <SectionHeader title="OPTIONS" />
        {OPTIONS.map(({ key, label, variant }) => (
          <Button
            key={key}
            label={label}
            active={options[key]}
            variant={variant}
            onClick={() => setOption(key, !options[key])}
            fullWidth
          />
        ))}
      </div>

      {/* Bone Density */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <Slider
          label="BONE DENSITY"
          value={boneDensity}
          min={0.1}
          max={10}
          step={0.1}
          onChange={setBoneDensity}
        />
      </div>

      {/* Mesh Resolution */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <Slider
          label="MESH RESOLUTION"
          value={meshResolution}
          min={8}
          max={128}
          step={1}
          onChange={setMeshResolution}
        />
      </div>
    </>
  );
}
