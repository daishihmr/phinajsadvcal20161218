phina.namespace(function() {

  phina.define("GLLayer", {
    superClass: "Layer",

    renderChildBySelf: true,

    domElement: null,
    gl: null,
    quality: 1.0,

    camera: null,

    spriteDrawer: null,

    zoomBlurCenterX: 0,
    zoomBlurCenterY: 0,
    zoomBlurStrength: 0,
    zoomBlurAlpha: 0,
    reverse: false,
    grayscale: false,
    water: false,
    mosaic: false,

    init: function() {
      this.superInit();
      this.originX = 0;
      this.originY = 0;

      var canvas = document.createElement("canvas");
      var gl = this.gl = canvas.getContext("webgl");
      var extInstancedArrays = phigl.Extensions.getInstancedArrays(gl);

      this.domElement = canvas;
      this.domElement.width = this.width * this.quality;
      this.domElement.height = this.height * this.quality;

      gl.viewport(0, 0, this.domElement.width, this.domElement.height);
      gl.clearColor(0, 0, 0, 0);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.BLEND);
      gl.disable(gl.DEPTH_TEST);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      var w = this.width;
      var h = this.height;
      var dw = this.domElement.width;
      var dh = this.domElement.height;
      var sw = Math.pow(2, Math.ceil(Math.log2(dw)));
      var sh = Math.pow(2, Math.ceil(Math.log2(dh)));

      this.camera = Camera()
        .setPosition(w * 0.5, h * 0.5, 2000)
        .lookAt(w * 0.5, h * 0.5, 0)
        .ortho(-w * 0.5, w * 0.5, h * 0.5, -h * 0.5, 0.1, 3000)
        .calcVpMatrix();

      this.spriteDrawer = SpriteDrawer(gl, extInstancedArrays);

      this.framebufferSrc = phigl.Framebuffer(gl, sw, sh);
      this.framebufferDst = phigl.Framebuffer(gl, sw, sh);
      this.framebufferZoomBlur = phigl.Framebuffer(gl, sw, sh);

      this.postProcessColor = phigl.PostProcessing(gl, "postprocess_color.fs", ["color"], dw, dh);
      this.postProcessCopy = phigl.PostProcessing(gl, "postprocess_copy.fs", null, dw, dh);
      this.postProcessZoomBlur = phigl.PostProcessing(gl, "postprocess_zoomblur.fs", ["center", "strength"], dw, dh);
      this.postProcessReverse = phigl.PostProcessing(gl, "postprocess_reverse.fs", null, dw, dh);
      this.postProcessGrayscale = phigl.PostProcessing(gl, "postprocess_grayscale.fs", null, dw, dh);
      this.postProcessMosaic = phigl.PostProcessing(gl, "postprocess_mosaic.fs", null, dw, dh);
    },

    draw: function(canvas) {
      var gl = this.gl;
      var image = this.domElement;

      var cameraUniforms = this.camera.uniformValues();

      this.framebufferDst.bind();
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.spriteDrawer.render(cameraUniforms);
      this.swap();

      if (this.zoomBlurAlpha > 0 && this.zoomBlurStrength > 0) {
        this.framebufferZoomBlur.bind();
        gl.clear(gl.COLOR_BUFFER_BIT);
        this.postProcessZoomBlur.render(this.framebufferSrc.texture, {
          center: this.postProcessZoomBlur.calcCoord(this.zoomBlurCenterX, this.zoomBlurCenterY),
          strength: this.zoomBlurStrength,
        });
        this.framebufferDst.bind();
        this.postProcessCopy.render(this.framebufferSrc.texture);
        this.postProcessColor.render(this.framebufferZoomBlur.texture, { color: [1, 1, 1, this.zoomBlurAlpha] });
        this.swap();
      }

      if (this.reverse) {
        this.framebufferDst.bind();
        this.postProcessReverse.render(this.framebufferSrc.texture);
        this.swap();
      }

      if (this.grayscale) {
        this.framebufferDst.bind();
        this.postProcessGrayscale.render(this.framebufferSrc.texture);
        this.swap();
      }

      if (this.water) {
        this.framebufferDst.bind();
        this.postProcessColor.render(this.framebufferSrc.texture, { color: [0.5, 0.5, 2, 1] });
        this.swap();
      }

      if (this.mosaic) {
        this.framebufferDst.bind();
        this.postProcessMosaic.render(this.framebufferSrc.texture);
        this.swap();
      }

      phigl.Framebuffer.unbind(gl);
      this.postProcessCopy.render(this.framebufferSrc.texture);

      gl.flush();

      canvas.context.drawImage(image,
        0, 0, image.width, image.height,
        0, 0, this.width, this.height
      );
    },

    swap: function() {
      var temp = this.framebufferSrc;
      this.framebufferSrc = this.framebufferDst;
      this.framebufferDst = temp;
    },

  });
});
