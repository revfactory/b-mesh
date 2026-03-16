// ============================================================
// B-Mesh Presets — 사전 정의된 본 구조
// ============================================================

import type { Preset, Bone, BoneConnection, Vec3 } from './types';

function makeBone(
  id: string,
  name: string,
  position: Vec3,
  radius: number,
  parentId: string | null,
  color: Vec3,
): Bone {
  return {
    id,
    name,
    position,
    radius,
    parentId,
    childIds: [],
    color,
    masked: false,
  };
}

// Color palette
const RED: Vec3 = [0.9, 0.2, 0.2];
const BLUE: Vec3 = [0.2, 0.4, 0.9];
const GREEN: Vec3 = [0.2, 0.8, 0.3];
const ORANGE: Vec3 = [0.9, 0.6, 0.1];

export const BIPED_PRESET: Preset = {
  name: 'Biped',
  bones: [
    // Head & Neck
    makeBone('head', '머리', [0, 1.8, 0], 0.15, 'neck', RED),
    makeBone('neck', '목', [0, 1.58, 0], 0.07, 'chest', BLUE),
    // Torso
    makeBone('chest', '상체', [0, 1.3, 0], 0.22, 'abdomen', BLUE),
    makeBone('abdomen', '복부', [0, 1.0, 0], 0.18, 'hip', ORANGE),
    makeBone('hip', '골반', [0, 0.78, 0], 0.20, null, ORANGE),
    // Left arm
    makeBone('l_shoulder', '왼쪽 어깨', [-0.30, 1.42, 0], 0.10, 'chest', BLUE),
    makeBone('l_upper_arm', '왼쪽 상완', [-0.55, 1.20, 0], 0.09, 'l_shoulder', GREEN),
    makeBone('l_lower_arm', '왼쪽 하완', [-0.75, 0.95, 0], 0.08, 'l_upper_arm', GREEN),
    makeBone('l_hand', '왼쪽 손', [-0.90, 0.75, 0], 0.06, 'l_lower_arm', RED),
    // Right arm
    makeBone('r_shoulder', '오른쪽 어깨', [0.30, 1.42, 0], 0.10, 'chest', BLUE),
    makeBone('r_upper_arm', '오른쪽 상완', [0.55, 1.20, 0], 0.09, 'r_shoulder', GREEN),
    makeBone('r_lower_arm', '오른쪽 하완', [0.75, 0.95, 0], 0.08, 'r_upper_arm', GREEN),
    makeBone('r_hand', '오른쪽 손', [0.90, 0.75, 0], 0.06, 'r_lower_arm', RED),
    // Left leg
    makeBone('l_upper_leg', '왼쪽 대퇴', [-0.18, 0.52, 0], 0.12, 'hip', GREEN),
    makeBone('l_lower_leg', '왼쪽 하퇴', [-0.18, 0.25, 0], 0.10, 'l_upper_leg', GREEN),
    makeBone('l_foot', '왼쪽 발', [-0.18, 0.05, 0.04], 0.07, 'l_lower_leg', RED),
    // Right leg
    makeBone('r_upper_leg', '오른쪽 대퇴', [0.18, 0.52, 0], 0.12, 'hip', GREEN),
    makeBone('r_lower_leg', '오른쪽 하퇴', [0.18, 0.25, 0], 0.10, 'r_upper_leg', GREEN),
    makeBone('r_foot', '오른쪽 발', [0.18, 0.05, 0.04], 0.07, 'r_lower_leg', RED),
  ],
  connections: [
    // Spine
    { boneA: 'head', boneB: 'neck', strength: 1.0 },
    { boneA: 'neck', boneB: 'chest', strength: 1.0 },
    { boneA: 'chest', boneB: 'abdomen', strength: 1.0 },
    { boneA: 'abdomen', boneB: 'hip', strength: 1.0 },
    // Left arm
    { boneA: 'chest', boneB: 'l_shoulder', strength: 1.0 },
    { boneA: 'l_shoulder', boneB: 'l_upper_arm', strength: 1.0 },
    { boneA: 'l_upper_arm', boneB: 'l_lower_arm', strength: 1.0 },
    { boneA: 'l_lower_arm', boneB: 'l_hand', strength: 1.0 },
    // Right arm
    { boneA: 'chest', boneB: 'r_shoulder', strength: 1.0 },
    { boneA: 'r_shoulder', boneB: 'r_upper_arm', strength: 1.0 },
    { boneA: 'r_upper_arm', boneB: 'r_lower_arm', strength: 1.0 },
    { boneA: 'r_lower_arm', boneB: 'r_hand', strength: 1.0 },
    // Left leg
    { boneA: 'hip', boneB: 'l_upper_leg', strength: 1.0 },
    { boneA: 'l_upper_leg', boneB: 'l_lower_leg', strength: 1.0 },
    { boneA: 'l_lower_leg', boneB: 'l_foot', strength: 1.0 },
    // Right leg
    { boneA: 'hip', boneB: 'r_upper_leg', strength: 1.0 },
    { boneA: 'r_upper_leg', boneB: 'r_lower_leg', strength: 1.0 },
    { boneA: 'r_lower_leg', boneB: 'r_foot', strength: 1.0 },
  ],
};

