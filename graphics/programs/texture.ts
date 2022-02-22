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
const uint H0_STAR = 3u;
const uint HK = 4u;
const uint DDX = 5u;
const uint DDZ = 6u;
const uint DX = 7u;
const uint DZ = 8u;
const uint DDISP_XDX = 9u;
const uint DDISP_ZDZ = 10u;
const uint NORMALS = 11u;

void main() {
  if(texType == H0) {
    outColor = vec4(texture(texImage, _uv).rg, 0.0, 1.0);
  } else if(texType == H0_STAR) {
    outColor = vec4(texture(texImage, _uv).ba, 0.0, 1.0);
  } else if(texType == DX) {
    outColor = vec4(vec3(texture(texImage, _uv).x), 1.0);
  } else if(texType == DZ) {
    outColor = vec4(vec3(texture(texImage, _uv).z), 1.0);
  } else if(texType == NORMALS) {
    outColor = vec4(texture(texImage, _uv).xyz * 0.5f + 0.5f, 1.0);
  } else  {

    outColor = texture(texImage, _uv).rgba;
  }
  
}
`;
