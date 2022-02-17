export const vs = `#version 300 es
in vec4 position;
void main() {
  gl_Position = position;
}
`;

export const fs = `#version 300 es
precision highp float;

out vec4 outColor; 

uniform sampler2D source;
uniform sampler2D butterfly;
uniform uint phase;
uniform uint phases;
uniform uint N2;

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

void main() {
  vec4 texelButt = texelFetch(butterfly, ivec2(phase,  gl_FragCoord.y), 0).rgba;
  vec4 texelA = texelFetch(source, ivec2(gl_FragCoord.x, texelButt.b), 0).xyzw;
  vec4 texelB = texelFetch(source, ivec2(gl_FragCoord.x, texelButt.a), 0).xyzw;

  {
    complex a = complex(texelA.x, texelA.y);
    complex b = complex(texelB.x, texelB.y);
    complex w = complex(texelButt.r, texelButt.g);

    complex result = add(a, mult(b, w));

    if(phase == phases - 1u) {
      float sign[] = float[2](1.0f, -1.0f);
      float p = float(int(gl_FragCoord.x) + int(gl_FragCoord.y));
      result = scale(result, sign[int(mod(p, 2.0f))] / float(N2));
    } 

    outColor.x = result.re;
    outColor.y = result.im;
  }

  {
    complex a = complex(texelA.z, texelA.w);
    complex b = complex(texelB.z, texelB.w);
    complex w = complex(texelButt.r, texelButt.g);

    complex result = add(a, mult(b, w));

    if(phase == phases - 1u) {
      float sign[] = float[2](1.0f, -1.0f);
      float p = float(int(gl_FragCoord.x) + int(gl_FragCoord.y));
      result = scale(result, sign[int(mod(p, 2.0f))] / float(N2));
    } 

    outColor.z = result.re;
    outColor.w = result.im;
  }

}
`;