export const QUADRUPED_PRESET: Preset = {
  name: 'Quadruped',
  bones: [
    makeBone('head', '머리', [0, 0.6, 0.8], 0.10, 'neck', RED),
    makeBone('neck', '목', [0, 0.55, 0.6], 0.07, 'spine_upper', BLUE),
    makeBone('spine_upper', '상부 척추', [0, 0.5, 0.3], 0.12, 'spine_lower', BLUE),
    makeBone('spine_lower', '하부 척추', [0, 0.5, -0.3], 0.11, null, ORANGE),
    makeBone('tail', '꼬리', [0, 0.55, -0.6], 0.04, 'spine_lower', ORANGE),
    // Front legs
    makeBone('fl_upper', '왼앞 상부', [-0.15, 0.3, 0.3], 0.06, 'spine_upper', GREEN),
    makeBone('fl_lower', '왼앞 하부', [-0.15, 0.1, 0.3], 0.05, 'fl_upper', GREEN),
    makeBone('fr_upper', '오른앞 상부', [0.15, 0.3, 0.3], 0.06, 'spine_upper', GREEN),
    makeBone('fr_lower', '오른앞 하부', [0.15, 0.1, 0.3], 0.05, 'fr_upper', GREEN),
    // Back legs
    makeBone('bl_upper', '왼뒤 상부', [-0.15, 0.3, -0.3], 0.07, 'spine_lower', GREEN),
    makeBone('bl_lower', '왼뒤 하부', [-0.15, 0.1, -0.3], 0.05, 'bl_upper', GREEN),
    makeBone('br_upper', '오른뒤 상부', [0.15, 0.3, -0.3], 0.07, 'spine_lower', GREEN),
    makeBone('br_lower', '오른뒤 하부', [0.15, 0.1, -0.3], 0.05, 'br_upper', GREEN),
  ],
  connections: [
    { boneA: 'head', boneB: 'neck', strength: 1.0 },
    { boneA: 'neck', boneB: 'spine_upper', strength: 1.0 },
    { boneA: 'spine_upper', boneB: 'spine_lower', strength: 1.0 },
    { boneA: 'spine_lower', boneB: 'tail', strength: 1.0 },
    { boneA: 'spine_upper', boneB: 'fl_upper', strength: 1.0 },
    { boneA: 'fl_upper', boneB: 'fl_lower', strength: 1.0 },
    { boneA: 'spine_upper', boneB: 'fr_upper', strength: 1.0 },
    { boneA: 'fr_upper', boneB: 'fr_lower', strength: 1.0 },
    { boneA: 'spine_lower', boneB: 'bl_upper', strength: 1.0 },
    { boneA: 'bl_upper', boneB: 'bl_lower', strength: 1.0 },
    { boneA: 'spine_lower', boneB: 'br_upper', strength: 1.0 },
    { boneA: 'br_upper', boneB: 'br_lower', strength: 1.0 },
  ],
};

