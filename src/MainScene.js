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
