#!/usr/bin/env node
"use strict"

require("string-utils-cwm");
require("./lib/object-assign");

var Config = require("./lib/config.js"); // blocking lib

var Dt = require("./lib/date-utils");
var Colors = require("colors");
var isDefined = require("./lib/utils").isDefined;

var SlackUtils = require("./lib/slack-utils");
var slack_utils = new SlackUtils(Config);

var argv = require("yargs").
  alias({
    "d"    : "daily",   // daily report
    "hist" : "history", // full daily json
    "rc"   : "slackrc", // generate slackrc
    "room" : "room",    // find channel
    "users": "users",   // find members of a channel
  }).
  argv;


var Log = function() {
  if (argv.file) {
    // write to file
    console.log.apply(null, arguments);
  }
  else {
    console.log.apply(null, arguments);
  }
}

var app = {
  room: function(argv) {
    slack_utils.find_room(argv.room, function(room) {
      Log( JSON.stringify(room, null, 2) );
    })
  },
  users: function(argv) {
    slack_utils.find_members(argv.users, function(users) {
      Log( JSON.stringify(users, null, 2) );
    })
  },
  slackrc: function(argv) {
    slack_utils.slackrc(argv.slackrc, function(slackrc) {
      var prefs = Object.assign({},
        Config.prefs,
        {reporting: slackrc}
      );
      Log( JSON.stringify(prefs, null, 2) );
    });
  },
  history: function(argv) {
    slack_utils.history(argv.history, argv.date, function(history) {
      Log( JSON.stringify(history, null, 2) );
    });
  },
  daily: function(argv) {
    slack_utils.daily(argv.daily, argv.date, function(payload, members, parse_today, parse_blockers) {
      if (payload && payload.ok && payload.messages && payload.messages.length) {
        var reporting_members = {};
        Object.keys(Config.members).forEach(function(key) {
          if (Config.members[key].report) {
            reporting_members[key] = Object.assign({}, Config.members[key], {reported: false});
          }
        });

        payload.messages.forEach(function(message) {
          var m = reporting_members[message.user];
          if (isDefined(m) && !m.reported && /Status Update/i.test(message.text)) {
            var today = parse_today(message.attachments);
            var blockers = parse_blockers(message.attachments);

            Log(Dt.h_mm_ampm(+message.ts), "-", m.handle, "<{0}>".format(m.real_name || m.email))
            Log(today.join("\n"));
            blockers.length && Log(Colors.red("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"));
            blockers.length && Log(Colors.red(blockers.join("\n")));
            Log("");

            m.reported = true;
          }
        });

        payload.messages.forEach(function(message) {
          var m = reporting_members[message.user];
          if (isDefined(m) && !m.reported && /Update.*\n/i.test(message.text)) {
            var today = message.text.split(/\n/g);

            Log(m.handle, "<{0}>".format(m.real_name || m.email))
            Log(today.join("\n"));
            Log("");

            m.reported = true;
          }
        });

        Log("Not Reported:");
        Object.keys(reporting_members).forEach(function(key) {
          var m = reporting_members[key];
          if (!m.reported) {
            Log(" ", m.handle, "<{0}>".format(m.real_name || m.email))
          }
        });
      }
    });
  }
};


//
// main
//


if (isDefined(argv.daily)) {
  if (!isDefined(argv.date)) {
    if (argv.daily !== true && /^\d{4}\-\d{1,2}\-\d{1,2}$/.test(argv.daily)) {
      argv.date = argv.daily;
      argv.daily = true;
    }
    else {
      argv.date = Dt.dates[0].yyyy_mm_dd;
    }
  }
  app.daily(argv);
}

if (isDefined(argv.history)) {
  if (!isDefined(argv.date)) {
    if (argv.history !== true && /^\d{4}\-\d{1,2}\-\d{1,2}$/.test(argv.history)) {
      argv.date = argv.history;
      argv.history = true;
    }
    else {
      argv.date = Dt.dates[0].yyyy_mm_dd;
    }
  }
  app.history(argv);
}

if (isDefined(argv.room)) {
  app.room(argv);
}

if (isDefined(argv.users)) {
  app.users(argv);
}

if (isDefined(argv.slackrc)) {
  app.slackrc(argv);
}


/*

// create one from scratch and open it
fs.writeFileSync(Config.standup_file, JSON5.stringify(blank_standup, null, 2), "utf8");

// launch editor
var editor = editor = _.exec(Config.editor, [].concat(Config.editor_args, Config.standup_file), {stdio: "inherit"});

// failed to launch editor
if (editor.status !== 0) {
  // if not ok - exit
  Log(_.format("Error: trying to launch editor: `%s %s %s`", Config.editor, Config.editor_args.join(" "), Config.standup_file));
  process.exit(1);
}

*/
