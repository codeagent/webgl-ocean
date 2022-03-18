export const vs = `#version 300 es
in vec4 position;
void main() {
  gl_Position = position;
}
`;

export const fs = `#version 300 es
#define PI 3.141592653f
#define g 9.81f

precision highp float;

layout(location = 0) out vec4 spectrum0; 
layout(location = 1) out vec4 spectrum1; 
layout(location = 2) out vec4 spectrum2; 

uniform sampler2D noise;
uniform uint resolution;  // N
uniform float size;      // L
uniform float A;
uniform vec2 wind;
uniform float alignment;
uniform float minWave;

const float RATIO = 0.618033989036f;

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

vec4 h0(in vec2 x, float size) {
  vec2 k = vec2(2.0 * PI * x.x / size, 2.0 * PI * x.y / size);
  float k2 = dot(k, k);

  if(k2 == 0.0f) {
    return vec4(0.0f);
  }

  float L = dot(wind, wind) / g;
  float L2 = L * L;
  float l2 = minWave * minWave;  // filter out small waves (the waves the wave length of which is less than given tolerance)
  
  float h0k = (A / k2 / k2) * exp(-1.0 / (k2 * L2) - (k2 * l2)) * 0.5f, h0mk = h0k;

  if(alignment > 0.0f) {
    h0k *=  pow(max(0.0f, dot(normalize(wind), normalize(k))), alignment);
    h0mk *=  pow(max(0.0f, dot(normalize(wind), normalize(-k))), alignment);
  }

  return sqrt(vec4(h0k, h0k, h0mk, h0mk));
}

void main() {
  vec2 x = vec2(ivec2(gl_FragCoord.xy)) - float(resolution) * 0.5; //  [-N/2, N/2]
  vec2 rnd = gauss();
  vec4 mult = vec4(rnd.x, rnd.y, rnd.x, -rnd.y);

  spectrum0 = h0(x, size) * mult;
  spectrum1 = h0(x, size * RATIO) * mult;
  spectrum2 = h0(x, size * RATIO * RATIO) * mult;
}
`;
