export const vs = `#version 300 es
#define CASCADES 1

precision highp float;
precision highp sampler2DArray;

layout(location = 0) in vec3 position;

layout(std140) uniform Transform {
  vec3 pos;
  mat4 viewMat;
  mat4 worldMat;
  mat4 projMat;
};

layout(std140) uniform Spectrum {
  float size[4];
  uint resolution;
};

layout(std140) uniform Ocean {
  float steepness[4];
  float foamFalloff[4];
  float foamOffset[4];
};

layout(std140) uniform Material {
  float lodFactor;
  float foamIntensity;
  float breakingIntensity;
  float breakingOffset;
  vec3 waterColor;
  vec3 foamColor;
  vec3 envColor;
};

uniform sampler2DArray data;

out vec3 _position;
out vec2 _xz;
out vec3 _weights;

vec3 getDisplacement(in vec2 xz, in vec3 weights) {
  vec3 displacement = texture(data, vec3(xz / size[0], 0.0f)).xyz * vec3(steepness[0], 1.0f, steepness[0]);

#if CASCADES >= 2
  displacement += texture(data, vec3(xz / size[1], 2.0f)).xyz * vec3(steepness[1], 1.0f, steepness[1]) * weights.x;
#endif

#if CASCADES >= 3
  displacement += texture(data, vec3(xz / size[2], 4.0f)).xyz * vec3(steepness[2], 1.0f, steepness[2]) * weights.y;
#endif

#if CASCADES >= 4
  displacement += texture(data, vec3(xz / size[3], 6.0f)).xyz * vec3(steepness[3], 1.0f, steepness[3]) * weights.z;
#endif

  return displacement;
}

void main()
{
  _position = vec3(worldMat * vec4(position, 1.0f));
  float distance = length(pos - _position);
  _xz = _position.xz;
  _weights = min(vec3(size[1], size[2], size[3]) * lodFactor / distance, vec3(1.0f));
  _position = _position + getDisplacement(_xz, _weights);
  gl_Position = projMat * viewMat * vec4(_position, 1.0f);
}
`;

