# B-Mesh — 3D Mesh Editor

본(Bone) 기반 절차적 메시 생성 에디터. React + Three.js + TypeScript.

## 프로젝트 실행

```bash
pnpm dev     # 개발 서버
pnpm build   # 프로덕션 빌드
```

## 에디터 구축

`/bmesh-editor` 스킬로 에이전트 팀을 호출하여 전체 에디터를 구축한다.

## 아키텍처

- `src/engine/` — Three.js 렌더링 엔진
- `src/mesh/` — 본/메시 시스템 (SDF, Marching Cubes)
- `src/ui/` — React UI 컴포넌트
- `src/store/` — Zustand 상태 관리
- `src/io/` — 파일 I/O (프로젝트, Import/Export)
- `src/core/` — EventBus, CommandManager, 수학 유틸

## 에이전트

- `bmesh-architect` — 시스템 아키텍처 설계
- `bmesh-renderer` — 3D 렌더링 엔진
- `bmesh-mesh-engine` — 본/메시 시스템
- `bmesh-ui` — UI 컴포넌트
- `bmesh-integrator` — 상태 관리, I/O, 통합

## 커밋 규칙

커밋 메시지는 한글로 작성한다.
