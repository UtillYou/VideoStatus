var gulp = require('gulp');
var uglify = require('gulp-uglify');
var less = require('gulp-less');
var cssmin = require('gulp-cssmin');
var rename = require('gulp-rename');

gulp.task('js', function() {
  return gulp.src('video-status.js')
    .pipe(uglify())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('dist'));
});

gulp.task('less', function() {
  return gulp.src('video-status.less')
    .pipe(less().on('error', function(err) {
      /* eslint {no-console:off} */
      console.log(err);
    }))
    .pipe(cssmin().on('error', function(err) {
      console.log(err);
    }))
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['less', 'js']);
