---
name: bmesh-editor
description: "B-Mesh 3D 메시 에디터를 구축하는 에이전트 팀 오케스트레이터. 통합 에디터, 3D 에디터, 메시 에디터, b-mesh."
---

# B-Mesh Editor Orchestrator

B-Mesh 3D 메시 에디터를 구축하는 에이전트 팀을 조율하는 통합 오케스트레이터.
본(Bone) 기반 절차적 메시 생성 에디터를 React + Three.js + TypeScript로 구현한다.

## 실행 모드: 에이전트 팀

## 에이전트 구성

| 팀원 | 에이전트 타입 | 역할 | 스킬 | 출력 |
|------|-------------|------|------|------|
| architect | bmesh-architect | 아키텍처 설계, 프로젝트 초기화 | — | 프로젝트 구조 + 설계 문서 |
| renderer | bmesh-renderer | 3D 렌더링 엔진 | bmesh-scene | `src/engine/` |
| mesh-engine | bmesh-mesh-engine | 본/메시 시스템 | bmesh-bone-system, bmesh-sculpt-tools | `src/mesh/` |
| ui | bmesh-ui | UI 컴포넌트 | bmesh-ui-panels | `src/ui/` |
| integrator | bmesh-integrator | 상태 관리, I/O, 통합 | bmesh-project-io | `src/store/`, `src/io/`, `src/core/` |

## 워크플로우

### Phase 1: 프로젝트 초기화 및 아키텍처 설계

**실행 주체:** 리더 (오케스트레이터) 직접 수행

1. 레퍼런스 스크린샷 분석 — UI 구조, 기능 목록 확인
2. `references/tech-stack.md` 참조하여 기술 스택 확인
3. 프로젝트 초기화:
   ```bash
   cd /Users/robin/Downloads/b-mesh
   pnpm create vite . --template react-ts
   pnpm add three zustand immer
   pnpm add -D @types/three tailwindcss @tailwindcss/vite
   ```
4. `_workspace/` 디렉토리 생성
5. 아키텍처 청사진 작성 → `_workspace/01_architecture.md`

### Phase 2: 팀 구성

1. 팀 생성:
   ```
   TeamCreate(
     team_name: "bmesh-team",
     members: [
       {
         name: "architect",
         agent_type: "bmesh-architect",
         prompt: "B-Mesh 3D 메시 에디터의 핵심 데이터 모델과 모듈 인터페이스를 설계하라. references/tech-stack.md의 디렉토리 구조를 따른다. src/mesh/types.ts에 핵심 타입 정의, src/core/math.ts에 벡터 유틸리티를 구현하라. 설계 완료 후 모든 팀원에게 SendMessage로 인터페이스를 공유하라."
       },
       {
         name: "renderer",
         agent_type: "bmesh-renderer",
         prompt: "Three.js 기반 3D 렌더링 엔진을 구현하라. bmesh-scene 스킬을 참조하라. architect가 인터페이스를 공유하면 그에 맞춰 구현한다. src/engine/ 디렉토리에 SceneManager, CameraController, RaycastManager, GridHelper, MeshRenderer, 셰이더를 구현하라."
       },
       {
         name: "mesh-engine",
         agent_type: "bmesh-mesh-engine",
         prompt: "본 기반 메시 생성 엔진을 구현하라. bmesh-bone-system, bmesh-sculpt-tools 스킬을 참조하라. architect가 타입을 정의하면 그에 맞춰 구현한다. src/mesh/ 디렉토리에 BoneSystem, SDFGenerator, MarchingCubes, SculptTools, ToolManager, SymmetryManager, Presets를 구현하라."
       },
       {
         name: "ui-dev",
         agent_type: "bmesh-ui",
         prompt: "React + Tailwind CSS로 에디터 UI를 구현하라. bmesh-ui-panels 스킬을 참조하라. 레퍼런스 스크린샷과 동일한 레이아웃을 만든다. src/ui/ 디렉토리에 EditorLayout, LeftPanel, RightPanel, Viewport, 공통 컴포넌트를 구현하라."
       },
       {
         name: "integrator",
         agent_type: "bmesh-integrator",
         prompt: "상태 관리, Undo/Redo, 파일 I/O, 모듈 통합을 구현하라. bmesh-project-io 스킬을 참조하라. src/store/, src/io/, src/core/ 디렉토리에 Zustand 스토어, CommandManager, EventBus, ProjectIO, MeshExporter/Importer를 구현하라. App.tsx와 main.tsx에서 모든 모듈을 통합하라."
       }
     ]
   )
   ```

