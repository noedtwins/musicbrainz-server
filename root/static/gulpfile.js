const fs = require('fs');
const gulp = require('gulp');
const less = require('gulp-less');
const rev = require('gulp-rev');
const streamify = require('gulp-streamify');
const _ = require('lodash');
const path = require('path');
const po2json = require('po2json');
const Q = require('q');
const shellQuote = require('shell-quote');
const shell = require('shelljs');
const through2 = require('through2');
const File = require('vinyl');
const source = require('vinyl-source-stream');
const yarb = require('yarb');

const {findObjectFile} = require('../server/gettext');
const DBDefs = require('./scripts/common/DBDefs');

const CACHED_BUNDLES = {};
const CHECKOUT_DIR = path.resolve(__dirname, '../../');
const PO_DIR = path.resolve(CHECKOUT_DIR, 'po');
const ROOT_DIR = path.resolve(CHECKOUT_DIR, 'root');
const STATIC_DIR = path.resolve(ROOT_DIR, 'static');
const BUILD_DIR = path.resolve(STATIC_DIR, 'build');
const SCRIPTS_DIR = path.resolve(STATIC_DIR, 'scripts');
const IMAGES_DIR = path.resolve(STATIC_DIR, 'images');

const revManifestPath = path.resolve(BUILD_DIR, 'rev-manifest.json');
const revManifest = {};

const JED_OPTIONS_EN = {
  domain: 'mb_server',
  locale_data: {
    mb_server: {'': {}},
  },
};

function writeManifest() {
  fs.writeFileSync(revManifestPath, JSON.stringify(revManifest));
}

function writeResource(stream, baseDir) {
  var deferred = Q.defer();

  if (!baseDir) {
    baseDir = '/build/';
  }

  stream
    .pipe(streamify(rev()))
    .pipe(gulp.dest(BUILD_DIR))
    .pipe(rev.manifest())
    .pipe(through2.obj(function (chunk, encoding, callback) {
      const contents = JSON.parse(chunk.contents)
      Object.keys(contents).forEach(function (src) {
        contents[path.join(baseDir, path.basename(src))] = contents[src];
        delete contents[src];
      });
      _.assign(revManifest, contents);
      callback();
    }))
    .on('finish', function () {
      deferred.resolve();
    });

  return deferred.promise;
}

function buildStyles(callback) {
  return writeResource(
    gulp.src(path.resolve(STATIC_DIR, '*.less'))
    .pipe(less({
      rootpath: '/static/',
      relativeUrls: true,
      plugins: [
        new (require('less-plugin-clean-css'))({compatibility: 'ie8'})
      ]
    }))
  ).done(callback);
}

function transformBundle(bundle) {
  bundle.transform('babelify');
  bundle.transform('envify', {global: true});

  if (!DBDefs.DEVELOPMENT_SERVER) {
    bundle.transform('uglifyify', {
      // See https://github.com/substack/node-browserify#btransformtr-opts
      global: true,

      // Uglify options
      output: {
        comments: /@preserve|@license/,
        max_line_len: 256
      },

      sourcemap: false
    });
  }

  return bundle;
}

function runYarb(resourceName, callback) {
  if (CACHED_BUNDLES[resourceName]) {
    return CACHED_BUNDLES[resourceName];
  }

  var bundle = transformBundle(yarb(path.resolve(SCRIPTS_DIR, resourceName), {
    debug: DBDefs.DEVELOPMENT_SERVER,
  }));

  if (callback) {
    callback(bundle);
  }

  CACHED_BUNDLES[resourceName] = bundle;
  return bundle;
}

function bundleScripts(b, resourceName) {
  return b.bundle().on('error', console.log).pipe(source(resourceName));
}

function writeScript(b, resourceName) {
  return writeResource(bundleScripts(b, resourceName));
}

function createLangVinyl(lang, jedOptions) {
  return new File({
    path: path.resolve(SCRIPTS_DIR, `jed-${lang}.js`),
    contents: new Buffer('module.exports = ' + JSON.stringify(jedOptions) + ';\n'),
  });
}

function langToPosix(lang) {
  return lang.replace(/^([a-zA-Z]+)-([a-zA-Z]+)$/, function (match, l, c) {
    return l + '_' + c.toUpperCase();
  });
}

