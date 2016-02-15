"use strict"

require("string-utils-cwm");
require("./object-assign");

/**
 * config.js - finds all the config values for this app
 *
 * NOTE: lib's should not process.exit. We are breaking
 *  than rule in this file. Also we are blocking (not async)
 *  and waiting until we find/open/use the files we need.
 *  This shouldn't be used on a server or anywhere except
 *  CLI (command line interface) by a user.
 *
 */
var path = require("path");

// need polyfill
var _ = Object.assign({},
  require("./file-utils"),
  require("./utils")
);

// exports' signature
var config = {
  slack_token: "",
  channel: "",
  room_id: null,
  members: [],
  editor: "",
  editor_args: [],
  directory: ".reporting"
};

// looking for reporting directory in $HOME
var $home = path.resolve(process.env.HOME);
var prefs_file = path.join($home, ".slackrc.json");
var reporting_dir = path.join($home, config.directory);

// if not ok - exit
if (!_.dirIsWritable(reporting_dir)) {
  console.log("Error: required directory '{0}' not found or not writable!".format(reporting_dir));
  process.exit(1);
}

// if not ok - exit
if (!_.fileIsReadable(prefs_file)) {
  console.log("Error: required preference file '{0}' not found or not readable!".format(prefs_file));
  process.exit(1);
}

// else import in prefs file
var prefs = {};
try {
  prefs = require(prefs_file);
}
catch (e) {
  // if not ok - exit (gives user feed back on parse errors)
  console.log("Error# parsing preference file :{0}".format(e.message).replace(/:/, "'").replace(/:/, "'").replace(/#/, ":"));
  process.exit(1);
}

// populate config from ENV, root, reporting
//
Object.keys(config)
  .map(function(prop) {
    // env using uppercase values
    if (_.isDefined(process.env[prop.toUpperCase()])) {
      config[prop] = process.env[prop.toUpperCase()];
    }

    // top level of rc file
    if (_.isDefined(prefs[prop])) {
      config[prop] = prefs[prop];
    }
    // reporting level of rc file
    if (_.isDefined(prefs.reporting) && _.isDefined(prefs.reporting[prop])) {
      config[prop] = prefs.reporting[prop];
    }

    // if not set ~ get out
    if (config[prop] === "") {
      console.log("Error: required preference '{0}' not found in file '{1}' or as uppercase in ENV!".format(prop, prefs_file));
      process.exit(1);
    }
    return prop;
  });

// special case for editor with options ex: `vim -u /home/user/file`
if (/[ ]/.test(config.editor)) {
  var parts = config.editor.split(/[ ]+/g);

  // editor is the first one, args are the other
  config.editor = parts.shift();
  config.editor_args = parts;
}

// are we in a tmux session
if (process.env.TMUX || process.env.TMUX_PANE) {
  // gonna launch sublime
  if (/(?:slime|subl|sublime)/.test(config.editor)) {
    config.editor_args.unshift(config.editor);
    config.editor = "reattach-to-user-namespace";
  }
}

// export the config out ... note this is all sync (not async) and will block
//
module.exports = config;
