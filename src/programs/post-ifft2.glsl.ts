export const vs = `#version 300 es
layout(location = 0) in vec3 position;

void main() {
  gl_Position = vec4(position, 1.0f);
}
`;

export const fs = `#version 300 es
#define LAYERS 1

precision highp float;
precision highp sampler2DArray;

#if LAYERS >= 1
  layout(location = 0) out vec4 ifft0;
#endif

#if LAYERS >= 2
  layout(location = 1) out vec4 ifft1;
#endif

#if LAYERS >= 3
  layout(location = 2) out vec4 ifft2;
#endif

#if LAYERS >= 4
  layout(location = 3) out vec4 ifft3;
#endif

#if LAYERS >= 5
  layout(location = 4) out vec4 ifft4;
#endif

#if LAYERS >= 6
  layout(location = 5) out vec4 ifft5;
#endif

#if LAYERS >= 7
  layout(location = 6) out vec4 ifft6;
#endif

#if LAYERS >= 8
  layout(location = 7) out vec4 ifft7;
#endif

uniform sampler2DArray data;

void main() {
  const float sign[] = float[2](1.0f, -1.0f);
  float p = float(int(gl_FragCoord.x) + int(gl_FragCoord.y));
  float m = sign[int(mod(p, 2.0f))];
  ivec2 uv = ivec2(gl_FragCoord.xy);

#if LAYERS >= 1
  ifft0 = texelFetch(data, ivec3(uv, 0), 0).rgba * m;
#endif

#if LAYERS >= 2
  ifft1 = texelFetch(data, ivec3(uv, 1), 0).rgba * m;
#endif

#if LAYERS >= 3
  ifft2 = texelFetch(data, ivec3(uv, 2), 0).rgba * m;
#endif

#if LAYERS >= 4
  ifft3 = texelFetch(data, ivec3(uv, 3), 0).rgba * m;
#endif

#if LAYERS >= 5
  ifft4 = texelFetch(data, ivec3(uv, 4), 0).rgba * m;
#endif

#if LAYERS >= 6
  ifft5 = texelFetch(data, ivec3(uv, 5), 0).rgba * m;
#endif

#if LAYERS >= 7
  ifft6 = texelFetch(data, ivec3(uv, 6), 0).rgba * m;
#endif

#if LAYERS >= 8
  ifft7 = texelFetch(data, ivec3(uv, 7), 0).rgba * m;
#endif
}
`;
