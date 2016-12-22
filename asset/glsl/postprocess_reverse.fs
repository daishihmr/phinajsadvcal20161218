precision mediump float;

uniform sampler2D texture;
uniform vec2 canvasSize;

varying vec2 vUv;

void main(void) {
  vec2 cs = canvasSize; // avoid warning
  vec4 color = texture2D(texture, vUv);
  gl_FragColor = vec4(vec3(1.0) - color.rgb, color.a);
}
