export const vs = `#version 300 es
layout(location = 0) in vec4 position;
void main() {
  gl_Position = position;
}
`;

export const fs = `#version 300 es
#define PI 3.141592653f
#define g 9.81f

precision highp float;

layout(location = 0) out vec4 height;	
layout(location = 1) out vec4 slope;	
layout(location = 2) out vec4 displacement;	
layout(location = 3) out vec4 ddisplacement; 

uniform uint resolution;  // N
uniform float size;       // L
uniform float t;
uniform sampler2D h0Texture;

struct complex {
  float re;
  float im;
};

complex add(complex a, complex b) {
  return complex(a.re + b.re, a.im + b.im);
}

complex mult(complex a, complex b) {
  return complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
}

complex eix(float x) {
  return complex(cos(x), sin(x));
}

complex conj(complex a) {
  return complex(a.re, -a.im);
}

complex scale(complex v, float s) {
  return complex(v.re * s, v.im * s);
}

complex negate(complex v) {
  return complex(-v.re, -v.im);
}

void main() {
  vec2 x = vec2(gl_FragCoord.xy) - float(resolution) * 0.5; //  [-N/2, N/2]
  vec2 k = vec2(2.0 * PI * x.x / size, 2.0 * PI * x.y / size);
  float kLen = length(k);
  float w = sqrt(g * kLen);
  vec4 h0Texel = texelFetch(h0Texture, ivec2(gl_FragCoord.xy), 0).rgba;

  complex e = eix(-w * t);
  complex h0 = complex(h0Texel.x, h0Texel.y);
  complex h0Min = complex(h0Texel.z, h0Texel.w);
  
  complex hy = add(mult(h0, e), mult(conj(h0Min), conj(e)));
  complex dx = mult(complex(0.0f, -k.x / kLen), hy);
  complex dz = mult(complex(0.0f, -k.y / kLen), hy);
  complex sx = mult(complex(0.0f, k.x), hy);
  complex sz = mult(complex(0.0f, k.y), hy);
  complex dxdx = scale(hy, k.x * k.x / kLen);
  complex dzdz = scale(hy, k.y * k.y / kLen);
  complex dxdz = scale(hy, k.y * k.x / kLen);


  height = vec4(hy.re, hy.im, 0.0, 0.0);
  slope = vec4(sx.re, sx.im, sz.re, sz.im);
  displacement = vec4(dx.re, dx.im, dz.re, dz.im);
  ddisplacement = vec4(dxdx.re, dxdx.im, dzdz.re, dzdz.im);
}
`;
