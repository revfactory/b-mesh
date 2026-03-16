---
name: bmesh-sculpt-tools
description: "B-Mesh 스컬프팅 도구를 구현하는 스킬. Draw, Move, Scale, Delete 도구 및 브러시 시스템."
---

# B-Mesh Sculpt Tools

메시 편집 도구 세트를 구현하는 스킬. 모든 도구는 커맨드 패턴으로 감싸져 Undo/Redo를 지원한다.

## 도구 목록

### 1. Draw Tool (브러시 추가)

**동작:** 클릭/드래그로 메시 표면 위에 새로운 본을 추가
**인터랙션:**
1. 마우스 다운 → 레이캐스트로 메시 표면 히트 포인트 계산
2. 히트 포인트에 새 본 생성 (기본 반경 = 브러시 크기)
3. 드래그 시 일정 간격으로 연속 본 추가
4. 대칭 축 활성 시 미러 위치에도 동시 생성

**파라미터:**
- `brushSize: number` (0.01 ~ 1.0, 기본 0.1)
- `strength: number` (0.1 ~ 1.0, 기본 0.5)

### 2. Move Tool (정점/본 이동)

**동작:** 본을 선택하여 드래그로 위치 이동
**인터랙션:**
1. 마우스 다운 → 가장 가까운 본 선택
2. 드래그 → 카메라 평면에 투영된 이동량 계산
3. 본 위치 업데이트 → Stretch Mode 시 실시간 메시 업데이트
4. 마우스 업 → MoveCommand 커밋

**파라미터:**
- `sensitivity: number` (0.1 ~ 2.0, 기본 1.0)

### 3. Scale Tool (본 크기 조절)

**동작:** 본을 선택하여 드래그로 반경(radius) 조절
**인터랙션:**
1. 마우스 다운 → 가장 가까운 본 선택
2. 수평 드래그 → 반경 증가/감소
3. 본 반경 업데이트 → Stretch Mode 시 실시간 메시 업데이트

**파라미터:**
- `scaleSensitivity: number` (0.01 ~ 0.5, 기본 0.1)

### 4. Delete Tool (본 삭제)

**동작:** 클릭한 본을 삭제
**인터랙션:**
1. 마우스 클릭 → 가장 가까운 본 선택
2. 확인 없이 즉시 삭제 (Undo로 복구 가능)
3. 삭제된 본의 자식 본은 부모에 재연결
4. 메시 재생성

## 커맨드 패턴

```typescript
interface EditCommand {
  type: 'addBone' | 'moveBone' | 'scaleBone' | 'deleteBone';
  execute(): void;
  undo(): void;
  // 직렬화 가능한 데이터만 포함
  serialize(): object;
}

class AddBoneCommand implements EditCommand {
  constructor(
    private boneSystem: BoneSystem,
    private bone: Bone,
    private parentId?: string
  ) {}

  execute() { this.boneSystem.addBone(this.bone); }
  undo() { this.boneSystem.removeBone(this.bone.id); }
}
```

## 도구 상태 머신

```
[Idle] --mouseDown--> [Active] --mouseMove--> [Dragging] --mouseUp--> [Idle]
                         |                                    |
                         +--------mouseUp (click)------------>+
```

모든 도구는 이 상태 머신을 공유하며, 각 전환(transition)에서 도구별 로직을 실행.

## 도구 매니저 (`src/mesh/ToolManager.ts`)

```typescript
interface ToolManager {
  activeTool: ToolType;  // 'draw' | 'move' | 'scale' | 'delete'
  setTool(tool: ToolType): void;
  handlePointerDown(event: PointerEvent): void;
  handlePointerMove(event: PointerEvent): void;
  handlePointerUp(event: PointerEvent): void;
}
```

## 키보드 단축키

| 키 | 도구 |
|----|------|
| D | Draw |
| G | Move (Grab) |
| S | Scale |
| X | Delete |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
