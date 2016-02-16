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
    "w"    : "weekly",  // weekly report
    "d"    : "daily",   // daily report
    "hist" : "history", // full daily json
    "rc"   : "slackrc", // generate slackrc
    "room" : "room",    // find channel
    "users": "users",   // find members of a channel
    "u"    : "user",
    "h"    : "help"
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
};

var app = {
  room: function(argv) {
    slack_utils.find_room(argv.room, function(room) {
      Log( JSON.stringify(room, null, 2) );
    })
  },
  users: function(argv) {
    slack_utils.find_users(argv.users, function(users) {
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
  weekly: function(argv) {
    var i = 0;
    var dates = [];

    while (dates.length < 6) {
      var dt = Dt.dates[i];
      !dt.is_weekend && dates.push(dt.yyyy_mm_dd);
      i++;
    };

    // async hell
    var self = this;
    self.daily({daily: argv.weekly, date: dates[0], user: argv.user}, function() {
      self.daily({daily: argv.weekly, date: dates[1], user: argv.user}, function() {
        self.daily({daily: argv.weekly, date: dates[2], user: argv.user}, function() {
          self.daily({daily: argv.weekly, date: dates[3], user: argv.user}, function() {
            self.daily({daily: argv.weekly, date: dates[4], user: argv.user}, function() {
              self.daily({daily: argv.weekly, date: dates[5], user: argv.user}, function() {
              })
            })
          })
        })
      })
    });
  },
  daily: function(argv, callback) {
    var check_id = function(user) {
      return user === this.handle || user === this.id || user === this.email || "@{0}".format(user) === this.handle;
    };

    slack_utils.daily(argv.daily, argv.date, function(payload, members_not_used, parse_today, parse_blockers) {
      if (payload && payload.ok && payload.messages && payload.messages.length) {
        var reporting_members = {};
        Object.keys(Config.members).forEach(function(key) {
          if (Config.members[key].report) {
            reporting_members[key] = Object.assign({}, Config.members[key], {id: key, reported: false, check_id: check_id});
          }
        });

        payload.messages.forEach(function(message) {
          var m = reporting_members[message.user];
          if (isDefined(m) && !m.reported && /Status Update/i.test(message.text)) {
            var today = parse_today(message.attachments);
            var blockers = parse_blockers(message.attachments);

            if (!argv.user || m.check_id(argv.user)) {
              if (argv.user) {
                Log(Dt.yyyy_mm_dd(+message.ts), Dt.h_mm_ampm(+message.ts), "-", m.handle, "<{0}>".format(m.real_name || m.email))
              }
              else {
                Log(Dt.h_mm_ampm(+message.ts), "-", m.handle, "<{0}>".format(m.real_name || m.email))
              }
              Log(today.join("\n"));
              blockers.length && Log(Colors.red("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"));
              blockers.length && Log(Colors.red(blockers.join("\n")));
              Log("");
            }

            m.reported = true;
          }
        });

        payload.messages.forEach(function(message) {
          var m = reporting_members[message.user];
          if (isDefined(m) && !m.reported && /Update.*\n/i.test(message.text)) {
            var today = message.text.split(/\n/g);

            if (!argv.user || m.check_id(argv.user)) {
              Log(m.handle, "<{0}>".format(m.real_name || m.email))
              Log(today.join("\n"));
              Log("");
            }

            m.reported = true;
          }
        });

        if (!argv.user) {
          Log("Not Reported:");
          Object.keys(reporting_members).forEach(function(key) {
            var m = reporting_members[key];
            if (!m.reported) {
              Log(" ", m.handle, "<{0}>".format(m.real_name || m.email))
            }
          });
          Log("");
        }

        isDefined(callback) && callback()
      }
    });
  },
  help: function(/* argv */) {
    console.log([
      "Usage:",
      Colors.blue("  $ node index.js"),
      Colors.blue("  $ node index.js --help"),
      Colors.blue("  $ node index.js -h"),
      Colors.grey("  >"),
      Colors.grey("  > Shows this message"),
      Colors.grey("  >"),
      "",
      Colors.blue("  $ node index --room #sams-ui-status"),
      Colors.grey("  >"),
      Colors.grey("  > Displays JSON object of room (from channel.list)"),
      Colors.grey("  >"),
      "",
      Colors.blue("  $ node index --users U024L5T1F,U024LTMR9"),
      Colors.grey("  >"),
      Colors.grey("  > Displays JSON object of user objects (from users.list)"),
      Colors.grey("  >"),
      "",
      Colors.blue("  $ node index --slackrc #sams-ui-status"),
      Colors.grey("  >"),
      Colors.grey("  > Displays JSON to replace current .slackrc.json"),
      Colors.grey("  >"),
      "",
      Colors.blue("  $ node index --history #sams-ui-status --date 2016-02-01"),
      Colors.grey("  >"),
      Colors.grey("  > Displays JSON object of the channel's history (from channels.history)"),
      Colors.grey("  >"),
      "",
      Colors.blue("  $ node index --daily #sams-ui-status --date 2016-02-01"),
      Colors.blue("  $ node index -d 2016-02-01"),
      Colors.blue("  $ node index -d"),
      Colors.grey("  >"),
      Colors.grey("  > Displays daily report summary"),
      Colors.grey("  >"),
      "",
      Colors.blue("  $ node index --weekly #sams-ui-status --user @casey"),
      Colors.blue("  $ node index -wu @casey"),
      Colors.grey("  >"),
      Colors.grey("  > Displays weekly report summary for user "),
      Colors.grey("  >"),
      Colors.grey("  > Note: user's report property needs to be true in slackrc"),
      Colors.grey("  >"),
      ""
    ].join("\n"));
  }
};


//
// main
//
//


if (isDefined(argv.weekly)) {
  if (!isDefined(argv.user)) {
    throw new Error("Error: need user for weekly report.");
  }
  app.weekly(argv);
}

var re_date = /^\d{4}\-\d{1,2}\-\d{1,2}$/;

if (isDefined(argv.daily)) {
  if (!isDefined(argv.date)) {
    if (re_date.test(argv.daily)) {
      argv.date = argv.daily, argv.daily = true;
    }
    else {
      argv.date = Dt.dates[0].yyyy_mm_dd;
    }
  }
  app.daily(argv);
}

if (isDefined(argv.history)) {
  if (!isDefined(argv.date)) {
    if (re_date.test(argv.history)) {
      argv.date = argv.history, argv.history = true;
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

if (isDefined(argv.help) || Object.keys(argv).length < 3) {
  app.help(argv);
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
