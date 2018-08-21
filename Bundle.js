// Bundle up the library for use in a browser.
//
var libFS = require("fs");

var libBrowserify = require("browserify");

libBrowserify("./source/CashMoney.js")
  .transform("babelify")
  .bundle()
  .pipe(libFS.createWriteStream("./lib/CashMoney-Browser.js"));