export default `#version 300 es
precision highp float;

layout( location = 0 ) out vec4 color;	

in vec3 _pos;

uniform samplerCube env;

uniform float exposure;
uniform float gamma;

vec3 gammaCorrection(const vec3 color) {
  return pow(color, vec3(1.0f / gamma));
}

vec3 toneMapping(const vec3 color) {
  return vec3(1.0f) - exp(-color * exposure);
}

void main()
{
  vec3 background = textureLod(env, normalize(_pos), 0.0f).rgb;
  color = vec4(gammaCorrection(toneMapping(background)), 1.0f);
}
`;
