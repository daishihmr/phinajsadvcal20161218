precision mediump float;

uniform sampler2D texture;
uniform vec2 canvasSize;

uniform vec4 color;

varying vec2 vUv;

void main(void) {
  vec2 cs = canvasSize; // avoid warning
  vec4 tc = texture2D(texture, vUv);
  gl_FragColor = tc * color;
}