function buildScripts() {
  process.env.NODE_ENV = DBDefs.DEVELOPMENT_SERVER ? 'development' : 'production';

  var commonBundle = runYarb('common.js');

  _((DBDefs.MB_LANGUAGES || '').replace(/\s+/g, ''))
    .split(',')
    .compact()
    .without('en')
    .map(langToPosix)
    .transform(function (result, lang) {
      var srcPo = shellQuote.quote([findObjectFile('mb_server', lang, 'po')]);
      var tmpPo = shellQuote.quote([path.resolve(PO_DIR, `javascript.${lang}.po`)]);

      // msggrep's -N option supports wildcards which use fnmatch internally.
      // The '*' cannot match path separators, so we must generate a list of
      // possible terminal paths.
      let scriptsDir = shellQuote.quote([SCRIPTS_DIR]);
      let nestedDirs = shell.exec(`find ${scriptsDir} -type d`, {silent: true}).output.split('\n');
      let msgLocations = _(nestedDirs)
        .compact()
        .map(dir => '-N ' + shellQuote.quote(['..' + dir.replace(CHECKOUT_DIR, '') + '/*.js']))
        .join(' ');

      // Create a temporary .po file containing only the strings used by root/static/scripts.
      shell.exec(`msggrep ${msgLocations} ${srcPo} -o ${tmpPo}`);

      result[lang] = po2json.parseFileSync(tmpPo, {format: 'jed1.x', domain: 'mb_server'});

      fs.unlinkSync(tmpPo);
    }, {})
    .assign({en: JED_OPTIONS_EN})
    .each(function (jedOptions, lang) {
      var bundle = transformBundle(yarb().expose(createLangVinyl(lang, jedOptions), 'jed-data'));
      commonBundle.external(bundle);
      writeScript(bundle, 'jed-' + lang + '.js');
    })
    .value();

  var editBundle = runYarb('edit.js', function (b) {
    b.external(commonBundle);
  });

  var editNotesReceivedBundle = runYarb('edit/notes-received.js', function (b) {
    b.external(commonBundle);
  });

  var guessCaseBundle = runYarb('guess-case.js', function (b) {
    b.external(commonBundle);
  });

  var placeBundle = runYarb('place.js', function (b) {
    b.external(editBundle).external(guessCaseBundle);
  });

  var releaseEditorBundle = runYarb('release-editor.js', function (b) {
    b.external(commonBundle).external(editBundle);
  });

  var seriesBundle = runYarb('series.js', function (b) {
    b.external(editBundle).external(guessCaseBundle);
  });

  var statisticsBundle = runYarb('statistics.js', function (b) {
    b.external(commonBundle);
  });

  var timelineBundle = runYarb('timeline.js', function (b) {
    b.external(commonBundle);
  });

  var urlBundle = runYarb('url.js', function (b) {
    b.external(editBundle);
  });

  var votingBundle = runYarb('voting.js', function (b) {
    b.external(commonBundle);
  });

  var workBundle = runYarb('work.js', function (b) {
    b.external(editBundle).external(guessCaseBundle);
  });

  return Q.all([
    writeScript(commonBundle, 'common.js'),
    writeScript(editBundle, 'edit.js'),
    writeScript(editNotesReceivedBundle, 'edit-notes-received.js'),
    writeScript(guessCaseBundle, 'guess-case.js'),
    writeScript(placeBundle, 'place.js'),
    writeScript(releaseEditorBundle, 'release-editor.js'),
    writeScript(seriesBundle, 'series.js'),
    writeScript(statisticsBundle, 'statistics.js'),
    writeScript(timelineBundle, 'timeline.js'),
    writeScript(urlBundle, 'url.js'),
    writeScript(votingBundle, 'voting.js'),
    writeScript(workBundle, 'work.js'),
    writeScript(runYarb('debug.js', function (b) {
      b.external(commonBundle);
    }), 'debug.js')
  ]).then(writeManifest);
}

function buildImages() {
  return Q.all([
    writeResource(gulp.src(path.join(IMAGES_DIR, 'entity/*')), '/images/entity/'),
    writeResource(gulp.src(path.join(IMAGES_DIR, 'icons/*')), '/images/icons/'),
    writeResource(gulp.src(path.join(IMAGES_DIR, 'image404-125.png')), '/images/'),
    writeResource(gulp.src(path.join(IMAGES_DIR, 'layout/*')), '/images/layout/'),
    writeResource(gulp.src(path.join(IMAGES_DIR, 'licenses/*')), '/images/licenses/'),
    writeResource(gulp.src(path.join(IMAGES_DIR, 'logos/*')), '/images/logos/'),
  ]).then(writeManifest);
}

gulp.task('styles', function () {
  return buildStyles(writeManifest);
});

gulp.task('scripts', buildScripts);

gulp.task('images', buildImages);

gulp.task('watch', ['styles', 'scripts'], function () {
  let watch = require('gulp-watch');

  watch(path.resolve(STATIC_DIR, '**/*.less'), function () {
    process.stdout.write('Rebuilding styles ... ');

    buildStyles(function () {
      writeManifest();
      process.stdout.write('done.\n');
    });
  });

  function rebundle(b, resourceName, file) {
    var rebuild = false;

    switch (file.event) {
      case 'add':
        rebuild = true;
        break;
      case 'change':
      case 'unlink':
        rebuild = b.has(file.path);
        break;
    }

    if (rebuild) {
      process.stdout.write(`Rebuilding ${resourceName} (${file.event}: ${file.path}) ... `);
      writeScript(b, resourceName).done(function () {
        writeManifest();
        process.stdout.write('done.\n');
      });
    }
  }

  watch(path.resolve(SCRIPTS_DIR, '**/*.js'), function (file) {
    _.each(CACHED_BUNDLES, function (bundle, resourceName) {
      rebundle(bundle, resourceName, file);
    });
  });
});

gulp.task('tests', function () {
  process.env.NODE_ENV = 'development';

  return bundleScripts(
    runYarb('tests/browser-runner.js', function (b) {
      b.expose(createLangVinyl('en', JED_OPTIONS_EN), 'jed-data');
    }),
    'tests.js'
  ).pipe(gulp.dest(BUILD_DIR));
});

gulp.task('default', ['styles', 'scripts', 'images']);
