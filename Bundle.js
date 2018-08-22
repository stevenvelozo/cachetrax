// Bundle up the library for use in a browser.
//
var libFS = require("fs");

var libBrowserify = require("browserify");

libBrowserify("./source/CacheTrax.js")
  .transform("babelify")
  .bundle()
  .pipe(libFS.createWriteStream("./lib/CacheTrax-Browser.js"));