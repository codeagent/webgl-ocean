export const vs = `#version 300 es
in vec4 position;
void main() {
  gl_Position = position;
}
`;

export const fs = `#version 300 es
precision highp float;

out vec2 outColor; 

uniform sampler2D source;
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

void main() {
  vec4 texelButt = texelFetch(butterfly, ivec2(phase,  gl_FragCoord.y), 0).rgba;
  vec2 texelA = texelFetch(source, ivec2(gl_FragCoord.x, texelButt.b), 0).xy;
  vec2 texelB = texelFetch(source, ivec2(gl_FragCoord.x, texelButt.a), 0).xy;

  complex a = complex(texelA.x, texelA.y);
  complex b = complex(texelB.x, texelB.y);
  complex w = complex(texelButt.r, texelButt.g);

  complex result = add(a, mult(b, w));

  outColor = vec2(result.re, result.im);
}
`;
