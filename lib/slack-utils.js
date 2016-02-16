"use strict"

require("string-utils-cwm");
require("./object-assign");

var Fs = require("fs");
var Path = require("path");
var Url = require("url");
var Request = require("request");
var Dt = require("./date-utils");

var SlackUtils = function(config) {
  if (!config || !config.slack_token) {
    throw new Error("No slack token");
  }
  this.config = config;
};

SlackUtils.prototype = {
  _file_name: function(url) {
    var url_parts = Url.parse(url, true);
    var file_name = url_parts.pathname.replace(/[/]/g, ".").replace(/^\.(?:api\.)?|\.$/g, "");

    switch (file_name) {
      case "channels.list":
      case "users.list":
        file_name += ".json";
        break;

      case "channels.history":
        var query = url_parts.query;
        var current = Dt.dates[0].epoch_start;

        if (query.channel && query.oldest && (+query.oldest !== current)) {
          file_name = "{file_name}.{channel}.{oldest}.json".format({
            file_name: file_name,
            channel: query.channel,
            oldest: Dt.yyyy_mm_dd(+query.oldest)
          })
        }
        else {
          file_name = "";
        }

      default:
    };

    return file_name;
  },

  _cache_get: function(file_path) {
    var data = "";

    try {
      data = Fs.readFileSync(file_path, {encoding: "utf8"});
    }
    catch(e_not_used) {
      data = "";
    }

    return data;
  },

  _http_get: function(url, callback, no_cache) {
    var file_name = this._file_name(url);

    var file_path = file_name ? Path.join(process.env.HOME, this.config.directory, file_name) : "";

    var data = file_path && !no_cache ? this._cache_get(file_path) : "";
    if (data) {
      callback(JSON.parse(data));
    }
    else {
      Request.get({url: url, json: false}, function(error, r_not_used, data) {
        if (error) {
          callback({});
        }
        else {
          if (file_path) {
            Fs.writeFileSync(file_path, data, "utf8");
          }
          callback(JSON.parse(data));
        }
      });
    }

  },
  find_room: function(room_or_id, callback) {
    var id = "";
    var name = "";

    if (room_or_id === true) {
      id = "{room_id}".format(this.config).toUpperCase();
      name = "{channel}".format(this.config).replace(/^[#]+/, "").toLowerCase();
    }
    else if (/^[#]/.test(room_or_id)) {
      name = room_or_id.replace(/^[#]+/, "").toLowerCase();
    }
    else {
      id = room_or_id.toUpperCase();
    }

    this._http_get("https://slack.com/api/channels.list?token={slack_token}&exclude_archived=1".format(this.config), function(payload) {
      var room = {};

      if (payload && payload.ok && payload.channels && payload.channels.length) {
        payload.channels.forEach(function(channel) {
          if (!room.id) {
            if (id && id === channel.id.toLowerCase()) {
              room = channel;
            }
            if (name && name === channel.name.toLowerCase()) {
              room = channel;
            }
          }
        });
      }

      callback(room);
    });
  },
  find_users: function(users, callback) {
    if (typeof users === "string") {
      users = users.split(/\s*,\s*/g);
    }
    this._http_get("https://slack.com/api/users.list?token={slack_token}&presence=0".format(this.config), function(payload) {
      var found_users = {};

      if (users && users.length) {
        users.forEach(function(id) {
          found_users[id.toUpperCase()] = null;
        });

        if (payload && payload.ok && payload.members && payload.members.length) {
          payload.members.forEach(function(user) {
            var id = user.id.toUpperCase();

            if (found_users[id] === null) {
              found_users[id] = {
                handle: "@{name}".format(user),
                email: user.profile.email || "",
                real_name: user.real_name || "",
                report: true,
              }
              if (!user.real_name) {
                delete(found_users[id].real_name);
              }
            }
          });
        }
      }

      callback(found_users);
    });
  },
  slackrc: function(room_or_id, callback) {
    var self = this;

    this.find_room(room_or_id, function(room) {
      var members = room && room.members ? room.members : [];
      self.find_users(members, function(users) {
        callback({
          channel: "#{name}".format(room),
          room_id: "{id}".format(room),
          members: users
        });
      });
    });
  },
  history: function(room_or_id, date, callback) {
    var self = this;
    var config = this.config;

    // full users list from cache
    this.slackrc(room_or_id, function(slackrc) {
      var dt = Dt.date_object(date);

      var qs = "token={slack_token}&channel={channel}&latest={latest}&oldest={oldest}&count={count}".format({
        slack_token: config.slack_token,
        channel: slackrc.room_id,
        latest: dt.epoch_end,
        oldest: dt.epoch_start,
        count: 500
      });

      self._http_get("https://slack.com/api/channels.history?{0}".format(qs), function(payload) {
        //
        //TODO: payload.has_more, !ok, member not in slackrc.members
        //
        if (payload && payload.ok && payload.messages && payload.messages.length) {
          callback(payload, slackrc.members);
        }
        else {
          callback({}, {});
        }
      });
    });
  },
  _parse_today: function(list) {
    var today = [];

    (list || []).forEach(function(item) {
      (item.fields || []).forEach(function(field) {
        if (/Today/i.test(field.title)) {
          today = field.value.
            replace(/[&]amp;/g, "&").
            split(/\n/g);
        }
      });
    });

    return today;
  },
  _parse_blockers: function(list) {
    var blockers = [];

    (list || []).forEach(function(item) {
      (item.fields || []).forEach(function(field) {
        if (/Blocker/i.test(field.title) &&
            /[A-Z].*[a-z]/.test(field.value) &&
            !/None|On Track/i.test(field.value)) {

          blockers = field.value.
            replace(/[&]amp;/g, "&").
            split(/\n/g);
        }
      });
    });

    return blockers;
  },
  daily: function(room_or_id, date, callback) {
    var parse_today = this._parse_today;
    var parse_blockers = this._parse_blockers;

    this.history(room_or_id, date, function(payload, members) {
      callback(payload, members, parse_today, parse_blockers);
    });
  }
};


module.exports = SlackUtils;
