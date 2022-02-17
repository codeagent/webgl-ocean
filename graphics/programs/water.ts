export const vs = `#version 300 es

layout(location = 0) in vec3 position;
layout(location = 1) in vec2 id;

uniform mat4 viewMat;
uniform mat4 projMat;
uniform sampler2D displacementMap;
uniform float delta;

out vec3 _position;
out vec2 _id;
out vec3 _normal;

vec3 getNormal(ivec2 uv) {
  vec3 center = texelFetch(displacementMap, uv, 0).xyz;
  vec3 top = vec3(0.0, 0.0, delta) + texelFetch(displacementMap, uv + ivec2(0, 1), 0).xyz - center;
  vec3 bottom = vec3(0.0, 0.0, -delta) + texelFetch(displacementMap, uv + ivec2(0, -1), 0).xyz - center;
  vec3 left = vec3(-delta, 0.0, 0.0) + texelFetch(displacementMap, uv + ivec2(-1, 0), 0).xyz - center;
  vec3 right = vec3(delta, 0.0, 0.0) + texelFetch(displacementMap, uv + ivec2(1, 0), 0).xyz - center;

  vec3 x0 = cross(top, left);
  vec3 x1 = cross(left, bottom);
  vec3 x2 = cross(bottom, right);
  vec3 x3 = cross(right, top);

  return normalize(x0 + x1 + x2 + x3 );
}

void main()
{
  ivec2 uv = ivec2(id.x, id.y);
  _position = position + texelFetch(displacementMap, uv, 0).xyz;
  _normal = getNormal(uv); 
  _id = id;
  gl_Position = projMat * viewMat * vec4(_position, 1.0f);
}
`;

export const fs = `#version 300 es
precision highp float;

layout( location = 0 ) out vec4 color;	

in vec3 _normal;
in vec3 _position;
in vec2 _id;


uniform vec3 pos;

void main()
{
  vec4 albedo = vec4(0, 0.62, 0.77, 1.0) ;
  vec3 n = normalize(_normal);
  vec3 l = normalize(pos - _position);
  float nol = dot(n, l) * 0.9 + 0.1;
  color = albedo * vec4(vec3(nol), 1.0f);

}
`;
