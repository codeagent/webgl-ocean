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
uniform sampler2D ifft0; // height & dx/dz
uniform sampler2D ifft1; // slope
uniform sampler2D ifft2; // displacement
uniform sampler2D ifft3; // ddisplacement

vec4 jacobian(float dxdx, float dxdz, float dzdz) {
  float Jxx = 1.0f + croppiness * dxdx;
  float Jxz = croppiness * dxdz;
  float Jzz = 1.0f + croppiness * dzdz;
  return vec4(Jxx, Jxz, Jxz, Jzz);
}

float det(vec4 jacobian) {
  return jacobian.x * jacobian.w - jacobian.y * jacobian.z;
}

vec2 eigenvalues(vec4 jacobian) {
  float a = 0.5f * (jacobian.x + jacobian.w);
  float b = (jacobian.x - jacobian.w);
  float c = 0.5f * sqrt(b * b + 4.0f * jacobian.y * jacobian.y);
  return vec2(a - c, a + c);
}

vec4 eigenvectors(vec2 eigenvalues, vec4 jacobian) {
  float q0 = (eigenvalues.x - jacobian.x) / jacobian.y;
  float q1 = (eigenvalues.y - jacobian.x) / jacobian.y;
  vec2 e0 = vec2(1.0f, q0) / sqrt(1.0f + q0 * q0);
  vec2 e1 = vec2(1.0f, q1) / sqrt(1.0f + q1 * q1);
  return vec4(e0, e1);
}

vec3 correctDisplacement(in vec3 displacement, vec4 jacobian) {
  vec2 eq = eigenvalues(jacobian);
  vec4 ev = eigenvectors(eq, jacobian);
  
  if(eq.x <= 0.0f && eq.y > 0.0f) {
    return displacement - vec3(ev.x * (eq.x * eq.y), 0, ev.y * eq.x * eq.y);
  } 
  return displacement;
}

const float sign[] = float[2](1.0f, -1.0f);

void main() {
  float p = float(int(gl_FragCoord.x) + int(gl_FragCoord.y));
  float s = sign[int(mod(p, 2.0f))];

  vec2 heightDxDz = texelFetch(ifft0, ivec2(gl_FragCoord.xy), 0).rb * s;
  float height = heightDxDz.x;
  float dxdz = heightDxDz.y;
  vec2 deriv = texelFetch(ifft1, ivec2(gl_FragCoord.xy), 0).rb * s;
  vec2 disp = texelFetch(ifft2, ivec2(gl_FragCoord.xy), 0).rb * s;
  vec2 ddisp = texelFetch(ifft3, ivec2(gl_FragCoord.xy), 0).rb * s;

  vec4 jac = jacobian(ddisp.x, dxdz, ddisp.y);
  displacement = correctDisplacement(vec3(disp.x * croppiness, height, disp.y * croppiness), jac);
  
  vec2 slope = vec2(deriv.x / (1.0f + croppiness * ddisp.x), deriv.y / (1.0f + croppiness * ddisp.y));
  normal = normalize(vec3(-slope.x, 1.0f, -slope.y));
  foam = pow(-min(0.0f, det(jac) - 1.0f), 2.0);
  // vec2 e = eigenvalues(jac);
  // foam = abs(det(jac) - e.x * e.y) < 1.0e-4 ? 0.0f : 10.0f;
}
`;
