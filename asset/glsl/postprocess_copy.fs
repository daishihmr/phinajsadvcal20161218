precision mediump float;

uniform sampler2D texture;
uniform vec2 canvasSize;

varying vec2 vUv;

void main(void) {
  vec2 cs = canvasSize; // avoid warning
  gl_FragColor = texture2D(texture, vUv);
}
