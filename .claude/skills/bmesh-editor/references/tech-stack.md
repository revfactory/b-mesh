# B-Mesh 기술 스택

## 핵심 기술

| 영역 | 기술 | 버전 | 용도 |
|------|------|------|------|
| 런타임 | TypeScript | 5.x | 타입 안전성 |
| 프레임워크 | React | 19.x | UI 컴포넌트 |
| 3D 엔진 | Three.js | r170+ | WebGL 렌더링 |
| 상태 관리 | Zustand | 5.x | 전역 상태 |
| 불변성 | Immer | 10.x | 상태 업데이트 |
| 스타일링 | Tailwind CSS | 4.x | UI 스타일링 |
| 빌드 | Vite | 6.x | 번들러/개발서버 |
| 패키지 매니저 | pnpm | latest | 의존성 관리 |

## 디렉토리 구조

```
b-mesh/
├── public/
│   └── index.html
├── src/
│   ├── main.tsx                # 진입점
│   ├── App.tsx                 # 루트 컴포넌트
│   ├── engine/                 # 3D 렌더링 엔진
│   │   ├── SceneManager.ts
│   │   ├── CameraController.ts
│   │   ├── MeshRenderer.ts
│   │   ├── RaycastManager.ts
│   │   ├── GridHelper.ts
│   │   └── shaders/
│   │       ├── bone-color.vert
│   │       └── bone-color.frag
│   ├── mesh/                   # 메시/본 시스템
│   │   ├── types.ts
│   │   ├── BoneSystem.ts
│   │   ├── SDFGenerator.ts
│   │   ├── MarchingCubes.ts
│   │   ├── SculptTools.ts
│   │   ├── ToolManager.ts
│   │   ├── SymmetryManager.ts
│   │   └── Presets.ts
│   ├── ui/                     # UI 컴포넌트
│   │   ├── EditorLayout.tsx
│   │   ├── panels/
│   │   │   ├── LeftPanel.tsx
│   │   │   ├── RightPanel.tsx
│   │   │   └── Viewport.tsx
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── Slider.tsx
│   │   │   ├── SectionHeader.tsx
│   │   │   └── FileDialog.tsx
│   │   └── hooks/
│   │       ├── useKeyboard.ts
│   │       └── useViewport.ts
│   ├── store/                  # 상태 관리
│   │   ├── editorStore.ts
│   │   ├── meshStore.ts
│   │   └── historyStore.ts
│   ├── io/                     # 파일 I/O
│   │   ├── ProjectIO.ts
│   │   ├── MeshExporter.ts
│   │   └── MeshImporter.ts
│   └── core/                   # 핵심 유틸리티
│       ├── EventBus.ts
│       ├── CommandManager.ts
│       └── math.ts             # 벡터/행렬 유틸
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── index.html
```

## 프로젝트 초기화 명령

```bash
pnpm create vite b-mesh --template react-ts
cd b-mesh
pnpm add three zustand immer
pnpm add -D @types/three tailwindcss @tailwindcss/vite
```

## 성능 목표

| 지표 | 목표 |
|------|------|
| FPS | 60fps (메시 10만 정점 이하) |
| 메시 생성 | < 100ms (해상도 64 기준) |
| 초기 로드 | < 2초 |
| 번들 크기 | < 1MB (gzip) |
