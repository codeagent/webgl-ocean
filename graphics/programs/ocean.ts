export const vs = `#version 300 es

layout(location = 0) in vec3 position;

uniform mat4 viewMat;
uniform mat4 worldMat;
uniform mat4 projMat;

uniform float croppiness;
uniform float size;
uniform sampler2D dx_hy_dz_dxdz0;
uniform sampler2D sx_sz_dxdx_dzdz0;
uniform sampler2D dx_hy_dz_dxdz1;
uniform sampler2D sx_sz_dxdx_dzdz1;
uniform sampler2D dx_hy_dz_dxdz2;
uniform sampler2D sx_sz_dxdx_dzdz2;

out vec3 _position;
out vec2 _uv;

const float RATIO = 0.618033989036f;

vec3 getDisplacement(in vec2 uv) {
  vec2 uv0 = uv;
  vec2 uv1 = uv / RATIO;
  vec2 uv2 = uv / RATIO / RATIO;
  vec3 sum = 
    texture(dx_hy_dz_dxdz0, uv0).xyz + 
    texture(dx_hy_dz_dxdz1, uv1).xyz + 
    texture(dx_hy_dz_dxdz2, uv2).xyz;

  return sum * vec3(croppiness, 1.0f, croppiness);
}

void main()
{
  vec2 uv = vec3(worldMat * vec4(position, 1.0f)).xz / size;
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

const float RATIO = 0.618033989036f;

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
  vec2 uv0 = uv;
  vec2 uv1 = uv / RATIO;
  vec2 uv2 = uv / RATIO / RATIO;

  vec4 _sx_sz_dxdx_dzdz0 = texture(sx_sz_dxdx_dzdz0, uv0).xyzw;
  vec4 _sx_sz_dxdx_dzdz1 = texture(sx_sz_dxdx_dzdz1, uv1).xyzw;
  vec4 _sx_sz_dxdx_dzdz2 = texture(sx_sz_dxdx_dzdz2, uv2).xyzw;

  float sx = _sx_sz_dxdx_dzdz0.x + _sx_sz_dxdx_dzdz1.x +_sx_sz_dxdx_dzdz2.x;
  float sz = _sx_sz_dxdx_dzdz0.y + _sx_sz_dxdx_dzdz1.y +_sx_sz_dxdx_dzdz2.y;
  float dxdx = _sx_sz_dxdx_dzdz0.z + _sx_sz_dxdx_dzdz1.z +_sx_sz_dxdx_dzdz2.z;
  float dzdz = _sx_sz_dxdx_dzdz0.w + _sx_sz_dxdx_dzdz1.w +_sx_sz_dxdx_dzdz2.w;

  vec2 slope = vec2(sx / (1.0f + croppiness * dxdx), sz / (1.0f + croppiness * dzdz));

  return normalize(vec3(-slope.x, 1.0f, -slope.y));
}

float getFoam(in vec2 uv) {
  vec2 uv0 = uv;
  vec2 uv1 = uv / RATIO;
  vec2 uv2 = uv / RATIO / RATIO;

  vec2 dxdx_dzdz0 = texture(sx_sz_dxdx_dzdz0, uv0).zw;
  vec2 dxdx_dzdz1 = texture(sx_sz_dxdx_dzdz1, uv1).zw;
  vec2 dxdx_dzdz2 = texture(sx_sz_dxdx_dzdz2, uv2).zw;

  float dxdz0 = texture(dx_hy_dz_dxdz0, uv0).w;
  float dxdz1 = texture(dx_hy_dz_dxdz1, uv1).w;
  float dxdz2 = texture(dx_hy_dz_dxdz2, uv2).w;
  
  vec2 dxdx_dzdz = dxdx_dzdz0 + dxdx_dzdz1 + dxdx_dzdz2;
  float dxdz = dxdz0 + dxdz1 + dxdz2;
  
  return pow(-min(0.0f, det(jacobian(dxdx_dzdz.x, dxdz, dxdx_dzdz.y)) - 1.0f), 2.0);
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
