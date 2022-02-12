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

void main() {
  outColor = vec2(0.3f, 0.6f);
}
`;
