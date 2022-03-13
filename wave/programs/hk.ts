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
  vec2 x = vec2(ivec2(gl_FragCoord.xy)) - float(resolution) * 0.5; //  [-N/2, N/2]
  vec2 k = vec2(2.0 * PI * x.x / size, 2.0 * PI * x.y / size);
  float kLen = length(k);
  if(kLen == 0.0f) {
    height = slope = displacement = ddisplacement = vec4(0.0f);
    return;
  }
  float w = sqrt(g * kLen);
  vec4 h0Texel = texelFetch(h0Texture, ivec2(gl_FragCoord.xy), 0).rgba;

  complex e = eix(w * t);
  complex h0 = complex(h0Texel.x, h0Texel.y);
  complex h0MinConj = complex(h0Texel.z, h0Texel.w);
  
  complex hy = add(mult(h0, e), mult(h0MinConj, conj(e)));
  complex dx = mult(complex(0.0f, -k.x / kLen), hy);
  complex dz = mult(complex(0.0f, -k.y / kLen), hy);
  complex sx = mult(complex(0.0f, k.x), hy);
  complex sz = mult(complex(0.0f, k.y), hy);
  complex dxdx = scale(hy, k.x * k.x / kLen);
  complex dzdz = scale(hy, k.y * k.y / kLen);
  complex dxdz = scale(hy, k.y * k.x / kLen);

  // if(
  //     uint(gl_FragCoord.x) == 0u || 
  //     uint(gl_FragCoord.x) == resolution - 1u || 
  //     uint(gl_FragCoord.y) == 0u || 
  //     uint(gl_FragCoord.y) == resolution - 1u
  //   ) 
  // {
  //   sx = complex(0.0f, 0.0f);
  //   sz = complex(0.0f, 0.0f);
  // }

  height = vec4(hy.re, hy.im, dxdz.re, dxdz.im);
  slope = vec4(sx.re, sx.im, sz.re, sz.im);
  displacement = vec4(dx.re, dx.im, dz.re, dz.im);
  ddisplacement = vec4(dxdx.re, dxdx.im, dzdz.re, dzdz.im);
}
`;
