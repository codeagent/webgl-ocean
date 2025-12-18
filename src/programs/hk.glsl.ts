export const vs = `#version 300 es
layout(location = 0) in vec3 position;
void main() {
  gl_Position = vec4(position, 1.0f);
}
`;

export const fs = `#version 300 es
#define PI 3.141592653f
#define PI2 6.2831853071f
#define g 9.81f
#define CASCADES 1

precision highp float;
precision highp sampler2DArray;

#if CASCADES >= 1
  layout(location = 0) out vec4 data0;
  layout(location = 1) out vec4 data1;
#endif

#if CASCADES >= 2
  layout(location = 2) out vec4 data2;
  layout(location = 3) out vec4 data3;
#endif

#if CASCADES >= 3
  layout(location = 4) out vec4 data4;
  layout(location = 5) out vec4 data5;
#endif

#if CASCADES >= 4
  layout(location = 6) out vec4 data6;
  layout(location = 7) out vec4 data7;
#endif

layout(std140) uniform Spectrum {
  float size[4];
  uint resolution;
};      

uniform float t;
uniform sampler2DArray h0Textures;

// --
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

// --
struct spectrum {
  complex dx;
  complex hy;
  complex dz;
  complex sx;
  complex sz;
  complex dxdx;
  complex dxdz;
  complex dzdz;
};

spectrum getSpectrum(in sampler2DArray h0Texture, int layer, in vec2 x, float size) {
  complex hy = complex(0.0f, 0.0f);
  complex sx = complex(0.0f, 0.0f);
  complex sz = complex(0.0f, 0.0f);
  complex dx = complex(0.0f, 0.0f);
  complex dz = complex(0.0f, 0.0f);
  complex dxdx = complex(0.0f, 0.0f);
  complex dzdz = complex(0.0f, 0.0f);
  complex dxdz = complex(0.0f, 0.0f);

  if(size <= 1.0e-3) {
    return spectrum(dx, hy, dz, sx, sz, dxdx, dxdz, dzdz); 
  }

  vec2 k = vec2(PI2 / size) * x;
  float kLen = length(k);

  if(kLen > 1.0e-6f) {
    float w = sqrt(g * kLen);
    complex e = eix(w * t);
    
    vec4 h0Texel = texelFetch(h0Texture, ivec3(gl_FragCoord.xy, layer), 0).rgba;
    complex h0 = complex(h0Texel.x, h0Texel.y);
    complex h0Conj = complex(h0Texel.z, h0Texel.w);
    hy = add(mult(h0, conj(e)), mult(h0Conj, e));

    sx = mult(complex(0.0f, k.x), hy);
    dx = mult(complex(0.0f, -k.x / kLen), hy);
    dxdx = scale(hy, k.x * k.x / kLen);
    
    sz = mult(complex(0.0f, k.y), hy);
    dz = mult(complex(0.0f, -k.y / kLen), hy);
    dzdz = scale(hy, k.y * k.y / kLen);

    dxdz = scale(hy, k.y * k.x / kLen);    
  }

  return spectrum(dx, hy, dz, sx, sz, dxdx, dxdz, dzdz);
}

// uses the Hermitian property of the spectrum to compress
void compressSpectrum(in spectrum spec, out vec4 part0, out vec4 part1) {
  complex dx_hy = add(spec.dx, mult(i, spec.hy));
  complex dz_dxdz = add(spec.dz, mult(i, spec.dxdz));
  complex sx_sz = add(spec.sx, mult(i, spec.sz));
  complex dxdx_dzdz = add(spec.dxdx, mult(i, spec.dzdz));

  part0 = vec4(dx_hy.re, dx_hy.im, dz_dxdz.re, dz_dxdz.im);
  part1 = vec4(sx_sz.re, sx_sz.im, dxdx_dzdz.re, dxdx_dzdz.im);
}

void main() {
  vec2 x = vec2(ivec2(gl_FragCoord.xy) - ivec2(resolution / 2u)); //  [-N/2, N/2)

#if CASCADES >= 1
  spectrum spec = getSpectrum(h0Textures, 0, x, size[0]);
  compressSpectrum(spec, data0, data1);
#endif

#if CASCADES >= 2
  spec = getSpectrum(h0Textures, 1, x, size[1]);
  compressSpectrum(spec, data2, data3);
#endif

#if CASCADES >= 3
  spec = getSpectrum(h0Textures, 2, x, size[2]);
  compressSpectrum(spec, data4, data5);
#endif

#if CASCADES >= 4
  spec = getSpectrum(h0Textures, 3, x, size[3]);
  compressSpectrum(spec, data6, data7);
#endif
}
`;
