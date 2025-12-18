export const vs = `#version 300 es
layout(location = 0) in vec3 position;

uniform mat4 viewMat;
uniform mat4 projMat;

out vec3 _pos;

void main()
{
  _pos = normalize(position);
  gl_Position = (projMat * viewMat * vec4(position, 0.0f)).xyww;
}
`;

export const fs = `#version 300 es
precision highp float;

layout( location = 0 ) out vec4 color;	

in vec3 _pos;

uniform samplerCube env;

void main()
{
  vec3 background = textureLod(env, normalize(_pos), 0.0f).rgb;
  color = vec4(background, 1.0f);
}
`;
