var gulp = require("gulp");
var concat = require("gulp-concat");
var sourcemaps = require("gulp-sourcemaps");
var watch = require("gulp-watch");

gulp.task("default", ["concat", "watch"]);

gulp.task("concat", function() {
  gulp.src("src/*")
    .pipe(sourcemaps.init())
    .pipe(concat("all.js"))
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest("./"));
});

gulp.task("watch", function() {
  gulp.watch("src/*", ["concat"]);
});