export const SPHERE_PRESET: Preset = {
  name: 'Sphere',
  bones: [
    makeBone('center', '중심', [0, 0.5, 0], 0.3, null, BLUE),
  ],
  connections: [],
};

const BROWN: Vec3 = [0.55, 0.35, 0.2];
const TAN: Vec3 = [0.7, 0.5, 0.3];
const DARK: Vec3 = [0.3, 0.2, 0.15];

export const DOG_PRESET: Preset = {
  name: 'Dog',
  bones: [
    // ── Head (5 bones) ──────────────────────────────────────
    makeBone('nose', '코', [-1.05, 0.76, 0], 0.022, 'snout', DARK),
    makeBone('snout', '주둥이', [-0.93, 0.79, 0], 0.042, 'head', DARK),
    makeBone('head', '두개골', [-0.74, 0.86, 0], 0.082, 'neck_upper', BROWN),
    makeBone('ear_l', '왼쪽 귀', [-0.77, 1.06, 0.045], 0.015, 'head', DARK),
    makeBone('ear_r', '오른쪽 귀', [-0.77, 1.06, -0.045], 0.015, 'head', DARK),

    // ── Neck (3 bones) ──────────────────────────────────────
    makeBone('neck_upper', '상부 목', [-0.62, 0.80, 0], 0.052, 'neck_mid', TAN),
    makeBone('neck_mid', '중부 목', [-0.50, 0.72, 0], 0.062, 'neck_lower', TAN),
    makeBone('neck_lower', '하부 목', [-0.38, 0.64, 0], 0.072, 'chest_front', TAN),

    // ── Spine / Torso (6 bones) ─────────────────────────────
    makeBone('chest_front', '앞가슴', [-0.24, 0.55, 0], 0.11, 'chest', TAN),
    makeBone('chest', '가슴', [-0.08, 0.53, 0], 0.12, 'chest_back', TAN),
    makeBone('chest_back', '뒷가슴', [0.08, 0.52, 0], 0.11, 'spine_mid', BROWN),
    makeBone('spine_mid', '척추 중간', [0.22, 0.52, 0], 0.095, 'loin', BROWN),
    makeBone('loin', '허리', [0.35, 0.53, 0], 0.085, 'hip', BROWN),
    makeBone('hip', '엉덩이', [0.48, 0.55, 0], 0.095, null, BROWN),

    // ── Tail (5 bones) — curved upward arc ──────────────────
    makeBone('tail1', '꼬리1', [0.60, 0.60, 0], 0.032, 'hip', DARK),
    makeBone('tail2', '꼬리2', [0.70, 0.66, 0], 0.025, 'tail1', DARK),
    makeBone('tail3', '꼬리3', [0.78, 0.73, 0], 0.020, 'tail2', DARK),
    makeBone('tail4', '꼬리4', [0.84, 0.81, 0], 0.016, 'tail3', DARK),
    makeBone('tail5', '꼬리끝', [0.88, 0.90, 0], 0.012, 'tail4', DARK),

    // ── Front Left Leg (forward stride) — 4 bones ───────────
    makeBone('fl_shoulder', '왼앞 어깨', [-0.27, 0.40, 0.10], 0.048, 'chest_front', GREEN),
    makeBone('fl_upper', '왼앞 상완', [-0.34, 0.26, 0.10], 0.035, 'fl_shoulder', GREEN),
    makeBone('fl_lower', '왼앞 전완', [-0.40, 0.13, 0.10], 0.027, 'fl_upper', GREEN),
    makeBone('fl_paw', '왼앞 발', [-0.44, 0.025, 0.10], 0.025, 'fl_lower', DARK),

    // ── Front Right Leg (back stride) — 4 bones ─────────────
    makeBone('fr_shoulder', '오른앞 어깨', [-0.18, 0.40, -0.10], 0.048, 'chest_front', GREEN),
    makeBone('fr_upper', '오른앞 상완', [-0.10, 0.26, -0.10], 0.035, 'fr_shoulder', GREEN),
    makeBone('fr_lower', '오른앞 전완', [-0.02, 0.13, -0.10], 0.027, 'fr_upper', GREEN),
    makeBone('fr_paw', '오른앞 발', [0.04, 0.025, -0.10], 0.025, 'fr_lower', DARK),

    // ── Back Left Leg (back stride) — 4 bones ───────────────
    makeBone('bl_thigh', '왼뒤 대퇴', [0.43, 0.38, 0.10], 0.055, 'hip', GREEN),
    makeBone('bl_knee', '왼뒤 무릎', [0.36, 0.23, 0.10], 0.032, 'bl_thigh', GREEN),
    makeBone('bl_shin', '왼뒤 정강이', [0.38, 0.11, 0.10], 0.025, 'bl_knee', GREEN),
    makeBone('bl_paw', '왼뒤 발', [0.36, 0.025, 0.10], 0.025, 'bl_shin', DARK),

    // ── Back Right Leg (forward stride) — 4 bones ───────────
    makeBone('br_thigh', '오른뒤 대퇴', [0.50, 0.38, -0.10], 0.055, 'hip', GREEN),
    makeBone('br_knee', '오른뒤 무릎', [0.58, 0.23, -0.10], 0.032, 'br_thigh', GREEN),
    makeBone('br_shin', '오른뒤 정강이', [0.62, 0.11, -0.10], 0.025, 'br_knee', GREEN),
    makeBone('br_paw', '오른뒤 발', [0.66, 0.025, -0.10], 0.025, 'br_shin', DARK),
  ],
  connections: [
    // Head
    { boneA: 'nose', boneB: 'snout', strength: 1.0 },
    { boneA: 'snout', boneB: 'head', strength: 1.0 },
    { boneA: 'ear_l', boneB: 'head', strength: 1.0 },
    { boneA: 'ear_r', boneB: 'head', strength: 1.0 },
    // Neck
    { boneA: 'head', boneB: 'neck_upper', strength: 1.0 },
    { boneA: 'neck_upper', boneB: 'neck_mid', strength: 1.0 },
    { boneA: 'neck_mid', boneB: 'neck_lower', strength: 1.0 },
    { boneA: 'neck_lower', boneB: 'chest_front', strength: 1.0 },
    // Spine
    { boneA: 'chest_front', boneB: 'chest', strength: 1.0 },
    { boneA: 'chest', boneB: 'chest_back', strength: 1.0 },
    { boneA: 'chest_back', boneB: 'spine_mid', strength: 1.0 },
    { boneA: 'spine_mid', boneB: 'loin', strength: 1.0 },
    { boneA: 'loin', boneB: 'hip', strength: 1.0 },
    // Tail
    { boneA: 'hip', boneB: 'tail1', strength: 1.0 },
    { boneA: 'tail1', boneB: 'tail2', strength: 1.0 },
    { boneA: 'tail2', boneB: 'tail3', strength: 1.0 },
    { boneA: 'tail3', boneB: 'tail4', strength: 1.0 },
    { boneA: 'tail4', boneB: 'tail5', strength: 1.0 },
    // Front legs
    { boneA: 'chest_front', boneB: 'fl_shoulder', strength: 1.0 },
    { boneA: 'fl_shoulder', boneB: 'fl_upper', strength: 1.0 },
    { boneA: 'fl_upper', boneB: 'fl_lower', strength: 1.0 },
    { boneA: 'fl_lower', boneB: 'fl_paw', strength: 1.0 },
    { boneA: 'chest_front', boneB: 'fr_shoulder', strength: 1.0 },
    { boneA: 'fr_shoulder', boneB: 'fr_upper', strength: 1.0 },
    { boneA: 'fr_upper', boneB: 'fr_lower', strength: 1.0 },
    { boneA: 'fr_lower', boneB: 'fr_paw', strength: 1.0 },
    // Back legs
    { boneA: 'hip', boneB: 'bl_thigh', strength: 1.0 },
    { boneA: 'bl_thigh', boneB: 'bl_knee', strength: 1.0 },
    { boneA: 'bl_knee', boneB: 'bl_shin', strength: 1.0 },
    { boneA: 'bl_shin', boneB: 'bl_paw', strength: 1.0 },
    { boneA: 'hip', boneB: 'br_thigh', strength: 1.0 },
    { boneA: 'br_thigh', boneB: 'br_knee', strength: 1.0 },
    { boneA: 'br_knee', boneB: 'br_shin', strength: 1.0 },
    { boneA: 'br_shin', boneB: 'br_paw', strength: 1.0 },
  ],
};

