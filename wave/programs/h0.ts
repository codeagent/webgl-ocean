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

out vec4 outColor; 

uniform sampler2D noise;
uniform uint resolution;  // N
uniform float size;         // L
uniform float A;
uniform vec2 wind;


vec4 gauss() {
  vec2 uv = vec2(gl_FragCoord.xy) / float(resolution);
  vec4 noise4 = texture(noise, uv).rgba;
  float u0 = 2.0f * PI * noise4.x;
  float v0 = sqrt(-2.0f * log(noise4.y));
  float u1 = 2.0f * PI * noise4.z;
  float v1 = sqrt(-2.0f * log(noise4.w));
  return  vec4(v0 * cos(u0), v0 * sin(u0), v1 * cos(u1),  v1 * sin(u1));
}

void main() {
  vec2 x = vec2(gl_FragCoord.xy) - float(resolution) * 0.5; //  [-N/2, N/2]
  vec2 k = vec2(2.0 * PI * x.x / size, 2.0 * PI * x.y / size);
  float k2 = dot(k, k);
  float L = dot(wind, wind) / g;
  float L2 = L * L;
  float l2 = size * size * 1.0e-6;  // filter out small waves (the waves the wave length of which is less than given tolerance)
  
  float h0k = sqrt(
    (A / k2 / k2) * 
    exp(-1.0 / (k2 * L2) - (k2 * l2)) * 
    pow(dot(normalize(wind), normalize(k)), 2.0f) * 
    0.5
  );

  float h0mk = sqrt(
    (A / k2 / k2) * 
    exp(-1.0 / (k2 * L2) - (k2 * l2)) *
    pow(dot(normalize(wind), normalize(-k)), 2.0f) * 
    0.5
  );

  vec4 rnd = gauss();
  outColor =  vec4(h0k * rnd.x, h0k * rnd.y, h0mk * rnd.z, h0mk * rnd.w);
}
`;
