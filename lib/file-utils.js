"use strict"

var fs = require("fs");

// file-utils
module.exports = {};

/**
 *
 * dirIsWritable - check path to see if exists and is writable ~ not async
 *
 */
module.exports.dirIsWritable = function(path) {
  var baseStatObj = {
    isDirectory: function() {
      return false;
    }
  }

  // test to see if directory exists
  var dirStat = baseStatObj;
  try {
    dirStat = fs.statSync(path);
  }
  catch (e_not_used) {
    dirStat = baseStatObj;
  }

  // test to see if directory is read/write
  var dirOk = dirStat.isDirectory();
  if (dirOk) {
    try {
      fs.accessSync(path, fs.R_OK | fs.W_OK);
    }
    catch (e_not_used) {
      dirOk = false;
    }
  }

  // node v0.10 is a bit worse
  if (!dirOk && /^v0.10/.test(process.version)) {
    var test_file = path + "/test.txt";
    var test_test = "test";
    try {
      fs.writeFileSync(test_file, "test", "utf8");
      if (test_test === fs.readFileSync(test_file, {encoding: "utf8"})) {
        dirOk = true;
      }
      fs.unlinkSync(test_file);
    }
    catch (e_not_used) {
      dirOk = false;
    }
  }

  return dirOk;
};


/**
 *
 * fileIsReadable - check path to see if exists and is readable ~ not async
 *
 */
module.exports.fileIsReadable = function(path) {
  var baseStatObj = {
    isFile: function() {
      return false;
    }
  }

  // test to see if directory exists
  var fileStat = baseStatObj;
  try {
    fileStat = fs.statSync(path);
  }
  catch (e_not_used) {
    fileStat = baseStatObj;
  }

  // test to see if directory is read/write
  var fileOk = fileStat.isFile();
  if (fileOk) {
    try {
      fs.accessSync(path, fs.R_OK | fs.W_OK);
    }
    catch (e_not_used) {
      fileOk = false;
    }
  }

  // node v0.10 is a bit worse
  if (!fileOk && /^v0.10/.test(process.version)) {
    try {
      if (fs.readFileSync(path, {encoding: "utf8"})) {
        fileOk = true;
      }
    }
    catch (e_not_used) {
      fileOk = false;
    }
  }

  return fileOk;
};
