export const vs = `#version 300 es
in vec3 position;

void main() {
  gl_Position = vec4(position, 1.0f);
}
`;

export const fs = `#version 300 es
#define CASCADES 1

precision highp float;
precision highp sampler2DArray;

layout(location = 0) out vec4 turbulence; 
layout(location = 1) out vec4 sss; 

uniform sampler2DArray data;
uniform sampler2D prevTurbulence;
uniform sampler2D prevSSS;

layout(std140) uniform Ocean {
  float steepness[4];
  float foamFalloff[4];
  float foamOffset[4];
}; 

layout(std140) uniform Spectrum {
  float size[4];  // up to 4 cascades
  uint resolution;
}; 

// Gaussian kernel
const mat3 gauss0 = mat3(
  0.00163118f, 0.0371255f, 0.00163118f, 
  0.0371255f, 0.844973f, 0.0371255f, 
  0.00163118f, 0.0371255f, 0.00163118f
);

const mat3 gauss1 = mat3(
  0.043, 0.133, 0.043,
  0.133, 0.291, 0.133,
  0.043, 0.133, 0.043
);

vec4 fadeOut(vec4 value) {
  return value * (vec4(1.0f) - vec4(foamFalloff[0], foamFalloff[1], foamFalloff[2], foamFalloff[3]));
}

vec4 blur(in ivec2 uv, in sampler2D texture, in mat3 kernel) {
  vec4 acc = vec4(0.0f);

  for(int i = 0; i <= 2; i += 1) {
    for(int j = 0; j <= 2; j += 1) {
      acc += kernel[j][i] * texelFetch(texture, (uv + ivec2(j - 1, i - 1)) % ivec2(resolution), 0).rgba;
    }
  }

  return acc;
}

float getJacobian(in ivec2 uv, int cascade) {
  vec2 dxdx_dzdz = texelFetch(data, ivec3(uv % ivec2(resolution), cascade * 2 + 1), 0).zw * steepness[cascade] ;
  float dxdz = texelFetch(data, ivec3(uv % ivec2(resolution), cascade * 2), 0).w * steepness[cascade] ;

  return (1.0f + dxdx_dzdz.x) * (1.0f + dxdx_dzdz.y) - dxdz * dxdz;
}

float getTurbulence(in ivec2 uv, int cascade) {
  float jacobian = getJacobian(uv, cascade);

  return max(0.0f, 1.0f - jacobian + foamOffset[cascade]);
}

void main() {
  ivec2 uv = ivec2(gl_FragCoord.xy) + ivec2(resolution);
  
  turbulence.r = getTurbulence(uv, 0);
  sss.r = max(0.0f, 1.0f - getJacobian(uv, 0) - 0.34625f);

#if CASCADES >= 2
  turbulence.g = getTurbulence(uv, 1);
  sss.g = max(0.0f, 1.0f - getJacobian(uv, 1) - 0.225f);
#endif 

#if CASCADES >= 3
  turbulence.b = getTurbulence(uv, 2);
  sss.b = max(0.0f, 1.0f - getJacobian(uv, 2) - 0.225f);
#endif 

#if CASCADES >= 4
  turbulence.a = getTurbulence(uv, 3);
  sss.a = max(0.0f, 1.0f - getJacobian(uv, 3) - 0.225f);
#endif 

  turbulence = min(vec4(1.0f), turbulence + fadeOut(blur(uv, prevTurbulence, gauss0)));
  sss = min(vec4(1.0f), sss + blur(uv, prevSSS, gauss1) * (0.85));
}
`;
