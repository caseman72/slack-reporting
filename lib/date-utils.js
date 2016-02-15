"use strict"

require("string-utils-cwm");

var hh_mm_ss = function(dt) {
  if (typeof dt === "number") {
    dt = new Date(dt * 1E3);
  }
  return "0{h}:0{m}:0{s}".
    format({h: dt.getHours(), m: dt.getMinutes(), s: dt.getSeconds()}).
    replace(/0(\d\d)/g, "$1");
};

var h_mm_ampm = function(dt) {
  if (typeof dt === "number") {
    dt = new Date(dt * 1E3);
  }
  return "{h}:0{m} {ampm}".
    format({h: dt.getHours() % 12, m: dt.getMinutes(), ampm: dt.getHours() < 12 ? 'AM' : 'PM'}).
    replace(/0(\d\d)/g, "$1");
};

var yyyy_mm_dd = function(dt) {
  if (typeof dt === "number") {
    dt = new Date(dt * 1E3);
  }
  return "{y}-0{m}-0{d}".
    format({y: dt.getFullYear(), m: dt.getMonth()+1, d: dt.getDate()}).
    replace(/[-]0(\d\d)/g, "-$1");
};

var date_object = function(date_string) {
  var dt = new Date(date_string);
  dt.setMinutes(1 * dt.getTimezoneOffset());

  var day_of_week = dt.getDay();
  var epoch = dt.getTime() / 1E3;

  return {
    epoch_start: epoch,
    epoch_end: epoch + 86400,
    is_weekend: day_of_week === 0 || day_of_week === 6,
    yyyy_mm_dd: date_string
  };
};

var today = date_object(yyyy_mm_dd(new Date()));

var dates = [];
for (var i = 0; i<45; i++) {
  var date_string = yyyy_mm_dd(today.epoch_start - (i*86400));
  dates.push(date_object(date_string));
}

// utils
module.exports = {
  h_mm_ampm: h_mm_ampm,
  hh_mm_ss: hh_mm_ss,
  yyyy_mm_dd: yyyy_mm_dd,
  date_object: date_object,
  dates: dates
};
