export const vs = `#version 300 es
layout(location = 0) in vec3 position;

void main() {
  gl_Position = vec4(position, 1.0f);
}
`;

export const fs = `#version 300 es
#define LAYERS 1
#define IS_HORIZONTAL 1

precision highp float;
precision highp sampler2DArray;

#if LAYERS >= 1
  layout(location = 0) out vec4 ifft0;
#endif

#if LAYERS >= 2
  layout(location = 1) out vec4 ifft1;
#endif

#if LAYERS >= 3
  layout(location = 2) out vec4 ifft2;
#endif

#if LAYERS >= 4
  layout(location = 3) out vec4 ifft3;
#endif

#if LAYERS >= 5
  layout(location = 4) out vec4 ifft4;
#endif

#if LAYERS >= 6
  layout(location = 5) out vec4 ifft5;
#endif

#if LAYERS >= 7
  layout(location = 6) out vec4 ifft6;
#endif

#if LAYERS >= 8
  layout(location = 7) out vec4 ifft7;
#endif

uniform sampler2DArray data;
uniform sampler2D butterfly;
uniform uint phase;

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

complex scale(complex a, float v) {
  return complex(a.re * v, a.im * v);
}

vec2 twiddleXY(in sampler2DArray source, in vec4 texelButt, int layer) {

#if IS_HORIZONTAL
  vec2 texelA = texelFetch(source, ivec3(texelButt.b, gl_FragCoord.y, layer), 0).xy;
  vec2 texelB = texelFetch(source, ivec3(texelButt.a, gl_FragCoord.y, layer), 0).xy;
#else
  vec2 texelA = texelFetch(source, ivec3(gl_FragCoord.x, texelButt.b, layer), 0).xy;
  vec2 texelB = texelFetch(source, ivec3(gl_FragCoord.x, texelButt.a, layer), 0).xy;
#endif

  complex a = complex(texelA.x, texelA.y);
  complex b = complex(texelB.x, texelB.y);
  complex w = complex(texelButt.r, texelButt.g);
  complex r = add(a, mult(b, w));

  return vec2(r.re, r.im);
}

vec2 twiddleZW(in sampler2DArray source, in vec4 texelButt, int layer) {

#if IS_HORIZONTAL
  vec2 texelA = texelFetch(source, ivec3(texelButt.b, gl_FragCoord.y, layer), 0).zw;
  vec2 texelB = texelFetch(source, ivec3(texelButt.a, gl_FragCoord.y, layer), 0).zw;
#else
  vec2 texelA = texelFetch(source, ivec3(gl_FragCoord.x, texelButt.b, layer), 0).zw;
  vec2 texelB = texelFetch(source, ivec3(gl_FragCoord.x, texelButt.a, layer), 0).zw;
#endif

  complex a = complex(texelA.x, texelA.y);
  complex b = complex(texelB.x, texelB.y);
  complex w = complex(texelButt.r, texelButt.g);
  complex r = add(a, mult(b, w));

  return vec2(r.re, r.im);
}

void main() {

#if IS_HORIZONTAL
  vec4 texelButt = texelFetch(butterfly, ivec2(phase,  gl_FragCoord.x), 0).rgba;
#else
  vec4 texelButt = texelFetch(butterfly, ivec2(phase,  gl_FragCoord.y), 0).rgba;
#endif

#if LAYERS >= 1
  ifft0 = vec4(twiddleXY(data, texelButt, 0), twiddleZW(data, texelButt, 0));
#endif

#if LAYERS >= 2
  ifft1 = vec4(twiddleXY(data, texelButt, 1), twiddleZW(data, texelButt, 1));
#endif

#if LAYERS >= 3
  ifft2 = vec4(twiddleXY(data, texelButt, 2), twiddleZW(data, texelButt, 2));
#endif

#if LAYERS >= 4
  ifft3 = vec4(twiddleXY(data, texelButt, 3), twiddleZW(data, texelButt, 3));
#endif

#if LAYERS >= 5
  ifft4 = vec4(twiddleXY(data, texelButt, 4), twiddleZW(data, texelButt, 4));
#endif

#if LAYERS >= 6
  ifft5 = vec4(twiddleXY(data, texelButt, 5), twiddleZW(data, texelButt, 5));
#endif

#if LAYERS >= 7
  ifft6 = vec4(twiddleXY(data, texelButt, 6), twiddleZW(data, texelButt, 6));
#endif

#if LAYERS >= 8
  ifft7 = vec4(twiddleXY(data, texelButt, 7), twiddleZW(data, texelButt, 7));
#endif

}
`;
