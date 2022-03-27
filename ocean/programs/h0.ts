export const vs = `#version 300 es
in vec4 position;
void main() {
  gl_Position = position;
}
`;

export const fs = `#version 300 es
#define PI 3.141592653f
#define PI2 6.2831853071f
#define g 9.81f

precision highp float;

layout(location = 0) out vec4 spectrum0; 
layout(location = 1) out vec4 spectrum1; 
layout(location = 2) out vec4 spectrum2; 

uniform sampler2D noise;
uniform uint resolution;  // N
uniform vec2 wind;
uniform float alignment;

uniform struct FieldCascade {
  float size;
  float strength;
  float minK;
  float maxK;
} cascades[3];

vec2 gauss() {
  vec2 uv = 2.0f * vec2(ivec2(gl_FragCoord.xy)) / float(resolution) - vec2(1.0f);
  vec2 noise2 = vec2(0.0f);

  if((uv.x >= 0.0f && uv.y >= 0.0f) || (uv.x <= 0.0f && uv.y <= 0.0f)) {
    noise2 = texture(noise, uv).rg;
  } else {
    noise2 = texture(noise, uv).ba;
  }

  float u0 = 2.0f * PI * noise2.x;
  float v0 = sqrt(-2.0f * log(noise2.y));
  return vec2(v0 * cos(u0), v0 * sin(u0));
}

vec4 phillips(in vec2 k, float A, float minK, float maxK) {
  float k2 = dot(k, k);
  
  if(k2 <= minK * minK || k2 >= maxK * maxK) {
    return vec4(0.0f);
  }

  float L = dot(wind, wind) / g;
  float L2 = L * L;
  float h0k = (A / k2 / k2) * exp(-1.0 / (k2 * L2)) * 0.5f, h0mk = h0k;

  if(alignment > 0.0f) {
    h0k *=  pow(max(0.0f, dot(normalize(wind), normalize(k))), alignment);
    h0mk *=  pow(max(0.0f, dot(normalize(wind), normalize(-k))), alignment);
  }

  return sqrt(vec4(h0k, h0k, h0mk, h0mk));
}

void main() {
  vec2 x = vec2(ivec2(gl_FragCoord.xy) - ivec2(resolution / 2u)); //  [-N/2, N/2]
  vec2 k = vec2(PI2) * x;
  vec2 rnd = gauss();
  vec4 mult = vec4(rnd.x, rnd.y, rnd.x, -rnd.y);
  
  spectrum0 = phillips(k / cascades[0].size, cascades[0].strength, cascades[0].minK, cascades[0].maxK) * mult;
  spectrum1 = phillips(k / cascades[1].size, cascades[1].strength, cascades[1].minK, cascades[1].maxK) * mult;
  spectrum2 = phillips(k / cascades[2].size, cascades[2].strength, cascades[2].minK, cascades[2].maxK) * mult;
}
`;
