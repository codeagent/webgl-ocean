export const vs = `#version 300 es
layout(location = 0) in vec3 position;

void main() {
  gl_Position = vec4(position, 1.0f);
}
`;

export const fs = `#version 300 es
#define PI 3.141592653f
#define PI2 6.2831853071f
#define SQRT2 1.41421356f
#define g 9.81f
#define CASCADES 1

precision highp float;

#if CASCADES >= 1
  layout(location = 0) out vec2 h0_0; 
#endif

#if CASCADES >= 2
  layout(location = 1) out vec2 h0_1;
#endif

#if CASCADES >= 3
  layout(location = 2) out vec2 h0_2;
#endif

#if CASCADES >= 4
  layout(location = 3) out vec2 h0_3;
#endif

layout(std140) uniform Spectrum {
    float size[4];  // up to 4 cascades
    uint resolution;
    float kMin[4];  
    float kMax[4];  
    vec2 wind;
    float factor;
    float alignment;
};      

uniform sampler2D noise;

// Box-Muller Transform
vec2 gauss() {
  vec2 uv = vec2(ivec2(gl_FragCoord.xy)) / float(resolution);
  vec2 noise = texture(noise, uv).rg;
  float u = PI2 * noise.x;
  float v = sqrt(-2.0f * log(noise.y));

  return vec2(v * cos(u), v * sin(u)) / 4.0f;
}

float phillips(in vec2 k, float A, float kMin, float kMax) {
  float k2 = dot(k, k);

  if(k2 < kMin * kMin || k2 > kMax * kMax) {
    return 0.0f;
  }

  float L = dot(wind, wind) / g;
  float L2 = L * L;
  float h0k = A / (k2 * k2) * exp(-1.0 / (k2 * L2));

  if(alignment > 0.0f) {
    h0k *=  pow(max(0.0f, dot(normalize(wind), normalize(k))), alignment);
  }

  return h0k;
}

void main() {
  vec2 x = vec2(ivec2(gl_FragCoord.xy) - ivec2(resolution / 2u)); //  [-N/2, N/2)
  vec2 rnd = gauss();
  float dk;

#if CASCADES >= 1
  dk = PI2 / size[0];
  h0_0 = sqrt(phillips(vec2(dk) * x, factor, kMin[0], kMax[0])) * dk * rnd  * 1.0f ;
#endif
  
#if CASCADES >= 2
  dk = PI2 / size[1];
  h0_1 = sqrt(phillips(vec2(dk) * x, factor, kMin[1], kMax[1])) * dk * rnd  * 1.0f ;
#endif

#if CASCADES >= 3
  dk = PI2 / size[2];
  h0_2 = sqrt(phillips(vec2(dk) * x, factor, kMin[2], kMax[2])) * dk * rnd  * 1.0f ;
#endif

#if CASCADES >= 4
  dk = PI2 / size[3];
  h0_3 = sqrt(phillips(vec2(dk) * x, factor, kMin[3], kMax[3])) * dk * rnd  * 1.0f;
#endif

}
`;
