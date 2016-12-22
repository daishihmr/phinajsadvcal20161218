precision mediump float;

uniform sampler2D texture;
uniform vec2 canvasSize;

varying vec2 vUv;

void main(void) {
  vec2 cs = canvasSize; // avoid warning
  
  vec2 uv = floor(vUv * 175.0) / 175.0;
  
  gl_FragColor = texture2D(texture, uv);
}
