export const vs = `#version 300 es
layout(location = 0) in vec3 position;

void main() {
  gl_Position = vec4(position, 1.0f);
}
`;

export const fs = `#version 300 es
#define CASCADES 1

precision highp float;
precision highp sampler2DArray;

#if CASCADES >= 1
  layout(location = 0) out vec4 h0Conj0; 
#endif

#if CASCADES >= 2
  layout(location = 1) out vec4 h0Conj1;
#endif

#if CASCADES >= 3
  layout(location = 2) out vec4 h0Conj2;
#endif

#if CASCADES >= 4
  layout(location = 3) out vec4 h0Conj3;
#endif

layout(std140) uniform Spectrum {
    float size[4];  
    uint resolution;
};      

uniform sampler2DArray h0Textures;

void main() {
  ivec2 texCoord = ivec2(gl_FragCoord.xy);
  ivec2 texConjCoord = ivec2(
    mod(float(int(resolution) - texCoord.x), float(resolution)), 
    mod(float(int(resolution) - texCoord.y), float(resolution))
  );

#if CASCADES >= 1
  vec2 h0Texel = texelFetch(h0Textures, ivec3(texCoord, 0), 0).rg;
  vec2 h0ConjTexel = texelFetch(h0Textures, ivec3(texConjCoord, 0), 0).rg;
  h0Conj0 = vec4(h0Texel.r, h0Texel.g, h0ConjTexel.r, -h0ConjTexel.g);
#endif
  
#if CASCADES >= 2
  h0Texel = texelFetch(h0Textures, ivec3(texCoord, 1), 0).rg;
  h0ConjTexel = texelFetch(h0Textures, ivec3(texConjCoord, 1), 0).rg;
  h0Conj1 = vec4(h0Texel.r, h0Texel.g, h0ConjTexel.r, -h0ConjTexel.g);
#endif

#if CASCADES >= 3
  h0Texel = texelFetch(h0Textures, ivec3(texCoord, 2), 0).rg;
  h0ConjTexel = texelFetch(h0Textures, ivec3(texConjCoord, 2), 0).rg;
  h0Conj2 = vec4(h0Texel.r, h0Texel.g, h0ConjTexel.r, -h0ConjTexel.g);
#endif

#if CASCADES >= 4
  h0Texel = texelFetch(h0Textures, ivec3(texCoord, 3), 0).rg;
  h0ConjTexel = texelFetch(h0Textures, ivec3(texConjCoord, 3), 0).rg;
  h0Conj3 = vec4(h0Texel.r, h0Texel.g, h0ConjTexel.r, -h0ConjTexel.g);
#endif
  
}
`;
