export const vs = `#version 300 es
layout(location = 0) in vec3 position;
layout(location = 1) in vec2 uv;

out vec2 _uv;

void main() {
  _uv = uv;
  gl_Position = vec4(position, 1.0f);
}
`;

export const fs = `#version 300 es
precision highp float;
precision highp sampler2DArray;

layout(location = 0) out vec4 color; 

in vec2 _uv;

uniform sampler2DArray _texture;
// uniform sampler2D _texture;

void main() {
  // float r = texture(_texture, vec3(_uv, 0.0f)).w;
  // float g = texture(_texture, vec3(_uv, 1.0f)).w;
  // float b = texture(_texture, vec3(_uv, 2.0f)).w;
  // float a = texture(_texture, vec3(_uv, 3.0f)).w;
  // a = 1.0f;

  color = vec4(texture(_texture, vec3(_uv, 0.0f)).rgb, 1.0f);
  // color = vec4(r,g,b,a);
}
`;
