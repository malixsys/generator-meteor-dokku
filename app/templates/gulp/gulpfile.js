var gulp = require('gulp');
var argv = require('minimist')(process.argv.slice(2));
var git = require('gulp-git');
var shell = require('gulp-shell');
var bump = require('gulp-bump');
var conventionalChangelog = require('gulp-conventional-changelog');
var runSequence = require('run-sequence');
var fs = require('fs');

gulp.task('set-release-packages', shell.task([
  'meteor remove insecure',
  'meteor remove autopublish',
  'meteor remove msavin:mongol',
], {ignoreErrors: true}));

gulp.task('set-dev-packages', shell.task([
  'meteor add msavin:mongol',
], {ignoreErrors: true}));

gulp.task('run-local', shell.task([
  'meteor run --settings ../settings.json',
]));

gulp.task('bump', function() {
  gulp.src('../settings.json')
  .pipe(bump({key: "public.<%= name %>.version", type: argv.bump}))
  .pipe(gulp.dest('../'));
  gulp.src('./package.json')
  .pipe(bump({key: "version", type: argv.bump}))
  .pipe(gulp.dest('./'));
});

gulp.task('changelog', function () {
  return gulp.src('../CHANGELOG.md')
    .pipe(conventionalChangelog({
      preset: 'angular',
    }))
    .pipe(gulp.dest('../'));
});

gulp.task('tag-release', function (cb) {
  var version = getPackageJsonVersion();
  git.tag('v' + version, 'Created Tag for version: ' + version, function (error) {
    if (error) {
      return cb(error);
    }
  });
  git.push('origin', 'master', {args: '--tags'}, cb);
  function getPackageJsonVersion () {
    // We parse the json file instead of using require because require caches
    // multiple calls so the version number won't be updated
    return JSON.parse(fs.readFileSync('./package.json', 'utf8')).version;
  }
});

gulp.task('commit-changes', function () {
  return gulp.src('../')
    .pipe(git.add())
    .pipe(git.commit('chore: bump version number'));
});

gulp.task('push-changes', function (cb) {
  git.push('origin', 'master', cb);
});


gulp.task('deploy-dokku', function(cb) {
  console.log('Edit .gulp/gulpfile.js to deploy to Dokku/Heroku!');
  //git.push('dokku', 'master', cb);
});

gulp.task('run', ['set-dev-packages', 'run-local']);

gulp.task('release', function (callback) {
  runSequence(
    'set-release-packages',
    'bump',
    'changelog',
    'commit-changes',
    'push-changes',
    'tag-release',
    'deploy-dokku',
    function (error) {
      if (error) {
        console.log(error.message);
      } else {
        console.log('RELEASE FINISHED SUCCESSFULLY');
      }
      callback(error);
    });
});
