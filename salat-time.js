import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  FlatList,
  TouchableOpacity,
  Button,
} from 'react-native';

import React, {useEffect, useState} from 'react';
import Geolocation, {
  hasLocationPermission,
} from 'react-native-geolocation-service';

import moment from 'moment';
import * as m from 'moment-timezone';
import BackgroundTimer from 'react-native-background-timer';
import {notificationManager} from './NotificationManager';

var Sound = require('react-native-sound');

Sound.setCategory('Playback');

var ding = new Sound('Ding-sound-effect.mp3', Sound.MAIN_BUNDLE, error => {
  if (error) {
    console.log('failed to load the sound', error);
    return;
  }
  // if loaded successfully
  console.log(
    'duration in seconds: ' +
      ding.getDuration() +
      'number of channels: ' +
      ding.getNumberOfChannels(),
  );
});

const SalatTime = props => {
  const [isloaded, setIsLoaded] = useState(false);
  const [namaz, setNamaz] = useState(null);
  const [isSalatTime, setIsSalatTime] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  let salatTimes = [];
  const getAsarAngle = (shadowLength, latitude, declination) => {
    const numerator =
      -Math.sin(1 / Math.atan(2 + Math.tan(latitude - declination))) -
      Math.sin(latitude) * Math.sin(declination);
    const denominator = Math.cos(latitude) * Math.cos(declination);

    return (1 / 15) * Math.acos(numerator / denominator);
  };

  const getTwilight = (alpha, latitude, declination) => {
    const numerator =
      -Math.sin(alpha) - Math.sin(latitude) * Math.sin(declination);
    const denominator = Math.cos(latitude) * Math.cos(declination);

    return (1 / 15) * Math.acos(numerator / denominator);
  };

  const getDate = () => {
    var zoneTime = moment.tz(new Date(), 'America/Los_Angeles');

    return {
      year: zoneTime.year(),
      month: zoneTime.month() + 1,
      day: zoneTime.date(),
      hour: zoneTime.hour(),
      minute: zoneTime.minute(),
      second: zoneTime.second(),
    };
  };

  const get_input_data = position => {
    var date = getDate();
    var mins = date.hour * 60 + date.minute + date.second / 60.0;
    var lat = position.coords.latitude;
    var lng = position.coords.longitude;
    // var tz = moment().utcOffset() / 60.0;
    var tz = -(
      moment.tz.zone('America/Los_Angeles').utcOffset(1388563200000) / 60.0
    );

    var data = {
      year: date.year,
      month: date.month,
      day: date.day,
      hour: date.hour,
      minute: date.minute,
      second: date.second,
      time_local: mins,
      lat: lat,
      lon: lng,
      tz: tz,
    };

    return data;
  };

  function timeString(minutes, flag) {
    if (minutes >= 0 && minutes < 1440) {
      var floatHour = minutes / 60.0;
      var hour = Math.floor(floatHour);
      var floatMinute = 60.0 * (floatHour - Math.floor(floatHour));
      var minute = Math.floor(floatMinute);
      var floatSec = 60.0 * (floatMinute - Math.floor(floatMinute));
      var second = Math.floor(floatSec + 0.5);
      if (second > 59) {
        second = 0;
        minute += 1;
      }
      if (flag == 2 && second >= 30) minute++;
      if (minute > 59) {
        minute = 0;
        hour += 1;
      }
      var output = zeroPad(hour, 2) + ':' + zeroPad(minute, 2);
      if (flag > 2) output = output + ':' + zeroPad(second, 2);
    } else {
      var output = 'error';
    }

    return output;
  }

  //--------------------------------------------------------------
  // returns a string in the form DDMMMYYYY[ next] to display prev/next rise/set
  // flag=2 for DD MMM, 3 for DD MM YYYY, 4 for DDMMYYYY next/prev
  function dayString(jd, next, flag) {
    if (jd < 900000 || jd > 2817000) {
      return 'error';
    }

    var date = calcDateFromJD(jd);

    if (flag == 2)
      var output = zeroPad(date.day, 2) + ' ' + monthList[date.month - 1].abbr;
    if (flag == 3)
      var output =
        zeroPad(date.day, 2) +
        monthList[date.month - 1].abbr +
        date.year.toString();
    if (flag == 4)
      var output =
        zeroPad(date.day, 2) +
        monthList[date.month - 1].abbr +
        date.year.toString() +
        (next ? ' next' : ' prev');

    return output;
  }

  //--------------------------------------------------------------
  function timeDateString(JD, minutes) {
    return timeString(minutes, 2) + ' ' + dayString(JD, 0, 2);
  }

  //--------------------------------------------------------------
  // timeString returns a zero-padded string (HH:MM:SS) given time in minutes
  // flag=2 for HH:MM, 3 for HH:MM:SS
  function timeString(minutes, flag) {
    if (minutes >= 0 && minutes < 1440) {
      var floatHour = minutes / 60.0;
      var hour = Math.floor(floatHour);
      var floatMinute = 60.0 * (floatHour - Math.floor(floatHour));
      var minute = Math.floor(floatMinute);
      var floatSec = 60.0 * (floatMinute - Math.floor(floatMinute));
      var second = Math.floor(floatSec + 0.5);
      if (second > 59) {
        second = 0;
        minute += 1;
      }
      if (flag == 2 && second >= 30) minute++;
      if (minute > 59) {
        minute = 0;
        hour += 1;
      }
      var output = zeroPad(hour, 2) + ':' + zeroPad(minute, 2);
      if (flag > 2) output = output + ':' + zeroPad(second, 2);
    } else {
      var output = 'error';
    }

    return output;
  }

  //--------------------------------------------------------------
  // zero pad a string 'n' with 'digits' number of zeros
  function zeroPad(n, digits) {
    n = n.toString();
    while (n.length < digits) {
      n = '0' + n;
    }
    return n;
  }

  /*************************************************************/
  /* Solar position calculation functions */
  /*************************************************************/

  function calcTimeJulianCent(jd) {
    var T = (jd - 2451545.0) / 36525.0;
    return T;
  }

  function calcJDFromJulianCent(t) {
    var JD = t * 36525.0 + 2451545.0;
    return JD;
  }

  function isLeapYear(yr) {
    return (yr % 4 == 0 && yr % 100 != 0) || yr % 400 == 0;
  }

  function calcDateFromJD(jd) {
    var z = Math.floor(jd + 0.5);
    var f = jd + 0.5 - z;
    if (z < 2299161) {
      var A = z;
    } else {
      alpha = Math.floor((z - 1867216.25) / 36524.25);
      var A = z + 1 + alpha - Math.floor(alpha / 4);
    }
    var B = A + 1524;
    var C = Math.floor((B - 122.1) / 365.25);
    var D = Math.floor(365.25 * C);
    var E = Math.floor((B - D) / 30.6001);
    var day = B - D - Math.floor(30.6001 * E) + f;
    var month = E < 14 ? E - 1 : E - 13;
    var year = month > 2 ? C - 4716 : C - 4715;

    return {year: year, month: month, day: day};
  }

  function calcDoyFromJD(jd) {
    var date = calcDateFromJD(jd);

    var k = isLeapYear(date.year) ? 1 : 2;
    var doy =
      Math.floor((275 * date.month) / 9) -
      k * Math.floor((date.month + 9) / 12) +
      date.day -
      30;

    return doy;
  }

  function radToDeg(angleRad) {
    return (180.0 * angleRad) / Math.PI;
  }

  function degToRad(angleDeg) {
    return (Math.PI * angleDeg) / 180.0;
  }

  function calcGeomMeanLongSun(t) {
    var L0 = 280.46646 + t * (36000.76983 + t * 0.0003032);
    while (L0 > 360.0) {
      L0 -= 360.0;
    }
    while (L0 < 0.0) {
      L0 += 360.0;
    }
    return L0; // in degrees
  }

  function calcGeomMeanAnomalySun(t) {
    var M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
    return M; // in degrees
  }

  function calcEccentricityEarthOrbit(t) {
    var e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
    return e; // unitless
  }

  function calcSunEqOfCenter(t) {
    var m = calcGeomMeanAnomalySun(t);
    var mrad = degToRad(m);
    var sinm = Math.sin(mrad);
    var sin2m = Math.sin(mrad + mrad);
    var sin3m = Math.sin(mrad + mrad + mrad);
    var C =
      sinm * (1.914602 - t * (0.004817 + 0.000014 * t)) +
      sin2m * (0.019993 - 0.000101 * t) +
      sin3m * 0.000289;
    return C; // in degrees
  }

  function calcSunTrueLong(t) {
    var l0 = calcGeomMeanLongSun(t);
    var c = calcSunEqOfCenter(t);
    var O = l0 + c;
    return O; // in degrees
  }

  function calcSunTrueAnomaly(t) {
    var m = calcGeomMeanAnomalySun(t);
    var c = calcSunEqOfCenter(t);
    var v = m + c;
    return v; // in degrees
  }

  function calcSunRadVector(t) {
    var v = calcSunTrueAnomaly(t);
    var e = calcEccentricityEarthOrbit(t);
    var R = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(degToRad(v)));
    return R; // in AUs
  }

  function calcSunApparentLong(t) {
    var o = calcSunTrueLong(t);
    var omega = 125.04 - 1934.136 * t;
    var lambda = o - 0.00569 - 0.00478 * Math.sin(degToRad(omega));
    return lambda; // in degrees
  }

  function calcMeanObliquityOfEcliptic(t) {
    var seconds = 21.448 - t * (46.815 + t * (0.00059 - t * 0.001813));
    var e0 = 23.0 + (26.0 + seconds / 60.0) / 60.0;
    return e0; // in degrees
  }

  function calcObliquityCorrection(t) {
    var e0 = calcMeanObliquityOfEcliptic(t);
    var omega = 125.04 - 1934.136 * t;
    var e = e0 + 0.00256 * Math.cos(degToRad(omega));
    return e; // in degrees
  }

  function calcSunRtAscension(t) {
    var e = calcObliquityCorrection(t);
    var lambda = calcSunApparentLong(t);
    var tananum = Math.cos(degToRad(e)) * Math.sin(degToRad(lambda));
    var tanadenom = Math.cos(degToRad(lambda));
    var alpha = radToDeg(Math.atan2(tananum, tanadenom));
    return alpha; // in degrees
  }

  function calcSunDeclination(t) {
    var e = calcObliquityCorrection(t);
    var lambda = calcSunApparentLong(t);
    var sint = Math.sin(degToRad(e)) * Math.sin(degToRad(lambda));
    var theta = radToDeg(Math.asin(sint));
    return theta; // in degrees
  }

  function calcEquationOfTime(t) {
    var epsilon = calcObliquityCorrection(t);
    var l0 = calcGeomMeanLongSun(t);
    var e = calcEccentricityEarthOrbit(t);
    var m = calcGeomMeanAnomalySun(t);

    var y = Math.tan(degToRad(epsilon) / 2.0);
    y *= y;

    var sin2l0 = Math.sin(2.0 * degToRad(l0));
    var sinm = Math.sin(degToRad(m));
    var cos2l0 = Math.cos(2.0 * degToRad(l0));
    var sin4l0 = Math.sin(4.0 * degToRad(l0));
    var sin2m = Math.sin(2.0 * degToRad(m));

    var Etime =
      y * sin2l0 -
      2.0 * e * sinm +
      4.0 * e * y * sinm * cos2l0 -
      0.5 * y * y * sin4l0 -
      1.25 * e * e * sin2m;
    return radToDeg(Etime) * 4.0; // in minutes of time
  }

  function calcHourAngleSunrise(lat, solarDec) {
    var latRad = degToRad(lat);
    var sdRad = degToRad(solarDec);
    var HAarg =
      Math.cos(degToRad(90.833)) / (Math.cos(latRad) * Math.cos(sdRad)) -
      Math.tan(latRad) * Math.tan(sdRad);
    var HA = Math.acos(HAarg);
    return HA; // in radians (for sunset, use -HA)
  }

  function isNumber(inputVal) {
    var oneDecimal = false;
    var inputStr = '' + inputVal;
    for (var i = 0; i < inputStr.length; i++) {
      var oneChar = inputStr.charAt(i);
      if (i == 0 && (oneChar == '-' || oneChar == '+')) {
        continue;
      }
      if (oneChar == '.' && !oneDecimal) {
        oneDecimal = true;
        continue;
      }
      if (oneChar < '0' || oneChar > '9') {
        return false;
      }
    }
    return true;
  }

  function getJD(year, month, day) {
    if (month <= 2) {
      year -= 1;
      month += 12;
    }
    var A = Math.floor(year / 100);
    var B = 2 - A + Math.floor(A / 4);
    var JD =
      Math.floor(365.25 * (year + 4716)) +
      Math.floor(30.6001 * (month + 1)) +
      day +
      B -
      1524.5;
    return JD;
  }

  function calcRefraction(elev) {
    if (elev > 85.0) {
      var correction = 0.0;
    } else {
      var te = Math.tan(degToRad(elev));
      if (elev > 5.0) {
        var correction =
          58.1 / te -
          0.07 / (te * te * te) +
          0.000086 / (te * te * te * te * te);
      } else if (elev > -0.575) {
        var correction =
          1735.0 +
          elev * (-518.2 + elev * (103.4 + elev * (-12.79 + elev * 0.711)));
      } else {
        var correction = -20.774 / te;
      }
      correction = correction / 3600.0;
    }

    return correction;
  }

  function calcAzEl(T, localtime, latitude, longitude, zone) {
    var eqTime = calcEquationOfTime(T);
    var theta = calcSunDeclination(T);

    var solarTimeFix = eqTime + 4.0 * longitude - 60.0 * zone;
    var earthRadVec = calcSunRadVector(T);
    var trueSolarTime = localtime + solarTimeFix;
    while (trueSolarTime > 1440) {
      trueSolarTime -= 1440;
    }
    var hourAngle = trueSolarTime / 4.0 - 180.0;
    if (hourAngle < -180) {
      hourAngle += 360.0;
    }
    var haRad = degToRad(hourAngle);
    var csz =
      Math.sin(degToRad(latitude)) * Math.sin(degToRad(theta)) +
      Math.cos(degToRad(latitude)) *
        Math.cos(degToRad(theta)) *
        Math.cos(haRad);
    if (csz > 1.0) {
      csz = 1.0;
    } else if (csz < -1.0) {
      csz = -1.0;
    }
    var zenith = radToDeg(Math.acos(csz));
    var azDenom = Math.cos(degToRad(latitude)) * Math.sin(degToRad(zenith));
    if (Math.abs(azDenom) > 0.001) {
      var azRad =
        (Math.sin(degToRad(latitude)) * Math.cos(degToRad(zenith)) -
          Math.sin(degToRad(theta))) /
        azDenom;
      if (Math.abs(azRad) > 1.0) {
        if (azRad < 0) {
          azRad = -1.0;
        } else {
          azRad = 1.0;
        }
      }
      var azimuth = 180.0 - radToDeg(Math.acos(azRad));
      if (hourAngle > 0.0) {
        azimuth = -azimuth;
      }
    } else {
      if (latitude > 0.0) {
        var azimuth = 180.0;
      } else {
        var azimuth = 0.0;
      }
    }
    if (azimuth < 0.0) {
      azimuth += 360.0;
    }
    var exoatmElevation = 90.0 - zenith;

    // Atmospheric Refraction correction
    var refractionCorrection = calcRefraction(exoatmElevation);

    var solarZen = zenith - refractionCorrection;
    var elevation = 90.0 - solarZen;

    return {azimuth: azimuth, elevation: elevation};
  }

  function calcSolNoon(jd, longitude, timezone) {
    var tnoon = calcTimeJulianCent(jd - longitude / 360.0);
    var eqTime = calcEquationOfTime(tnoon);
    var solNoonOffset = 720.0 - longitude * 4 - eqTime; // in minutes
    var newt = calcTimeJulianCent(jd + solNoonOffset / 1440.0);
    eqTime = calcEquationOfTime(newt);
    var solNoonLocal = 720 - longitude * 4 - eqTime + timezone * 60.0; // in minutes
    while (solNoonLocal < 0.0) {
      solNoonLocal += 1440.0;
    }
    while (solNoonLocal >= 1440.0) {
      solNoonLocal -= 1440.0;
    }

    return solNoonLocal;
  }

  function calcSunriseSetUTC(rise, JD, latitude, longitude) {
    var t = calcTimeJulianCent(JD);
    var eqTime = calcEquationOfTime(t);
    var solarDec = calcSunDeclination(t);
    var hourAngle = calcHourAngleSunrise(latitude, solarDec);
    if (!rise) hourAngle = -hourAngle;
    var delta = longitude + radToDeg(hourAngle);
    var timeUTC = 720 - 4.0 * delta - eqTime; // in minutes

    return timeUTC;
  }

  // rise = 1 for sunrise, 0 for sunset
  function calcSunriseSet(rise, JD, latitude, longitude, timezone) {
    var timeUTC = calcSunriseSetUTC(rise, JD, latitude, longitude);
    var newTimeUTC = calcSunriseSetUTC(
      rise,
      JD + timeUTC / 1440.0,
      latitude,
      longitude,
    );
    if (isNumber(newTimeUTC)) {
      var timeLocal = newTimeUTC + timezone * 60.0;
      var riseT = calcTimeJulianCent(JD + newTimeUTC / 1440.0);
      var riseAzEl = calcAzEl(riseT, timeLocal, latitude, longitude, timezone);
      var azimuth = riseAzEl.azimuth;
      var jday = JD;
      if (timeLocal < 0.0 || timeLocal >= 1440.0) {
        var increment = timeLocal < 0 ? 1 : -1;
        while (timeLocal < 0.0 || timeLocal >= 1440.0) {
          timeLocal += increment * 1440.0;
          jday -= increment;
        }
      }
    } else {
      // no sunrise/set found

      var azimuth = -1.0;
      var timeLocal = 0.0;
      var doy = calcDoyFromJD(JD);
      if (
        (latitude > 66.4 && doy > 79 && doy < 267) ||
        (latitude < -66.4 && (doy < 83 || doy > 263))
      ) {
        //previous sunrise/next sunset
        jday = calcJDofNextPrevRiseSet(
          !rise,
          rise,
          JD,
          latitude,
          longitude,
          timezone,
        );
      } else {
        //previous sunset/next sunrise
        jday = calcJDofNextPrevRiseSet(
          rise,
          rise,
          JD,
          latitude,
          longitude,
          timezone,
        );
      }
    }

    return {jday: jday, timelocal: timeLocal, azimuth: azimuth};
  }

  function calcJDofNextPrevRiseSet(next, rise, JD, latitude, longitude, tz) {
    var julianday = JD;
    var increment = next ? 1.0 : -1.0;
    var time = calcSunriseSetUTC(rise, julianday, latitude, longitude);

    while (!isNumber(time)) {
      julianday += increment;
      time = calcSunriseSetUTC(rise, julianday, latitude, longitude);
    }
    var timeLocal = time + tz * 60.0;
    while (timeLocal < 0.0 || timeLocal >= 1440.0) {
      var incr = timeLocal < 0 ? 1 : -1;
      timeLocal += incr * 1440.0;
      julianday -= incr;
    }

    return julianday;
  }

  /*************************************************************/
  /* end calculation functions */
  /*************************************************************/

  function fetchSalatDetails() {
    var data = get_input_data(props.position);
    var jday = getJD(data.year, data.month, data.day);
    var total = jday + data.time_local / 1440.0 - data.tz / 24.0;
    var T = calcTimeJulianCent(total);
    var azel = calcAzEl(T, data.time_local, data.lat, data.lon, data.tz);
    var solnoon = calcSolNoon(jday, data.lon, data.tz);
    var rise = calcSunriseSet(1, jday, data.lat, data.lon, data.tz);
    var set = calcSunriseSet(0, jday, data.lat, data.lon, data.tz);

    var eqTime = calcEquationOfTime(T);
    var theta = calcSunDeclination(T);

    var rise = calcSunriseSet(1, jday, data.lat, data.lon, data.tz);
    var set = calcSunriseSet(0, jday, data.lat, data.lon, data.tz);

    var eqTime = calcEquationOfTime(T);
    var theta = calcSunDeclination(T);
    let sunrise;
    let sunset;

    // sunrise time box
    if (rise.jday == jday) {
      sunrise = timeString(rise.timelocal, 3);
    } else {
      if (rise.azimuth >= 0.0) {
        sunrise = timeDateString(rise.jday, rise.timelocal);
      } else {
        sunrise = dayString(rise.jday, 0, 3);
      }
    }

    // sunset time box
    if (set.jday == jday) {
      sunset = timeString(set.timelocal, 2);
    } else {
      if (set.azimuth >= 0.0) {
        sunset = timeDateString(set.jday, set.timelocal);
      } else {
        sunset = dayString(set.jday, 0, 2);
      }
    }

    const twilight = (getTwilight(0, data.lat, theta) * (60 * 180)) / Math.PI;

    const asarTime = (getAsarAngle(2, data.lat, theta) * (60 * 180)) / Math.PI;

    console.log('Isha', timeString(solnoon + twilight, 2));

    salatTimes = {
      Fajr: timeString(solnoon - twilight, 2),
      Dhuhr: timeString(solnoon, 2),
      Asr: timeString(solnoon + asarTime, 2),
      Maghrib: sunset,
      Isha: timeString(solnoon + twilight, 2),
    };

    const salat = Object.keys(salatTimes).find(salat => {
      if (salat === props.name) {
        return salat;
      }
    });

    if (salat) {
      setNamaz(salatTimes[salat]);
    }
  }

  function alertSalatTime() {
    const isNamazTime = Object.values(salatTimes).find(key => {
      const hourMinute = key.split(':');
      // return hourMinute[0] === date.hour && hourMinute[1] === date.minute;
      if (hourMinute[0] === '06' && hourMinute[1] === '38') {
        return key;
      } else {
        return null;
      }
    });
    console.log(isNamazTime);
    setIsSalatTime(isNamazTime);
  }

  function backgroundPlay() {
    BackgroundTimer.runBackgroundTimer(() => {
      play();
    }, 1000);
  }

  const play = () => {
    setShowPlayButton(false);

    ding.play(success => {
      if (success) {
        console.log('successfully finished playing');
        // setIsSalatTime(null);
        // setShowPlayButton(false);
      } else {
        console.log('playback failed due to audio decoding errors');
      }
    });
  };
  const pause = () => {
    ding.pause(success => {
      setShowPlayButton(true);
      if (success) {
        console.log('successfully paused playing');
      } else {
        console.log('playback failed due to audio decoding errors');
      }
    });
  };

  useEffect(() => {
    ding.setVolume(1);
    notificationManager.configure(
      onRegister,
      onNotification,
      onOpenNotification,
    );
    fetchSalatDetails();
    alertSalatTime();
    setIsLoaded(true);
    return () => {
      ding.release();
    };
  }, [props.name]);

  useEffect(() => {
    if (isSalatTime) {
      // backgroundPlay();
      const options = {
        soundName: 'azan1.mp3', //'default', //
        playSound: true,
        vibrate: true,
      };
      notificationManager.showNotification(
        ' 1',
        'Salat Time ',
        'Its Time for Salat',
        {},
        options,
      );
    } else {
      BackgroundTimer.stopBackgroundTimer();
    }
    return () => {
      BackgroundTimer.stopBackgroundTimer();
    };
  }, [isSalatTime]);

  function onRegister(token) {
    console.log('[Notification] on register', token);
  }

  function onNotification(notify) {
    console.log('[Notification] on onNotification', notify);
  }

  function onOpenNotification(notify) {
    console.log('[Notification] on onOpenNotification', notify);
    alert('Open Notification');
  }

  return isloaded ? (
    <>
      <Text> {namaz}</Text>
      {isSalatTime === namaz ? (
        <TouchableOpacity style={styles.playBtn}>
          {showPlayButton ? (
            <Button
              title="Play"
              backgroundColor="#3b5998"
              onPress={play}></Button>
          ) : (
            <Button
              title="Pause"
              backgroundColor="#3b5998"
              onPress={pause}></Button>
          )}
        </TouchableOpacity>
      ) : null}
    </>
  ) : null;
};
const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight,
    marginHorizontal: 16,
  },
  item: {
    backgroundColor: '#f9c2ff',
    padding: 20,
    marginVertical: 8,
  },
  header: {
    fontSize: 32,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
  },
  playBtn: {
    padding: 20,
  },
});
export default SalatTime;