export const fs = `#version 300 es
#define CASCADES 1

precision highp float;
precision highp int;
precision highp sampler2DArray;
precision highp sampler2D;

layout(location = 0) out vec4 color;	

in vec3 _position;
in vec2 _xz;
in vec3 _weights;

layout(std140) uniform Transform {
  vec3 pos; // camera pos
  mat4 viewMat;
  mat4 worldMat;
  mat4 projMat;
};

layout(std140) uniform Spectrum {
  float size[4];
  uint resolution;
};

layout(std140) uniform Ocean {
  float steepness[4];
  float foamFalloff[4];
  float foamOffset[4];
};

layout(std140) uniform Material {
  float lodFactor;
  float foamIntensity;
  float breakingIntensity;
  float breakingOffset;
  vec3 waterColor;
  vec3 foamColor;
  vec3 envColor;
};

uniform sampler2DArray data;
uniform sampler2D turbulence;
uniform sampler2D sssTexture;
uniform samplerCube envMap;


vec3 getNormal(in vec2 xz, in vec3 weights) {
  vec4 sx_sz_dxdx_dzdz =  texture(data, vec3(xz / size[0], 1.0f)) * vec4(1.0f, 1.0f, steepness[0], steepness[0]);

#if CASCADES >= 2
  sx_sz_dxdx_dzdz += texture(data, vec3(xz / size[1], 3.0f)) * vec4(1.0f, 1.0f, steepness[1], steepness[1]) * weights.x;
#endif

#if CASCADES >= 3
  sx_sz_dxdx_dzdz += texture(data, vec3(xz / size[2], 5.0f)) * vec4(1.0f, 1.0f, steepness[2], steepness[2])* weights.y;
#endif
    
#if CASCADES >= 4
  sx_sz_dxdx_dzdz += texture(data, vec3(xz / size[3], 7.0f)) * vec4(1.0f, 1.0f, steepness[3], steepness[3]) * weights.z;
#endif
  
  return normalize(
    vec3(
      -sx_sz_dxdx_dzdz.x / (1.0f + sx_sz_dxdx_dzdz.z), 
      1.0f, 
      -sx_sz_dxdx_dzdz.y / (1.0f + sx_sz_dxdx_dzdz.w)
    )
  );
}

float  getJacobian(vec2 dxdx_dzdz, float dxdz) {
  return clamp((1.0f + dxdx_dzdz.x) * (1.0f + dxdx_dzdz.y) - dxdz * dxdz, 0.0f, 1.0f);
}

float sss = 0.0f;

float getFoam(in vec2 xz, in vec3 weights) {
  vec2 dxdx_dzdz = vec2(0.0f);
  float dxdz = 0.0f;
  float jac = 0.0;
  float turb = 0.0;
  vec2 uv = xz / size[0];

  dxdx_dzdz += texture(data, vec3(uv, 1.0f)).zw * steepness[0] ;
  dxdz += texture(data, vec3(uv, 0.0f)).w * steepness[0];
  turb = texture(turbulence, uv).r;
  jac = getJacobian(dxdx_dzdz, dxdz);
  sss = texture(sssTexture, uv).r;
   
#if CASCADES >= 2
  uv = xz / size[1];
  dxdx_dzdz += texture(data, vec3(uv, 3.0f)).zw * steepness[1] * weights.x;
  dxdz += texture(data, vec3(uv, 2.0f)).w * steepness[1]  * weights.x;
  jac *= getJacobian(dxdx_dzdz, dxdz);
  turb += turb * texture(turbulence, uv).g;
  // sss += sss * texture(sssTexture, uv).g;
#endif

#if CASCADES >= 3
  uv = xz / size[2];
  dxdx_dzdz += texture(data, vec3(uv, 5.0f)).zw * steepness[2] * weights.y;
  dxdz += texture(data, vec3(uv, 4.0f)).w * steepness[2] * weights.y;
  jac *= getJacobian(dxdx_dzdz, dxdz);
  turb += turb * texture(turbulence, uv).b;
  // sss *=  texture(sssTexture, uv).b;
#endif

#if CASCADES >= 4
  uv = xz / size[3];
  dxdx_dzdz += texture(data, vec3(uv, 7.0f)).zw * steepness[3]  * weights.z;
  dxdz += texture(data, vec3(uv, 6.0f)).w * steepness[3]  * weights.z;
  jac *= getJacobian(dxdx_dzdz, dxdz);
  turb += turb * texture(turbulence, uv).a;
  // sss += sss * texture(sssTexture, uv).a;
#endif
  float breaking = smoothstep(breakingOffset, 0.0f, jac);
  
  sss = min(1.0f, sss);

  return clamp(breaking * breakingIntensity + turb * foamIntensity, 0.0f, 1.0f) ;
}

float pow5(float value) {
  float pow2 = value * value;

  return pow2 * pow2 * value;
}

float fresnelSchlick(vec3 view, vec3 normal){
  float cosTheta = dot(normal, view);
	float F0 = 0.02;
  return F0 + (1.0 - F0) * pow5(1.0 - cosTheta);
}

const vec3 sunDir = normalize(vec3(1.0f));

vec3 surface(in vec3 normal, in vec3 view) {
  const vec3 mist = vec3(1.34, 0.42, 0.5);
  const float nShell = 1.34f;
  const float kDiffuse = 1.0f;
  

  vec3 ref = reflect(-view, normal);
  ref = normalize(ref);
  ref.y = abs(ref.y);
  
  vec3 sky = envColor ;

  if(ref.y < 0.0f) {
    // sky = mix(envColor, waterColor, dot(ref, normalize(vec3(ref.x, 0.0f, ref.z))));
    // sky = waterColor;
  }
  
  // vec3 sky = textureLod(envMap, ref, 8.0f).rgb;
  

  
  float reflectivity;
  float costhetai = abs(dot(normal, view));
  float thetai = acos(costhetai);

  if(thetai == 0.0)
  {
    reflectivity = (nShell - 1.0f) / (nShell + 1.0f);
    reflectivity = reflectivity * reflectivity;
  }
  else
  {
    float sinthetat = sin(thetai) / nShell;
    float thetat = asin(sinthetat);
    float fs = sin(thetat - thetai)  / sin(thetat + thetai);
    float ts = tan(thetat - thetai)  / tan(thetat + thetai);
    reflectivity = 0.5 * (fs * fs + ts * ts );
  }

  reflectivity = fresnelSchlick(view,normal);
  float falloff =  min(exp(-(length(view) - 10.0f) * 1.0e-2), 1.0f) * kDiffuse;

  float delta = 0.15;
  vec3 H = normalize(normal * delta + sunDir);
  float I = pow(max(dot(view, -H), 0.0f), 5.0f) * 1.0f * smoothstep(0.0f, 1.0f, sss);
  I += smoothstep(0.0f, 2.0f, sss) * 1.5;

  vec3 clr = mix(waterColor, waterColor + vec3(0.25f, 0.5f, 0.25f), I);
  vec3 surf =  reflectivity * sky + (1.0f - reflectivity) * clr;
  surf += vec3(pow(max(0.0f, dot(ref, sunDir)), 500.0f));

  return falloff * surf  + (1.0f - falloff) * mist;
}

void main()
{
  vec3 normal = getNormal(_xz, _weights) ;
  float foam = min(getFoam(_xz,  _weights), 1.0f);
  // foam = pow(foam, 3.0f) *;
  // foam = smoothstep(0.0f, 1.0f, foam);

  vec3 view = normalize(pos - _position);
  color = vec4(mix(surface(normal, view), foamColor, foam), 1.0f); 
}
`;