2. 작업 등록:
   ```
   TaskCreate(tasks: [
     // Phase 2a: 기반 작업 (architect 주도)
     { title: "핵심 타입 정의 (types.ts, math.ts)", assignee: "architect", description: "Bone, MeshData, Vec3 등 핵심 인터페이스와 벡터 유틸리티 정의" },
     { title: "Zustand 스토어 설계", assignee: "architect", description: "editorStore, meshStore, historyStore 인터페이스 설계" },

     // Phase 2b: 병렬 구현 (architect 완료 후)
     { title: "SceneManager + 렌더 루프", assignee: "renderer", depends_on: ["핵심 타입 정의 (types.ts, math.ts)"] },
     { title: "CameraController + 6방향 뷰", assignee: "renderer", depends_on: ["핵심 타입 정의 (types.ts, math.ts)"] },
     { title: "RaycastManager + GridHelper", assignee: "renderer", depends_on: ["SceneManager + 렌더 루프"] },
     { title: "MeshRenderer + 셰이더", assignee: "renderer", depends_on: ["SceneManager + 렌더 루프"] },

     { title: "BoneSystem 구현", assignee: "mesh-engine", depends_on: ["핵심 타입 정의 (types.ts, math.ts)"] },
     { title: "SDFGenerator 구현", assignee: "mesh-engine", depends_on: ["BoneSystem 구현"] },
     { title: "MarchingCubes 구현", assignee: "mesh-engine", depends_on: ["SDFGenerator 구현"] },
     { title: "SymmetryManager + Presets", assignee: "mesh-engine", depends_on: ["BoneSystem 구현"] },
     { title: "SculptTools + ToolManager", assignee: "mesh-engine", depends_on: ["BoneSystem 구현", "MarchingCubes 구현"] },

     { title: "공통 UI 컴포넌트 (Button, Slider)", assignee: "ui-dev" },
     { title: "EditorLayout + Viewport", assignee: "ui-dev" },
     { title: "LeftPanel 구현", assignee: "ui-dev", depends_on: ["공통 UI 컴포넌트 (Button, Slider)"] },
     { title: "RightPanel 구현", assignee: "ui-dev", depends_on: ["공통 UI 컴포넌트 (Button, Slider)"] },

     { title: "EventBus + CommandManager", assignee: "integrator" },
     { title: "Zustand 스토어 구현", assignee: "integrator", depends_on: ["Zustand 스토어 설계"] },
     { title: "ProjectIO (저장/불러오기)", assignee: "integrator", depends_on: ["Zustand 스토어 구현"] },
     { title: "MeshExporter/Importer", assignee: "integrator", depends_on: ["Zustand 스토어 구현"] },

     // Phase 2c: 통합
     { title: "App.tsx 통합 + main.tsx", assignee: "integrator", depends_on: ["MeshRenderer + 셰이더", "SculptTools + ToolManager", "RightPanel 구현", "LeftPanel 구현", "ProjectIO (저장/불러오기)"] },
     { title: "키보드 단축키 바인딩", assignee: "ui-dev", depends_on: ["App.tsx 통합 + main.tsx"] },
   ])
   ```

### Phase 3: 핵심 시스템 구현

**실행 방식:** 팀원들이 자체 조율

1. **architect**가 먼저 타입 정의 + 스토어 설계 완료
2. architect가 완료 후 모든 팀원에게 SendMessage로 인터페이스 공유
3. **renderer**, **mesh-engine**, **ui-dev**, **integrator**가 병렬로 구현 시작
4. 팀원 간 통신:
   - renderer ↔ mesh-engine: BufferGeometry 데이터 포맷 협의
   - ui-dev ↔ integrator: 스토어 API 바인딩 협의
   - mesh-engine → integrator: 직렬화 가능한 본/메시 구조 공유

