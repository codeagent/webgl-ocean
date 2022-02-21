export const vs = `#version 300 es
in vec4 position;
void main() {
  gl_Position = position;
}
`;

export const fs = `#version 300 es
precision highp float;

out vec4 outColor; 

uniform sampler2D iff2;

const float sign[] = float[2](1.0f, -1.0f);

void main() {
  float p = float(int(gl_FragCoord.x) + int(gl_FragCoord.y));
  float s = sign[int(mod(p, 2.0f))];
  outColor = texelFetch(iff2, ivec2(gl_FragCoord.xy), 0).rgba * s;
}
`;
