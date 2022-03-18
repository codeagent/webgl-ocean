export const vs = `#version 300 es
in vec4 position;
void main() {
  gl_Position = position;
}
`;

export const fs = `#version 300 es
precision highp float;

layout(location = 0) out vec3 displacement; 
layout(location = 1) out vec3 normal; 
layout(location = 2) out float foam; 

uniform float croppiness;
uniform float N2;
uniform sampler2D ifft0;  // dx_hy_dz_dxdz
uniform sampler2D ifft1;  // sx_sz_dxdx_dzdz


vec4 jacobian(float dxdx, float dxdz, float dzdz) {
  float Jxx = 1.0f + croppiness * dxdx;
  float Jxz = croppiness * dxdz;
  float Jzz = 1.0f + croppiness * dzdz;
  return vec4(Jxx, Jxz, Jxz, Jzz);
}

float det(vec4 jacobian) {
  return jacobian.x * jacobian.w - jacobian.y * jacobian.z;
}

const float sign[] = float[2](1.0f, -1.0f);

void main() {
  float p = float(int(gl_FragCoord.x) + int(gl_FragCoord.y));
  float s = sign[int(mod(p, 2.0f))];
  float m = s * N2;
  vec4 texel0 = texelFetch(ifft0, ivec2(gl_FragCoord.xy), 0).rgba * m;
  vec4 texel1 = texelFetch(ifft1, ivec2(gl_FragCoord.xy), 0).rgba * m;
  vec2 slope = vec2(texel1.x / (1.0f + croppiness * texel1.z), texel1.y / (1.0f + croppiness * texel1.w));

  displacement = texel0.xyz * vec3(croppiness, 1.0f, croppiness);
  normal = normalize(vec3(-slope.x, 1.0f, -slope.y));
  foam = pow(-min(0.0f, det(jacobian(texel1.z, texel0.w, texel1.w)) - 1.0f), 2.0);
}
`;
