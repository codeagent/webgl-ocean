export const vs = `#version 300 es

layout(location = 0) in vec3 position;

uniform mat4 viewMat;
uniform mat4 worldMat;
uniform mat4 projMat;
uniform float sizes[3];   
uniform float croppinesses[3];   
uniform float geometrySize;   

uniform sampler2D dx_hy_dz_dxdz0;
uniform sampler2D sx_sz_dxdx_dzdz0;
uniform sampler2D dx_hy_dz_dxdz1;
uniform sampler2D sx_sz_dxdx_dzdz1;
uniform sampler2D dx_hy_dz_dxdz2;
uniform sampler2D sx_sz_dxdx_dzdz2;

out vec3 _position;
out vec2 _xz;

vec3 getDisplacement(in vec2 xz) {
  vec2 uv0 = xz / sizes[0];
  vec2 uv1 = xz / sizes[1];
  vec2 uv2 = xz / sizes[2];

  return 
    texture(dx_hy_dz_dxdz0, uv0).xyz * vec3(croppinesses[0], 1.0f, croppinesses[0]) + 
    texture(dx_hy_dz_dxdz1, uv1).xyz * vec3(croppinesses[1], 1.0f, croppinesses[1]) + 
    texture(dx_hy_dz_dxdz2, uv2).xyz * vec3(croppinesses[2], 1.0f, croppinesses[2]);
}

void main()
{
  vec2 xz = vec3(worldMat * vec4(position * geometrySize, 1.0f)).xz;
  _position = position * geometrySize + getDisplacement(xz);
  _position = vec3(worldMat * vec4(_position, 1.0f));
  _xz = xz;
  gl_Position = projMat * viewMat * vec4(_position, 1.0f);
}
`;

export const fs = `#version 300 es
precision highp float;

layout(location = 0) out vec4 color;	

in vec3 _position;
in vec2 _xz;

uniform vec3 pos;
uniform float foamSpreading;
uniform float foamContrast;
uniform float sizes[3];   
uniform float croppinesses[3];   

uniform sampler2D dx_hy_dz_dxdz0;
uniform sampler2D sx_sz_dxdx_dzdz0;
uniform sampler2D dx_hy_dz_dxdz1;
uniform sampler2D sx_sz_dxdx_dzdz1;
uniform sampler2D dx_hy_dz_dxdz2;
uniform sampler2D sx_sz_dxdx_dzdz2;

vec4 jacobian(float dxdx, float dxdz, float dzdz) {
  float Jxx = 1.0f + dxdx;
  float Jxz = dxdz;
  float Jzz = 1.0f + dzdz;
  return vec4(Jxx, Jxz, Jxz, Jzz);
}

float det(vec4 jacobian) {
  return jacobian.x * jacobian.w - jacobian.y * jacobian.z;
}

vec3 getNormal(in vec2 xz) {
  vec2 uv0 = xz / sizes[0];
  vec2 uv1 = xz / sizes[1];
  vec2 uv2 = xz / sizes[2];

  vec4 _sx_sz_dxdx_dzdz0 = texture(sx_sz_dxdx_dzdz0, uv0).xyzw;
  vec4 _sx_sz_dxdx_dzdz1 = texture(sx_sz_dxdx_dzdz1, uv1).xyzw;
  vec4 _sx_sz_dxdx_dzdz2 = texture(sx_sz_dxdx_dzdz2, uv2).xyzw;

  float sx = _sx_sz_dxdx_dzdz0.x + _sx_sz_dxdx_dzdz1.x +_sx_sz_dxdx_dzdz2.x;
  float sz = _sx_sz_dxdx_dzdz0.y + _sx_sz_dxdx_dzdz1.y +_sx_sz_dxdx_dzdz2.y;
  float dxdx = _sx_sz_dxdx_dzdz0.z * croppinesses[0] + _sx_sz_dxdx_dzdz1.z * croppinesses[1] + _sx_sz_dxdx_dzdz2.z * croppinesses[2];
  float dzdz = _sx_sz_dxdx_dzdz0.w * croppinesses[0] + _sx_sz_dxdx_dzdz1.w * croppinesses[1] + _sx_sz_dxdx_dzdz2.w * croppinesses[2];

  vec2 slope = vec2(sx / (1.0f + dxdx), sz / (1.0f + dzdz));

  return normalize(vec3(-slope.x, 1.0f, -slope.y));
}

float getFoam(in vec2 xz) {
  vec2 uv0 = xz / sizes[0];
  vec2 uv1 = xz / sizes[1];
  vec2 uv2 = xz / sizes[2];

  vec2 dxdx_dzdz0 = texture(sx_sz_dxdx_dzdz0, uv0).zw;
  vec2 dxdx_dzdz1 = texture(sx_sz_dxdx_dzdz1, uv1).zw;
  vec2 dxdx_dzdz2 = texture(sx_sz_dxdx_dzdz2, uv2).zw;

  float dxdz0 = texture(dx_hy_dz_dxdz0, uv0).w;
  float dxdz1 = texture(dx_hy_dz_dxdz1, uv1).w;
  float dxdz2 = texture(dx_hy_dz_dxdz2, uv2).w;
  
  vec2 dxdx_dzdz = dxdx_dzdz0 * croppinesses[0] + dxdx_dzdz1 * croppinesses[1] + dxdx_dzdz2 * croppinesses[2];
  float dxdz = dxdz0 * croppinesses[0] + dxdz1 * croppinesses[1] + dxdz2 * croppinesses[2];
  
  return pow(-min(0.0f, det(jacobian(dxdx_dzdz.x, dxdz, dxdx_dzdz.y)) - foamSpreading), foamContrast);
}

void main()
{
  vec4 albedo = vec4(0, 0.62, 0.77, 1.0);
  vec3 n = getNormal(_xz);
  vec3 l = normalize(pos - _position);
  float nol = dot(n, l) * 0.9 + 0.1;
  color = albedo * vec4(vec3(nol), 1.0f) + getFoam(_xz) * 0.5;
  
  if(!gl_FrontFacing) {
    color = vec4(1.0f);
  }
  
}
`;
