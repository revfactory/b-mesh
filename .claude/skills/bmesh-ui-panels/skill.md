---
name: bmesh-ui-panels
description: "B-Mesh 에디터 UI 패널 컴포넌트를 구현하는 스킬. React + Tailwind CSS 기반 레이아웃."
---

# B-Mesh UI Panels

레퍼런스 스크린샷과 동일한 에디터 UI를 React + Tailwind CSS로 구현하는 스킬.

## 레이아웃 구조

```
┌──────────────────────────────────────────────┐
│                   App                         │
│ ┌────────┐ ┌──────────────┐ ┌──────────────┐ │
│ │  Left  │ │              │ │    Right     │ │
│ │ Panel  │ │   Viewport   │ │    Panel     │ │
│ │ (220px)│ │   (flex-1)   │ │   (260px)    │ │
│ │        │ │              │ │              │ │
│ │        │ │   Three.js   │ │              │ │
│ │        │ │   Canvas     │ │              │ │
│ │        │ │              │ │              │ │
│ └────────┘ └──────────────┘ └──────────────┘ │
└──────────────────────────────────────────────┘
```

## 컴포넌트 트리

```
App
├── EditorLayout
│   ├── LeftPanel
│   │   ├── FileSection        (New Project, Import, Export)
│   │   ├── ToolsSection       (Draw, Move, Scale, Delete)
│   │   ├── HistorySection     (Undo, Redo)
│   │   └── PresetsSection     (Biped, ...)
│   ├── Viewport               (Three.js canvas container)
│   └── RightPanel
│       ├── SymmetrySection    (X, Y, Z toggles)
│       ├── CameraViewSection  (+X, +Y, +Z, -X, -Y, -Z)
│       ├── OptionsSection     (6개 토글 옵션)
│       ├── BoneDensitySlider  (0.1 ~ 10.0)
│       └── MeshResolutionSlider (8 ~ 128)
```

## 공통 UI 컴포넌트

### Button (`src/ui/components/Button.tsx`)

```tsx
interface ButtonProps {
  label: string;
  active?: boolean;        // 파란 배경
  variant?: 'default' | 'danger' | 'success' | 'accent';
  onClick: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
}
```

**스타일 규칙 (레퍼런스 기준):**
- 기본: 흰 배경, 회색 테두리, 검은 텍스트
- active: 파란 배경 (#3b82f6), 흰 텍스트
- danger (New Project): 빨간 테두리, 빨간 텍스트
- accent (Stretch Mode): 파란 배경
- special (Hide Masked): 연보라 배경 (#a78bfa)
- special (Mesh Preview): 보라 배경 (#c026d3)
- 둥근 모서리: rounded-lg
- 패딩: px-4 py-2

### Slider (`src/ui/components/Slider.tsx`)

```tsx
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}
```

**스타일 규칙:**
- 레이블 + 현재 값 표시: "BONE DENSITY (3.2)"
- 커스텀 슬라이더: 진한 청록색 트랙 (#0d9488)
- 둥근 썸 (원형)

### SectionHeader

```tsx
interface SectionHeaderProps {
  title: string;  // "FILE & PROJECT", "TOOLS", etc.
}
```

**스타일:** 회색 대문자 텍스트, text-xs, tracking-wider, font-semibold

## 패널 세부 구현

### LeftPanel

```tsx
// 섹션별 간격: space-y-6
// 카드 스타일: bg-white rounded-xl shadow-sm p-4

// FileSection
<SectionHeader title="FILE & PROJECT" />
<Button label="New Project" variant="danger" />
<div className="flex gap-2">
  <Button label="Import" />
  <Button label="Export" />
</div>

// ToolsSection — 단일 선택 (라디오 그룹)
<SectionHeader title="TOOLS" />
{['Draw', 'Move', 'Scale', 'Delete'].map(tool => (
  <Button label={tool} active={activeTool === tool} onClick={() => setTool(tool)} />
))}

// HistorySection
<SectionHeader title="HISTORY" />
<div className="flex gap-2">
  <Button label="Undo" onClick={undo} disabled={!canUndo} />
  <Button label="Redo" onClick={redo} disabled={!canRedo} />
</div>

// PresetsSection
<SectionHeader title="PRESETS" />
<Button label="Biped" onClick={() => loadPreset('biped')} />
```

### RightPanel

```tsx
// SymmetrySection — 다중 선택 (체크박스 그룹)
<SectionHeader title="SYMMETRY" />
<div className="flex gap-2">
  {['X', 'Y', 'Z'].map(axis => (
    <Button label={axis} active={symmetry[axis]} onClick={() => toggleSymmetry(axis)} />
  ))}
</div>

// CameraViewSection — 6방향 버튼 그리드
<SectionHeader title="CAMERA VIEWS" />
<div className="grid grid-cols-3 gap-2">
  {['+X', '+Y', '+Z', '-X', '-Y', '-Z'].map(view => (
    <Button label={view} onClick={() => setCameraView(view)} />
  ))}
</div>

// OptionsSection — 개별 토글
<SectionHeader title="OPTIONS" />
<Button label="Stretch Mode" active={stretchMode} variant="accent" />
<Button label="Show Grid" active={showGrid} />
<Button label="Wireframe View" active={wireframe} />
<Button label="Vertex View" active={vertexView} />
<Button label="Hide Masked" active={hideMasked} variant="lavender" />
<Button label="Mesh Preview" active={meshPreview} variant="purple" />

// 슬라이더
<Slider label="BONE DENSITY" value={boneDensity} min={0.1} max={10} step={0.1} />
<Slider label="MESH RESOLUTION" value={meshResolution} min={8} max={128} step={1} />
```

### Viewport

```tsx
// ref를 Three.js SceneManager에 전달
const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (containerRef.current) {
    sceneManager.init(containerRef.current);
  }
  return () => sceneManager.dispose();
}, []);

<div ref={containerRef} className="flex-1 h-full cursor-crosshair" />
```

## Zustand 스토어 연결

```typescript
// src/store/editorStore.ts
interface EditorState {
  activeTool: 'draw' | 'move' | 'scale' | 'delete';
  symmetry: { x: boolean; y: boolean; z: boolean };
  options: {
    stretchMode: boolean;
    showGrid: boolean;
    wireframe: boolean;
    vertexView: boolean;
    hideMasked: boolean;
    meshPreview: boolean;
  };
  boneDensity: number;
  meshResolution: number;
  // actions
  setTool: (tool: ToolType) => void;
  toggleSymmetry: (axis: 'x' | 'y' | 'z') => void;
  toggleOption: (option: keyof EditorState['options']) => void;
  setBoneDensity: (value: number) => void;
  setMeshResolution: (value: number) => void;
}
```
