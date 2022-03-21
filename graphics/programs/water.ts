export const vs = `#version 300 es

layout(location = 0) in vec3 position;
layout(location = 1) in vec2 uv;

uniform mat4 viewMat;
uniform mat4 worldMat;
uniform mat4 projMat;

uniform float croppiness;
uniform sampler2D dx_hy_dz_dxdz0;
uniform sampler2D sx_sz_dxdx_dzdz0;
uniform sampler2D dx_hy_dz_dxdz1;
uniform sampler2D sx_sz_dxdx_dzdz1;
uniform sampler2D dx_hy_dz_dxdz2;
uniform sampler2D sx_sz_dxdx_dzdz2;

out vec3 _position;
out vec2 _uv;

vec3 getDisplacement(in vec2 uv) {
  return position + texture(dx_hy_dz_dxdz0, uv).xyz * vec3(croppiness, 1.0f, croppiness);
}

void main()
{
  _position = position + getDisplacement(uv);
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

uniform float croppiness;
uniform sampler2D dx_hy_dz_dxdz0;
uniform sampler2D sx_sz_dxdx_dzdz0;
uniform sampler2D dx_hy_dz_dxdz1;
uniform sampler2D sx_sz_dxdx_dzdz1;
uniform sampler2D dx_hy_dz_dxdz2;
uniform sampler2D sx_sz_dxdx_dzdz2;
uniform vec3 pos;

vec4 jacobian(float dxdx, float dxdz, float dzdz) {
  float Jxx = 1.0f + croppiness * dxdx;
  float Jxz = croppiness * dxdz;
  float Jzz = 1.0f + croppiness * dzdz;
  return vec4(Jxx, Jxz, Jxz, Jzz);
}

float det(vec4 jacobian) {
  return jacobian.x * jacobian.w - jacobian.y * jacobian.z;
}

vec3 getNormal(in vec2 uv) {
  vec4 texel = texture(sx_sz_dxdx_dzdz0, uv).xyzw;
  vec2 slope = vec2(texel.x / (1.0f + croppiness * texel.z), texel.y / (1.0f + croppiness * texel.w));
  return normalize(vec3(-slope.x, 1.0f, -slope.y));
}

float getFoam(in vec2 uv) {
  vec4 texel0 = texture(dx_hy_dz_dxdz0, uv).xyzw;
  vec4 texel1 = texture(sx_sz_dxdx_dzdz0, uv).xyzw;
  return pow(-min(0.0f, det(jacobian(texel1.z, texel0.w, texel1.w)) - 1.0f), 2.0);
}

void main()
{
  vec4 albedo = vec4(0, 0.62, 0.77, 1.0);
  vec3 n = getNormal(_uv);
  vec3 l = normalize(pos - _position);
  float nol = dot(n, l) * 0.9 + 0.1;
  color = albedo * vec4(vec3(nol), 1.0f) + getFoam(_uv);
  
  if(!gl_FrontFacing) {
    color = vec4(1.0f);
  }
  
}
`;
