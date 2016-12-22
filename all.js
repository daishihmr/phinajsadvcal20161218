phina.namespace(function() {

  phina.define("Camera", {

    position: null,
    vMatrix: null,
    pMatrix: null,
    vpMatrix: null,

    init: function() {
      this.position = vec3.create();
      this.vMatrix = mat4.create();
      this.pMatrix = mat4.create();
      this.vpMatrix = mat4.create();
    },

    setPosition: function(x, y, z) {
      vec3.set(this.position, x, y, z);
      return this;
    },

    lookAt: function(x, y, z) {
      mat4.lookAt(this.vMatrix, this.position, [x, y, z], [0, 1, 0]);
      return this;
    },

    ortho: function(left, right, bottom, top, near, far) {
      mat4.ortho(this.pMatrix, left, right, bottom, top, near, far);
      return this;
    },

    perspective: function(fovy, aspect, near, far) {
      mat4.perspective(this.pMatrix, fovy, aspect, near, far);
      return this;
    },

    calcVpMatrix: function() {
      mat4.mul(this.vpMatrix, this.pMatrix, this.vMatrix);
      return this;
    },

    uniformValues: function() {
      return {
        vpMatrix: this.vpMatrix,
        cameraPosition: this.position,
      };
    }

  });
});

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

phina.namespace(function() {

  phina.define("GLSprite", {
    superClass: "phina.app.Element",

    id: -1,
    instanceData: null,

    init: function(id, instanceData, instanceStride) {
      this.superInit();
      this.id = id;
      this.instanceData = instanceData;
      this.index = id * instanceStride;
    },

    spawn: function(options) {
      options.$safe({
        visible: true,
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        frameX: 0,
        frameY: 0,
        frameW: 1 / 8,
        frameH: 1 / 8,
        red: 1.0,
        green: 1.0,
        blue: 1.0,
        alpha: 1.0,
      });

      this.visible = options.visible;
      this.x = options.x;
      this.y = options.y;
      this.rotation = options.rotation;
      this.scaleX = options.scaleX;
      this.scaleY = options.scaleY;
      this.frameX = options.frameX;
      this.frameY = options.frameY;
      this.frameW = options.frameW;
      this.frameH = options.frameH;
      this.red = options.red;
      this.green = options.green;
      this.blue = options.blue;
      this.alpha = options.alpha;

      return this;
    },

    onremoved: function() {
      this.visible = false;
    },

    _accessor: {
      visible: {
        get: function() {
          return this.instanceData[this.index + 0] === 1;
        },
        set: function(v) {
          this.instanceData[this.index + 0] = v ? 1 : 0;
        },
      },
      x: {
        get: function() {
          return this.instanceData[this.index + 1];
        },
        set: function(v) {
          this.instanceData[this.index + 1] = v;
        },
      },
      y: {
        get: function() {
          return this.instanceData[this.index + 2];
        },
        set: function(v) {
          this.instanceData[this.index + 2] = v;
        },
      },
      rotation: {
        get: function() {
          return this.instanceData[this.index + 3];
        },
        set: function(v) {
          this.instanceData[this.index + 3] = v;
        },
      },
      scaleX: {
        get: function() {
          return this.instanceData[this.index + 4];
        },
        set: function(v) {
          this.instanceData[this.index + 4] = v;
        },
      },
      scaleY: {
        get: function() {
          return this.instanceData[this.index + 5];
        },
        set: function(v) {
          this.instanceData[this.index + 5] = v;
        },
      },
      frameX: {
        get: function() {
          return this.instanceData[this.index + 6];
        },
        set: function(v) {
          this.instanceData[this.index + 6] = v;
        },
      },
      frameY: {
        get: function() {
          return this.instanceData[this.index + 7];
        },
        set: function(v) {
          this.instanceData[this.index + 7] = v;
        },
      },
      frameW: {
        get: function() {
          return this.instanceData[this.index + 8];
        },
        set: function(v) {
          this.instanceData[this.index + 8] = v;
        },
      },
      frameH: {
        get: function() {
          return this.instanceData[this.index + 9];
        },
        set: function(v) {
          this.instanceData[this.index + 9] = v;
        },
      },
      red: {
        get: function() {
          return this.instanceData[this.index + 10];
        },
        set: function(v) {
          this.instanceData[this.index + 10] = v;
        },
      },
      green: {
        get: function() {
          return this.instanceData[this.index + 11];
        },
        set: function(v) {
          this.instanceData[this.index + 11] = v;
        },
      },
      blue: {
        get: function() {
          return this.instanceData[this.index + 12];
        },
        set: function(v) {
          this.instanceData[this.index + 12] = v;
        },
      },
      alpha: {
        get: function() {
          return this.instanceData[this.index + 13];
        },
        set: function(v) {
          this.instanceData[this.index + 13] = v;
        },
      },
    },
  });

});

