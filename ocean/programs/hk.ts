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

layout(location = 0) out vec4 spectrum0;	
layout(location = 1) out vec4 spectrum1;	

uniform uint resolution;  // N
uniform float size;       // L
uniform float t;
uniform sampler2D h0Texture;

struct complex {
  float re;
  float im;
};

const complex i = complex(0.0f, 1.0f);

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
  vec2 x = vec2(ivec2(gl_FragCoord.xy)) - float(resolution) * 0.5; //  [-N/2, N/2)
  vec2 k = vec2(2.0 * PI * x.x / size, 2.0 * PI * x.y / size);
  float kLen = length(k);

  if(kLen == 0.0f) {
    spectrum0 = spectrum1 = vec4(0.0f);
    return;
  }

  float w = sqrt(g * kLen);
  vec4 h0Texel = texelFetch(h0Texture, ivec2(gl_FragCoord.xy), 0).rgba;

  complex e = eix(w * t);
  complex h0 = complex(h0Texel.x, h0Texel.y);
  complex h0MinConj = complex(h0Texel.z, h0Texel.w);
  complex hy = add(mult(h0, e), mult(h0MinConj, conj(e)));
  complex sx = complex(0.0f, 0.0f);
  complex sz = complex(0.0f, 0.0f);
  complex dx = complex(0.0f, 0.0f);
  complex dz = complex(0.0f, 0.0f);
  complex dxdx = complex(0.0f, 0.0f);
  complex dzdz = complex(0.0f, 0.0f);
  complex dxdz = complex(0.0f, 0.0f);

  if(int(gl_FragCoord.x) != 0) {
    sx = mult(complex(0.0f, k.x), hy);
    dx = mult(complex(0.0f, -k.x / kLen), hy);
    dxdx = scale(hy, k.x * k.x / kLen);
  }

  if(int(gl_FragCoord.y) != 0) {
    sz = mult(complex(0.0f, k.y), hy);
    dz = mult(complex(0.0f, -k.y / kLen), hy);
    dzdz = scale(hy, k.y * k.y / kLen);

    if(int(gl_FragCoord.x) != 0) {
      dxdz = scale(hy, k.y * k.x / kLen);
    }
  }

  complex dx_hy = add(dx, mult(i, hy));
  complex dz_dxdz = add(dz, mult(i, dxdz));
  complex sx_sz = add(sx, mult(i, sz));
  complex dxdx_dzdz = add(dxdx, mult(i, dzdz));

  spectrum0 = vec4(dx_hy.re, dx_hy.im, dz_dxdz.re, dz_dxdz.im);
  spectrum1 = vec4(sx_sz.re, sx_sz.im, dxdx_dzdz.re, dxdx_dzdz.im);
}
`;
