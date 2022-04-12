export default `#version 300 es
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

  float val = det(jacobian(dxdx_dzdz.x, dxdz, dxdx_dzdz.y));
  return pow(-min(0.0f, val - foamSpreading), foamContrast);
}

vec3 surface(in vec3 normal, in vec3 view) {
  const vec3 upwelling = vec3(0.0, 0.2, 0.3);
  const vec3 sky = vec3(0.69, 0.84, 1.0);
  const vec3 mist = vec3(0.34, 0.42, 0.5);
  const float nShell = 1.34f;
  const float kDiffuse = 0.91f;

  float reflectivity;
  float costhetai = abs(dot(normal, normalize(view)));
  float thetai = acos(costhetai);
  float sinthetat = sin(thetai) / nShell;
  float thetat = asin(sinthetat);

  if(thetai == 0.0)
  {
    reflectivity = (nShell - 1.0f) / (nShell + 1.0f);
    reflectivity = reflectivity * reflectivity;
  }
  else
  {
    float fs = sin(thetat - thetai)  / sin(thetat + thetai);
    float ts = tan(thetat - thetai)  / tan(thetat + thetai);
    reflectivity = 0.5 * (fs * fs + ts * ts );
  }

  float falloff = exp(-length(view) * 1.0e-3) * kDiffuse;
  vec3 surf =  reflectivity * sky + (1.0f - reflectivity) * upwelling;
  return falloff * surf  + (1.0f - falloff) * mist;
}

void main()
{
  float f = getFoam(_xz);
  vec3 n = getNormal(_xz);
  const vec3 foam = vec3(1.0f);
  vec3 water = surface(n, pos - _position);
  color = vec4(mix(water, foam, f), 1.0f); 
}
`;
