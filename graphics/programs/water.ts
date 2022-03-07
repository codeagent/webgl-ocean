export const vs = `#version 300 es

layout(location = 0) in vec3 position;
layout(location = 1) in vec2 uv;

uniform mat4 viewMat;
uniform mat4 worldMat;
uniform mat4 projMat;
uniform sampler2D displacementMap;

out vec3 _position;
out vec2 _uv;


void main()
{
  _position = position + texture(displacementMap, uv).xyz;
  _position = vec3(worldMat * vec4(_position, 1.0f));
  _uv = uv;
  gl_Position = projMat * viewMat * vec4(_position, 1.0f);
}
`;

export const fs = `#version 300 es
precision highp float;

layout(location = 0) out vec4 color;	

in vec3 _position;
in vec2 _uv;

uniform sampler2D normalMap;
uniform sampler2D foamMap;
uniform vec3 pos;

void main()
{
  vec4 foam = vec4(1.0f) * texture(foamMap, _uv).r;
  vec4 albedo = vec4(0, 0.62, 0.77, 1.0);
  vec3 n = texture(normalMap, _uv).xyz;
  vec3 l = normalize(pos - _position);
  float nol = dot(n, l) * 0.9 + 0.1;
  color = albedo * vec4(vec3(nol), 1.0f) + foam;
  
  if(!gl_FrontFacing) {
    color = vec4(1.0f);
  }
  
}
`;