phina.main(function() {

  var app = GameApp({
    startLabel: "main",
    backgroundColor: "black",
    assets: {
      image: {
        "tomapiko": "asset/image/tomapiko_ss.png",
        "background": "asset/image/background.png",
      },
      vertexShader: {
        "sprites.vs": "asset/glsl/sprites.vs",
      },
      fragmentShader: {
        "sprites.fs": "asset/glsl/sprites.fs",
        "postprocess_color.fs": "asset/glsl/postprocess_color.fs",
        "postprocess_copy.fs": "asset/glsl/postprocess_copy.fs",
        "postprocess_zoomblur.fs": "asset/glsl/postprocess_zoomblur.fs",
        "postprocess_reverse.fs": "asset/glsl/postprocess_reverse.fs",
        "postprocess_grayscale.fs": "asset/glsl/postprocess_grayscale.fs",
        "postprocess_mosaic.fs": "asset/glsl/postprocess_mosaic.fs",
      },
    },
    fps: 60,
  });
  
  app.enableStats();
  app.run();

});

phina.namespace(function() {

  phina.define("MainScene", {
    superClass: "DisplayScene",

    init: function() {
      this.superInit();

      var self = this;
      this.fromJSON({
        children: {
          glLayer: {
            className: "GLLayer"
          },
          buttons: {
            className: "DisplayElement",
            children: {
              zoom: {
                className: "Button",
                arguments: {
                  text: "ズームブラー",
                },
                x: 320,
                y: 60,
                onclick: function() {
                  self.zoomBlur();
                },
              },
              reverse: {
                className: "Button",
                arguments: {
                  text: "反転",
                },
                x: 320,
                y: 160,
                onclick: function() {
                  self.reverse();
                },
              },
              water: {
                className: "Button",
                arguments: {
                  text: "青っぽく",
                },
                x: 320,
                y: 260,
                onclick: function() {
                  self.water();
                },
              },
              grayscale: {
                className: "Button",
                arguments: {
                  text: "グレイスケール",
                },
                x: 320,
                y: 360,
                onclick: function() {
                  self.grayscale();
                },
              },
              mosaic: {
                className: "Button",
                arguments: {
                  text: "モザイク",
                },
                x: 320,
                y: 460,
                onclick: function() {
                  self.mosaic();
                },
              },
            },
          },
        },
      });

      this.glLayer.spriteDrawer.addObjType("background", {
        texture: phigl.ImageUtil.resizePowOf2("background", true, true),
        count: 1,
      });
      this.glLayer.spriteDrawer.addObjType("tomapiko", {
        texture: phigl.ImageUtil.resizePowOf2("tomapiko", true, true),
        count: 2500,
      });

      var bg = this.glLayer.spriteDrawer.get("background");
      bg.spawn({
        x: 320,
        y: 480,
        scaleX: 1440,
        scaleY: 960,
        frameW: 1,
        frameH: 1,
      }).addChildTo(this.glLayer);

      this.count = 0;
    },

    zoomBlur: function() {
      var self = this;
      self.buttons.hide();
      self.buttons.children.forEach(function(b) { b.interactive = false });
      this.glLayer.tweener
        .clear()
        .set({
          zoomBlurCenterX: Math.randfloat(0, 640),
          zoomBlurCenterY: Math.randfloat(0, 960),
          zoomBlurAlpha: 0.9,
          zoomBlurStrength: 0,
        })
        .to({
          zoomBlurStrength: 5,
        }, 300)
        .to({
          zoomBlurAlpha: 0.0,
        }, 1000)
        .call(function() {
          self.buttons.show();
          self.buttons.children.forEach(function(b) { b.interactive = true });
        });
    },

    reverse: function() {
      var self = this;
      self.buttons.hide();
      self.buttons.children.forEach(function(b) { b.interactive = false });
      this.glLayer.tweener
        .clear()
        .set({
          reverse: true
        })
        .wait(1000)
        .set({
          reverse: false
        })
        .call(function() {
          self.buttons.show();
          self.buttons.children.forEach(function(b) { b.interactive = true });
        });
    },

    water: function() {
      var self = this;
      self.buttons.hide();
      self.buttons.children.forEach(function(b) { b.interactive = false });
      this.glLayer.tweener
        .clear()
        .set({
          water: true
        })
        .wait(1000)
        .set({
          water: false
        })
        .call(function() {
          self.buttons.show();
          self.buttons.children.forEach(function(b) { b.interactive = true });
        });
    },

    grayscale: function() {
      var self = this;
      self.buttons.hide();
      self.buttons.children.forEach(function(b) { b.interactive = false });
      this.glLayer.tweener
        .clear()
        .set({
          grayscale: true
        })
        .wait(1000)
        .set({
          grayscale: false
        })
        .call(function() {
          self.buttons.show();
          self.buttons.children.forEach(function(b) { b.interactive = true });
        });
    },

    mosaic: function() {
      var self = this;
      self.buttons.hide();
      self.buttons.children.forEach(function(b) { b.interactive = false });
      this.glLayer.tweener
        .clear()
        .set({
          mosaic: true
        })
        .wait(1000)
        .set({
          mosaic: false
        })
        .call(function() {
          self.buttons.show();
          self.buttons.children.forEach(function(b) { b.interactive = true });
        });
    },

    update: function() {
      (2).times(function() {
        this.spawnTomapiko();
      }.bind(this));
    },

    spawnTomapiko: function() {
      var sprite = this.glLayer.spriteDrawer.get("tomapiko");
      if (sprite) {
        sprite.age = 0;

        var scale = Math.randfloat(50, 90);
        sprite
          .spawn({
            x: -100,
            y: Math.random() * 960,
            scaleX: -scale,
            scaleY: scale,
            frameW: 1 / 6,
            frameH: 1 / 3,
          })
          .addChildTo(this.glLayer)
          .clear("enterframe")
          .on("enterframe", function(e) {
            this.x += 2;
            if (740 < this.x) {
              this.remove();
              return;
            }
            var f = (this.age / 5).floor();
            this.frameX = (1 + f % 3) / 6;
            this.age += 1;
          });
      }
    },

  });
});

