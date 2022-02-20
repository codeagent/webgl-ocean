export const vs = `#version 300 es
layout(location = 0) in  vec4 position;
layout(location = 1) in vec2 uv;

out vec2 _uv;

void main() {
  _uv = uv;
  gl_Position = vec4(position.x, position.y, 0.0, 1.0);
}
`;

export const fs = `#version 300 es
precision highp float;

out vec4 outColor; 

in vec2 _uv;

uniform sampler2D texImage;
uniform uint texType;

const uint NOISE = 0u;
const uint BUTTERFLY = 1u;
const uint H0 = 2u;
const uint HK = 3u;
const uint DDX = 4u;
const uint DDZ = 5u;
const uint DISP_X = 6u;
const uint DISP_Z = 7u;
const uint DDISP_XDX = 8u;
const uint DDISP_ZDZ = 9u;
const uint NORMALS = 10u;

void main() {
  if(texType == BUTTERFLY) {
    outColor = texture(texImage, _uv).rgba;
  } else {
    outColor = texture(texImage, _uv).rgba;
  }
  
}
`;
