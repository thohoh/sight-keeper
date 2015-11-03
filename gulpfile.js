'use strict';

// Gulp Dependencies
var gulp = require('gulp');
var rename = require('gulp-rename');

// Build Dependencies
var browserify = require('browserify');
var sass = require('gulp-sass');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');

// Development Dependencies
var jshint = require('gulp-jshint');
var gutil = require('gulp-util');
var sourcemaps = require('gulp-sourcemaps');

// Test Dependencies
var mochaPhantomjs = require('gulp-mocha-phantomjs');

// Release Dependecies
var strip = require('gulp-strip-debug');
var uglify = require('gulp-uglify');


// Setup
/******************************************************************************/

var bg = {
    src : ['src/js/bg.js'],
    devName: 'background-bundle.js',
    devOpts: {
        entries: ['src/js/bg.js'],
        debug: true
    },
    devDest: 'build/dev/js/',
    prodName: 'background.js',
    prodDest: 'dist/js/'

};

var popup = {
    src: ['src/js/popup.js'],
    devName: 'popup-bundle.js',
    devOpts: {
        entries: ['src/js/popup.js'],
        debug: true
    },
    devDest: 'build/dev/js/',
    prodName: 'popup.js',
    prodDest: 'dist/js/'
};


var test = {
    src : ['test/index.js'],
    devName: 'test-bundle.js',
    devOpts: {
        entries: ['test/index.js'],
        debug: true
    },
    devDest: 'build/dev/js/',
    html: 'test/index.html'
};

var scss = {
    input : 'src/scss/**/*.scss',
    output: 'build/dev/css',
    options: {
        errLogToConsole: true,
        outputStyle: 'expanded'
    }
};


var browserifyOnError = function (err) {
    gutil.log(gutil.colors.red('browserify task ' + err.name + ': ' + err.message));
    this.emit('end');
};



// Tasks
/****************************************************************************/
// Lint
gulp.task('lint-src', function () {
     return gulp.src('src/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('lint-test', function () {
     return gulp.src('test/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});


// Browserify
gulp.task('browserify-bg', ['lint-src'], function () {
     return browserify(bg.devOpts)
    .bundle()
    .on('error', browserifyOnError)
    .pipe(source(bg.devName))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(bg.devDest));
});

gulp.task('browserify-popup', ['lint-src'], function () {
    return browserify(popup.devOpts)
        .bundle()
        .on('error', browserifyOnError)
        .pipe(source(popup.devName))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(popup.devDest));
});

gulp.task('browserify-test', ['lint-test'], function () {
     return browserify(test.devOpts)
    .bundle()
    .on('error', browserifyOnError)
    .pipe(source(test.devName))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(test.devDest));
});

// Sass
gulp.task('sass', function () {
   return gulp.src(scss.input)
       .pipe(sourcemaps.init())
       .pipe(sass(scss.options)).on('error', sass.logError)
       .pipe(sourcemaps.write())
       .pipe(gulp.dest(scss.output));
});

// Test
gulp.task('test', ['lint-test', 'browserify-test'], function () {
     return gulp.src(test.html)
    .pipe(mochaPhantomjs({
             reporter: 'dot',
             phantomjs: {
                useColors: true
                }
         }))
    .on('error', gutil.log);
});

gulp.task('watch', function () {
    gulp.watch('src/**/*.js', ['lint-src', 'browserify-bg', 'browserify-popup', 'browserify-test','test']);
    gulp.watch('test/*.js', ['lint-test','lint-src', 'browserify-test', 'test']);
    gulp.watch('src/**/*.scss', ['sass']);
});


gulp.task('default', ['browserify-bg', 'browserify-test', 'test']);

// Release
gulp.task('release', function () {
   return gulp.src(bg.devDest + bg.devName)
   .pipe(strip())
   .pipe(uglify())
   .on('error', gutil.log)
   .pipe(rename(bg.prodName))
   .pipe(gulp.dest(bg.prodDest));
});