phina.namespace(function() {

  phina.define("SpriteDrawer", {
    superClass: "phigl.InstancedDrawable",

    objTypes: null,
    objParameters: null,

    init: function(gl, ext) {
      this.superInit(gl, ext);

      this.objTypes = [];
      this.objParameters = {};

      var shader = phigl.Program(gl)
        .attach("sprites.vs")
        .attach("sprites.fs")
        .link();

      this
        .setProgram(shader)
        .setDrawMode(gl.TRIANGLE_STRIP)
        .setIndexValues([0, 1, 2, 3])
        .setAttributes("position", "uv")
        .setAttributeDataArray([{
          unitSize: 2,
          data: [
            //
            -0.5, +0.5,
            //
            +0.5, +0.5,
            //
            -0.5, -0.5,
            //
            +0.5, -0.5,
          ]
        }, {
          unitSize: 2,
          data: [
            //
            0, 1,
            //
            1, 1,
            //
            0, 0,
            //
            1, 0,
          ]
        }, ])
        .setInstanceAttributes(
          "instanceVisible",
          "instancePosition",
          "instanceRotation",
          "instanceScale",
          "instanceFrame",
          "instanceColor"
        )
        .setUniforms(
          "vpMatrix",
          "texture"
        );

      var instanceStride = this.instanceStride / 4;
    },

    addObjType: function(objName, options) {
      options = {}.$extend({
        className: "GLSprite",
        count: 1,
        texture: null,
        additiveBlending: false,
      }, options);

      if (!this.objTypes.contains(objName)) {
        var self = this;
        var instanceStride = this.instanceStride / 4;

        this.objTypes.push(objName);
        var objParameter = this.objParameters[objName] = {
          count: options.count,
          instanceVbo: phigl.Vbo(this.gl, this.gl.DYNAMIC_DRAW),
          texture: phigl.Texture(this.gl, options.texture),
          pool: null,
          additiveBlending: options.additiveBlending,
          instanceData: Array.range(options.count).map(function(i) {
            return [
              // visible
              0,
              // position
              0, 0,
              // rotation
              0,
              // scale
              0, 0,
              // frame
              0, 0, 0, 0,
              // rgba
              0, 0, 0, 0,
            ];
          }).flatten(),
        };

        var ObjClass = phina.using(options.className);
        objParameter.pool = Array.range(options.count).map(function(id) {
          return ObjClass(id, objParameter.instanceData, instanceStride)
            .on("removed", function() {
              objParameter.pool.push(this);
            });
        });
      }
    },

    get: function(objName) {
      return this.objParameters[objName].pool.shift();
    },

    render: function(uniforms) {
      if (this.objTypes.length === 0) return;

      var gl = this.gl;

      if (uniforms) {
        uniforms.forIn(function(key, value) {
          if (this.uniforms[key]) this.uniforms[key].value = value;
        }.bind(this));
      }
      var self = this;
      this.objTypes.forEach(function(objName) {
        var objParameter = self.objParameters[objName];

        if (objParameter.additiveBlending) {
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        } else {
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }

        self.setInstanceAttributeVbo(
          objParameter.instanceVbo.set(objParameter.instanceData)
        );
        self.uniforms.texture.setValue(0).setTexture(objParameter.texture);
        self.draw(objParameter.count);
      });
    },
  });

});

//# sourceMappingURL=all.js.map
