// B-Mesh 본 영역 색상 프래그먼트 셰이더
varying vec4 vBoneColor;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  // 간단한 램버트 라이팅
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(vec3(0.5, 0.8, 0.5));
  float diffuse = max(dot(normal, lightDir), 0.0);
  float ambient = 0.3;

  vec3 color = vBoneColor.rgb * (ambient + diffuse * 0.7);
  gl_FragColor = vec4(color, vBoneColor.a);
}
