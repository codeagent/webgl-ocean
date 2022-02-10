export const vs = `#version 300 es
in vec4 position;
void main() {
  gl_Position = position;
}
`;

export const fs = `#version 300 es
precision highp float;

out vec4 outColor; 

uniform sampler2D noise;
uniform uint subdivisions;
uniform float size;
uniform float A;

void main() {
  // ivec2 uv = ivec2(gl_FragCoord.xy);
  outColor =  vec4(1.0, -1.0, -1.0, -0.5);
}
`;
