precision mediump float;

uniform sampler2D texture;
uniform vec2 canvasSize;

varying vec2 vUv;

void main(void) {
  vec2 cs = canvasSize; // avoid warning
  vec4 color = texture2D(texture, vUv);
  float c = (color.r + color.g + color.b) / 3.0;
  gl_FragColor = vec4(vec3(c), color.a);
}
