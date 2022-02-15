export const vs = `#version 300 es

layout(location = 0) in vec3 position;
layout(location = 1) in vec2 id;

uniform mat4 viewMat;
uniform mat4 projMat;
uniform sampler2D heightField;

out vec3 _position;
out vec2 _id;
out vec3 _normal;

void main()
{
  _id = id;
  vec2 height = texelFetch(heightField, ivec2(_id.x, _id.y), 0).xy;
  _position = position.xyz + vec3(0.0, height.x, 0.0);
  _normal = vec3(0.0, 1.0, 0.0);  // @todo:
  gl_Position = projMat * viewMat * vec4(_position, 1.0f);
}
`;

export const fs = `#version 300 es
precision highp float;

layout( location = 0 ) out vec4 color;	

in vec3 _normal;
in vec3 _position;
in vec2 _id;


uniform sampler2D heightField;
uniform vec3 pos;

void main()
{
  vec2 height = texelFetch(heightField, ivec2(_id.x, _id.y), 0).xy;
  vec4 albedo = vec4(1.0, 0.0, 0.0, 1.0) ;
  vec3 n = normalize(_normal);
  vec3 l = normalize(pos - _position);
  float nol = dot(n, l) * 0.7 + 0.3;
  color = albedo * vec4(vec3(nol), 1.0f);
}
`;
