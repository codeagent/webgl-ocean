export const vs = `#version 300 es
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 color;

uniform mat4 viewMat;
uniform mat4 projMat;

out vec3 _color;

void main()
{
  gl_Position = projMat * viewMat * vec4(position + vec3(0.0f, 1.0f, 0.0f), 1.0f);
  _color = color;
}
`;

export const fs = `#version 300 es
precision highp float;

layout( location = 0 ) out vec4 color;	

uniform vec4 albedo;

in vec3 _color;

void main()
{
  color =  vec4(albedo.rgb + _color, albedo.a);
}

`;
