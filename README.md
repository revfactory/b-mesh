# B-Mesh — 3D Mesh Editor

본(Bone) 기반 절차적 메시 생성 에디터. SDF(Signed Distance Field)와 Marching Cubes 알고리즘으로 본 구조에서 3D 메시를 실시간 생성합니다.

![B-Mesh Editor](https://github.com/user-attachments/assets/placeholder.png)

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | React 19 + TypeScript |
| 3D 엔진 | Three.js |
| 상태 관리 | Zustand + Immer |
| 스타일링 | Tailwind CSS 4 |
| 빌드 | Vite 6 |

## 주요 기능

### 메시 생성 파이프라인
- **Bone → SDF → Marching Cubes → Mesh**
- 본 배치로부터 스칼라 필드 생성 (구체/캡슐 SDF + Smooth Minimum)
- 표준 256 케이스 Marching Cubes로 폴리곤 메시 추출
- 본 영역별 거리 가중 색상 할당

### 스컬프팅 도구
| 도구 | 단축키 | 기능 |
|------|--------|------|
| Draw | `D` | 클릭 위치에 본 추가 |
| Move | `G` | 본 드래그 이동 |
| Scale | `S` | 본 반경 조절 |
| Delete | `X` | 본 삭제 |

### 편집 기능
- **Undo/Redo** — `Ctrl+Z` / `Ctrl+Shift+Z` (커맨드 패턴)
- **X/Y/Z 대칭 편집** — 미러링 자동 적용
- **6방향 카메라 프리셋** — +X, -X, +Y, -Y, +Z, -Z

### 렌더링 모드
- **Solid** — 본 영역 색상 셰이더
- **Wireframe** — 와이어프레임 오버레이
- **Vertex** — 정점 포인트 표시
- **Mesh Preview** — 스무스 노멀 프리뷰

### 프리셋
- **Biped** — 인간형 (머리/상체/팔/다리)
- **Quadruped** — 4족 보행 동물
- **Sphere** — 단일 구체

### 파일 I/O
- `.bmesh` 프로젝트 저장/불러오기
- OBJ/STL 내보내기
- localStorage 자동 저장 (30초)

## 실행

```bash
pnpm install
pnpm dev
```

## 프로젝트 구조

```
src/
├── engine/          # Three.js 렌더링 엔진
│   ├── SceneManager.ts
│   ├── CameraController.ts
│   ├── MeshRenderer.ts
│   ├── RaycastManager.ts
│   └── GridHelper.ts
├── mesh/            # 본/메시 시스템
│   ├── BoneSystem.ts
│   ├── SDFGenerator.ts
│   ├── MarchingCubes.ts
│   ├── SculptTools.ts
│   ├── SymmetryManager.ts
│   └── Presets.ts
├── ui/              # React UI
│   ├── EditorLayout.tsx
│   ├── panels/
│   └── components/
├── store/           # Zustand 상태 관리
├── io/              # 파일 I/O
├── core/            # EventBus, CommandManager
└── App.tsx
```

## 파라미터

| 파라미터 | 범위 | 설명 |
|---------|------|------|
| Bone Density | 0.1 ~ 10.0 | 본 영향 반경 배율 |
| Mesh Resolution | 8 ~ 128 | Marching Cubes 그리드 해상도 |

## 라이선스

MIT
