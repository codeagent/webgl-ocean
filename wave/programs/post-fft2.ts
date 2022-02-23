export const vs = `#version 300 es
in vec4 position;
void main() {
  gl_Position = position;
}
`;

export const fs = `#version 300 es
precision highp float;

layout(location = 0) out vec4 displacement; 
layout(location = 1) out vec3 normal; 
layout(location = 2) out float foam; 

uniform float croppiness;
uniform sampler2D ifft0; // height & dx/dz
uniform sampler2D ifft1; // slope
uniform sampler2D ifft2; // displacement
uniform sampler2D ifft3; // ddisplacement

const float sign[] = float[2](1.0f, -1.0f);

vec4 getJacobian(float dxdx, float dxdz, float dzdz) {
  float Jxx = 1.0f + croppiness * dxdx;
  float Jxz = croppiness * dxdz;
  float Jzz = 1.0f + croppiness * dzdz;

  return vec4(Jxx, Jxz, Jxz, Jzz);
}

float det(vec4 jacobian) {
  return jacobian.x * jacobian.w - jacobian.y * jacobian.z;
}

void main() {
  float p = float(int(gl_FragCoord.x) + int(gl_FragCoord.y));
  float s = sign[int(mod(p, 2.0f))];

  vec2 heightDxDz = texelFetch(ifft0, ivec2(gl_FragCoord.xy), 0).rb * s;
  float height = heightDxDz.x;
  float dxdz = heightDxDz.y;
  vec2 deriv = texelFetch(ifft1, ivec2(gl_FragCoord.xy), 0).rb * s;
  vec2 disp = texelFetch(ifft2, ivec2(gl_FragCoord.xy), 0).rb * s;
  vec2 ddisp = texelFetch(ifft3, ivec2(gl_FragCoord.xy), 0).rb * s;

  displacement = vec4(disp.x * croppiness, height, disp.y * croppiness, 0.0f);

  vec2 slope = vec2(deriv.x / (1.0f + croppiness * ddisp.x), deriv.y / (1.0f + croppiness * ddisp.y));
  normal = normalize(vec3(-slope.x, 1.0f, -slope.y));
  foam = pow(-min(0.0f, det(getJacobian(ddisp.x, dxdz, ddisp.y)) - 1.0f), 2.0);
}
`;
