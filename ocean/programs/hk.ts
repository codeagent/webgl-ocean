export const vs = `#version 300 es
in vec4 position;
void main() {
  gl_Position = position;
}
`;

export const fs = `#version 300 es
#define PI 3.141592653f
#define g 9.81f

precision highp float;

out vec2 outColor; 

uniform uint subdivisions;  // N
uniform float size;         // L
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

void main() {
  vec2 x = vec2(gl_FragCoord.xy) - float(subdivisions) * 0.5; //  [-N/2, N/2]
  vec2 k = vec2(2.0 * PI * x.x / size, 2.0 * PI * x.y / size);
  float w = sqrt(g * length(k));
  vec4 h0Texel = texelFetch(h0Texture, ivec2(gl_FragCoord.xy), 0).rgba;

  complex e = eix(w * t);
  complex h0 = complex(h0Texel.x, h0Texel.y);
  complex h0Min = complex(h0Texel.z, h0Texel.w);
  
  complex hk = add(mult(h0, e), mult(conj(h0Min), conj(e)));

  outColor =  vec2(hk.re, hk.im);
}
`;
