// B-Mesh 본 영역 색상 버텍스 셰이더
attribute vec4 boneColor;
varying vec4 vBoneColor;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vBoneColor = boneColor;
  vNormal = normalize(normalMatrix * normal);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