const SKIN: Vec3 = [0.72, 0.55, 0.42];
const SHIRT: Vec3 = [0.25, 0.28, 0.32];
const PANTS: Vec3 = [0.2, 0.22, 0.28];
const SHOE: Vec3 = [0.15, 0.12, 0.1];
const HAIR: Vec3 = [0.2, 0.15, 0.1];

export const WALKING_MAN_PRESET: Preset = {
  name: 'Walking Man',
  bones: [
    // ── Head (3 bones) ──
    makeBone('head_top', '정수리', [0, 1.82, 0], 0.08, 'head', HAIR),
    makeBone('head', '머리', [0, 1.72, 0], 0.10, 'neck', SKIN),
    makeBone('chin', '턱', [0, 1.63, 0.03], 0.04, 'head', SKIN),

    // ── Neck (1 bone) ──
    makeBone('neck', '목', [0, 1.56, 0], 0.05, 'chest_upper', SKIN),

    // ── Torso (5 bones) ──
    makeBone('chest_upper', '상부 가슴', [0, 1.42, 0], 0.16, 'chest', SHIRT),
    makeBone('chest', '가슴', [0, 1.28, 0], 0.17, 'chest_lower', SHIRT),
    makeBone('chest_lower', '하부 가슴', [0, 1.14, 0], 0.15, 'abdomen', SHIRT),
    makeBone('abdomen', '복부', [0, 1.00, 0], 0.13, 'hip', SHIRT),
    makeBone('hip', '골반', [0, 0.88, 0], 0.15, null, PANTS),

    // ── Left Arm (straight down, slight back swing) — 4 bones ──
    makeBone('l_shoulder', '왼쪽 어깨', [-0.24, 1.42, 0], 0.065, 'chest_upper', SHIRT),
    makeBone('l_upper_arm', '왼쪽 상완', [-0.28, 1.24, -0.03], 0.05, 'l_shoulder', SHIRT),
    makeBone('l_forearm', '왼쪽 전완', [-0.30, 1.04, -0.05], 0.04, 'l_upper_arm', SHIRT),
    makeBone('l_hand', '왼쪽 손', [-0.30, 0.86, -0.03], 0.032, 'l_forearm', SKIN),

    // ── Right Arm (straight down, slight forward swing) — 4 bones ──
    makeBone('r_shoulder', '오른쪽 어깨', [0.24, 1.42, 0], 0.065, 'chest_upper', SHIRT),
    makeBone('r_upper_arm', '오른쪽 상완', [0.28, 1.24, 0.03], 0.05, 'r_shoulder', SHIRT),
    makeBone('r_forearm', '오른쪽 전완', [0.30, 1.04, 0.04], 0.04, 'r_upper_arm', SHIRT),
    makeBone('r_hand', '오른쪽 손', [0.30, 0.86, 0.02], 0.032, 'r_forearm', SKIN),

    // ── Left Leg (forward stride, longer) — 5 bones ──
    makeBone('l_thigh_upper', '왼쪽 대퇴 상부', [-0.10, 0.78, 0.03], 0.08, 'hip', PANTS),
    makeBone('l_thigh', '왼쪽 대퇴', [-0.11, 0.60, 0.08], 0.07, 'l_thigh_upper', PANTS),
    makeBone('l_knee', '왼쪽 무릎', [-0.12, 0.44, 0.10], 0.055, 'l_thigh', PANTS),
    makeBone('l_shin', '왼쪽 정강이', [-0.11, 0.24, 0.06], 0.045, 'l_knee', PANTS),
    makeBone('l_foot', '왼쪽 발', [-0.11, 0.03, 0.08], 0.04, 'l_shin', SHOE),

    // ── Right Leg (back stride, longer) — 5 bones ──
    makeBone('r_thigh_upper', '오른쪽 대퇴 상부', [0.10, 0.78, -0.03], 0.08, 'hip', PANTS),
    makeBone('r_thigh', '오른쪽 대퇴', [0.11, 0.60, -0.08], 0.07, 'r_thigh_upper', PANTS),
    makeBone('r_knee', '오른쪽 무릎', [0.12, 0.44, -0.12], 0.055, 'r_thigh', PANTS),
    makeBone('r_shin', '오른쪽 정강이', [0.11, 0.24, -0.08], 0.045, 'r_knee', PANTS),
    makeBone('r_foot', '오른쪽 발', [0.11, 0.03, -0.06], 0.04, 'r_shin', SHOE),
  ],
  connections: [
    // Head
    { boneA: 'head_top', boneB: 'head', strength: 1.0 },
    { boneA: 'chin', boneB: 'head', strength: 1.0 },
    { boneA: 'head', boneB: 'neck', strength: 1.0 },
    // Spine
    { boneA: 'neck', boneB: 'chest_upper', strength: 1.0 },
    { boneA: 'chest_upper', boneB: 'chest', strength: 1.0 },
    { boneA: 'chest', boneB: 'chest_lower', strength: 1.0 },
    { boneA: 'chest_lower', boneB: 'abdomen', strength: 1.0 },
    { boneA: 'abdomen', boneB: 'hip', strength: 1.0 },
    // Left arm
    { boneA: 'chest_upper', boneB: 'l_shoulder', strength: 1.0 },
    { boneA: 'l_shoulder', boneB: 'l_upper_arm', strength: 1.0 },
    { boneA: 'l_upper_arm', boneB: 'l_forearm', strength: 1.0 },
    { boneA: 'l_forearm', boneB: 'l_hand', strength: 1.0 },
    // Right arm
    { boneA: 'chest_upper', boneB: 'r_shoulder', strength: 1.0 },
    { boneA: 'r_shoulder', boneB: 'r_upper_arm', strength: 1.0 },
    { boneA: 'r_upper_arm', boneB: 'r_forearm', strength: 1.0 },
    { boneA: 'r_forearm', boneB: 'r_hand', strength: 1.0 },
    // Left leg
    { boneA: 'hip', boneB: 'l_thigh_upper', strength: 1.0 },
    { boneA: 'l_thigh_upper', boneB: 'l_thigh', strength: 1.0 },
    { boneA: 'l_thigh', boneB: 'l_knee', strength: 1.0 },
    { boneA: 'l_knee', boneB: 'l_shin', strength: 1.0 },
    { boneA: 'l_shin', boneB: 'l_foot', strength: 1.0 },
    // Right leg
    { boneA: 'hip', boneB: 'r_thigh_upper', strength: 1.0 },
    { boneA: 'r_thigh_upper', boneB: 'r_thigh', strength: 1.0 },
    { boneA: 'r_thigh', boneB: 'r_knee', strength: 1.0 },
    { boneA: 'r_knee', boneB: 'r_shin', strength: 1.0 },
    { boneA: 'r_shin', boneB: 'r_foot', strength: 1.0 },
  ],
};

export const ALL_PRESETS: Preset[] = [BIPED_PRESET, QUADRUPED_PRESET, SPHERE_PRESET, DOG_PRESET, WALKING_MAN_PRESET];
