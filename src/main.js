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
