export const vs = `#version 300 es

layout(location = 0) in vec3 position;

uniform mat4 viewMat;
uniform mat4 projMat;

out vec3 _position;
out vec3 _normal;
// uniform sampler2D heightField;

void main()
{
  gl_Position = projMat * viewMat * vec4(position, 1.0f);
  _position = position.xyz;
  _normal = vec3(0.0, 1.0, 0.0);  // @todo:
}
`;

export const fs = `#version 300 es
precision highp float;

layout( location = 0 ) out vec4 color;	

in vec3 _normal;
in vec3 _position;


// uniform sampler2D heightField;
uniform vec3 pos;

void main()
{
  vec4 albedo = vec4(1.0, 0.0, 0.0, 1.0);
  vec3 n = normalize(_normal);
  vec3 l = normalize(pos - _position);
  float nol = dot(n, l) * 0.7 + 0.3;
  color = albedo * vec4(vec3(nol), 1.0f);
  color = vec4(_position.x / 100.0f, _position.y / 100.0f, _position.z / 100.0f, 1.0f);
}
`;
