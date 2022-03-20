export const vs = `#version 300 es
in vec4 position;
void main() {
  gl_Position = position;
}
`;

export const fs = `#version 300 es
precision highp float;

layout(location = 0) out vec4 displacementFoam0;
layout(location = 1) out vec4 displacementFoam1;
layout(location = 2) out vec4 displacementFoam2;
layout(location = 3) out vec3 normal0; 
layout(location = 4) out vec3 normal1; 
layout(location = 5) out vec3 normal2; 

uniform float croppiness;
uniform float N2;
uniform sampler2D ifft0;  // dx_hy_dz_dxdz
uniform sampler2D ifft1;  // sx_sz_dxdx_dzdz
uniform sampler2D ifft2;  // dx_hy_dz_dxdz
uniform sampler2D ifft3;  // sx_sz_dxdx_dzdz
uniform sampler2D ifft4;  // dx_hy_dz_dxdz
uniform sampler2D ifft5;  // sx_sz_dxdx_dzdz

vec4 jacobian(float dxdx, float dxdz, float dzdz) {
  float Jxx = 1.0f + croppiness * dxdx;
  float Jxz = croppiness * dxdz;
  float Jzz = 1.0f + croppiness * dzdz;
  return vec4(Jxx, Jxz, Jxz, Jzz);
}

float det(vec4 jacobian) {
  return jacobian.x * jacobian.w - jacobian.y * jacobian.z;
}

struct outcome {
  vec3 displacement;
  vec3 normal;
  float foam;
};

outcome getOceanOutcome(in sampler2D ifft0, in sampler2D ifft1, float multiplier)  {
  vec4 texel0 = texelFetch(ifft0, ivec2(gl_FragCoord.xy), 0).rgba * multiplier;
  vec4 texel1 = texelFetch(ifft1, ivec2(gl_FragCoord.xy), 0).rgba * multiplier;
  vec2 slope = vec2(texel1.x / (1.0f + croppiness * texel1.z), texel1.y / (1.0f + croppiness * texel1.w));

  vec3 displacement = texel0.xyz * vec3(croppiness, 1.0f, croppiness);
  vec3 normal = normalize(vec3(-slope.x, 1.0f, -slope.y));
  float foam = pow(-min(0.0f, det(jacobian(texel1.z, texel0.w, texel1.w)) - 1.0f), 2.0);

  return outcome(displacement, normal, foam);
}

void main() {
  const float sign[] = float[2](1.0f, -1.0f);
  float p = float(int(gl_FragCoord.x) + int(gl_FragCoord.y));
  float s = sign[int(mod(p, 2.0f))];
  float m = s * N2;
  
  outcome outcome0 = getOceanOutcome(ifft0, ifft1, m);
  outcome outcome1 = getOceanOutcome(ifft2, ifft3, m);
  outcome outcome2 = getOceanOutcome(ifft4, ifft5, m);

  displacementFoam0 = vec4(outcome0.displacement, outcome0.foam);
  normal0 = outcome0.normal;

  displacementFoam1 = vec4(outcome1.displacement, outcome1.foam);
  normal1 = outcome1.normal;

  displacementFoam2 = vec4(outcome2.displacement, outcome2.foam);
  normal2 = outcome2.normal;
}
`;