**산출물 저장:**

| 팀원 | 출력 경로 |
|------|----------|
| architect | `src/mesh/types.ts`, `src/core/math.ts`, `_workspace/01_architecture.md` |
| renderer | `src/engine/*` |
| mesh-engine | `src/mesh/*` |
| ui-dev | `src/ui/*` |
| integrator | `src/store/*`, `src/io/*`, `src/core/*`, `src/App.tsx`, `src/main.tsx` |

**리더 모니터링:**
- TaskGet으로 진행률 확인
- architect 완료 시점에서 나머지 팀원 시작 여부 확인
- 팀원이 막혔을 때 SendMessage로 지시 또는 작업 재할당

### Phase 4: 통합 및 검증

1. 모든 팀원의 작업 완료 대기 (TaskGet)
2. integrator가 App.tsx에서 모든 모듈 통합
3. 리더가 빌드 실행:
   ```bash
   cd /Users/robin/Downloads/b-mesh && pnpm build
   ```
4. 빌드 에러 수정 (타입 에러, 임포트 경로 등)
5. 개발 서버 실행 및 기능 확인:
   ```bash
   pnpm dev
   ```

### Phase 5: 정리

1. 팀원들에게 종료 요청 (SendMessage)
2. `_workspace/` 디렉토리 보존
3. 사용자에게 결과 요약 보고:
   - 구현된 기능 목록
   - 개발 서버 URL
   - 알려진 제한사항

## 데이터 흐름

```
[리더] → TeamCreate → [architect] ──types/interfaces──→ [renderer]
                          │                              [mesh-engine]
                          │                              [ui-dev]
                          │                              [integrator]
                          │
                     SendMessage (인터페이스 공유)
                          │
              ┌───────────┼───────────┐───────────┐
              ↓           ↓           ↓           ↓
         [renderer]  [mesh-engine]  [ui-dev]  [integrator]
              │           │           │           │
              ↓           ↓           ↓           ↓
         src/engine/  src/mesh/   src/ui/    src/store/
                                              src/io/
                                              src/core/
              │           │           │           │
              └───────────┴───────────┴───────────┘
                                  ↓
                          [integrator: App.tsx 통합]
                                  ↓
                           pnpm build + dev
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 팀원 1명 실패/중지 | 리더가 SendMessage로 상태 확인 → 재시작 또는 리더가 직접 해당 모듈 구현 |
| 타입 충돌 | architect에게 인터페이스 수정 요청 → 관련 팀원 업데이트 |
| 빌드 실패 | 에러 로그 분석 → 해당 모듈 담당 팀원에게 수정 요청 |
| 렌더링 안 됨 | renderer + integrator에게 디버깅 요청 |
| 타임아웃 | 현재까지 구현된 코드로 빌드 시도, 미완성 모듈은 stub으로 대체 |

## 테스트 시나리오

### 정상 흐름
1. 리더가 프로젝트 초기화 (Vite + 의존성 설치)
2. Phase 2에서 팀 구성 (5명 팀원 + 21개 작업)
3. architect가 타입 정의 완료 → 팀원들에게 공유
4. 4명의 팀원이 병렬로 구현
5. integrator가 App.tsx에서 통합
6. `pnpm build` 성공
7. `pnpm dev`로 개발 서버 실행
8. 브라우저에서 3D 뷰포트 + UI 패널 확인

### 에러 흐름
1. mesh-engine이 MarchingCubes 구현 중 에러로 중지
2. 리더가 유휴 알림 수신
3. SendMessage로 mesh-engine 상태 확인 → 재시작
4. 재시작 실패 시 리더가 직접 MarchingCubes 구현
5. 나머지 모듈과 통합하여 빌드
6. 사용자에게 "MarchingCubes는 기본 구현으로 대체됨" 보고
