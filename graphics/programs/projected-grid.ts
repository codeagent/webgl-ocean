export const vs = `#version 300 es

layout(location = 0) in vec3 position;

uniform mat4 invViewProjMat;
uniform mat4 viewMat;
uniform mat4 projMat;
uniform vec3 pos;

out highp vec2 _xz;

void main()
{
   vec4 homogeneous = invViewProjMat * vec4(position, 1.0f);
   vec3 world = homogeneous.xyz / homogeneous.w;
   vec3 ray = world - pos;

  if(ray.y >= 0.0f) {  // beyond horizon
    gl_Position = vec4(position.x, position.y, 2.0f, 1.0f);
  } else {
    world = ray * -pos.y / ray.y + pos;
    _xz = world.xz;
    gl_Position = projMat * viewMat * vec4(world, 1.0f);
  }
}
`;

export const fs = `#version 300 es
precision highp float;

layout(location = 0) out vec4 color;	

in highp vec2 _xz;

void main()
{
  color = vec4(_xz.x, 0.25f, _xz.y, 1.0);
}
`;
