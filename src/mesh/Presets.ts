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

export const ALL_PRESETS: Preset[] = [BIPED_PRESET, QUADRUPED_PRESET, SPHERE_PRESET];
