import moment from 'moment';
import * as m from 'moment-timezone';

class Helper {
  getDate() {
    var zoneTime = moment.tz(new Date(), 'GMT');

    return {
      year: zoneTime.year(),
      month: zoneTime.month() + 1,
      day: zoneTime.date(),
      hour: zoneTime.hour(),
      minute: zoneTime.minute(),
      second: zoneTime.second(),
    };
  }
  rad2deg(r) {
    return (r * 180.0) / Math.PI;
  }

  monthList = [
    {name: 'January', numdays: 31, abbr: 'Jan'},
    {name: 'February', numdays: 28, abbr: 'Feb'},
    {name: 'March', numdays: 31, abbr: 'Mar'},
    {name: 'April', numdays: 30, abbr: 'Apr'},
    {name: 'May', numdays: 31, abbr: 'May'},
    {name: 'June', numdays: 30, abbr: 'Jun'},
    {name: 'July', numdays: 31, abbr: 'Jul'},
    {name: 'August', numdays: 31, abbr: 'Aug'},
    {name: 'September', numdays: 30, abbr: 'Sep'},
    {name: 'October', numdays: 31, abbr: 'Oct'},
    {name: 'November', numdays: 30, abbr: 'Nov'},
    {name: 'December', numdays: 31, abbr: 'Dec'},
  ];

  //--------------------------------------------------------------
  // returns a string in the form DDMMMYYYY[ next] to display prev/next rise/set
  // flag=2 for DD MMM, 3 for DD MM YYYY, 4 for DDMMYYYY next/prev

  dayString(jd, next, flag) {
    if (jd < 900000 || jd > 2817000) {
      return 'error';
    }

    var date = this.calcDateFromJD(jd);

    if (flag == 2)
      var output =
        this.zeroPad(date.day, 2) + ' ' + monthList[date.month - 1].abbr;
    if (flag == 3)
      var output =
        this.zeroPad(date.day, 2) +
        monthList[date.month - 1].abbr +
        date.year.toString();
    if (flag == 4)
      var output =
        this.zeroPad(date.day, 2) +
        monthList[date.month - 1].abbr +
        date.year.toString() +
        (next ? ' next' : ' prev');

    return output;
  }

  //--------------------------------------------------------------
  timeDateString(JD, minutes) {
    return this.timeString(minutes, 2) + ' ' + this.dayString(JD, 0, 2);
  }

  //--------------------------------------------------------------
  // this.timeString returns a zero-padded string (HH:MM:SS) given time in minutes
  // flag=2 for HH:MM, 3 for HH:MM:SS
  timeString(minutes, flag) {
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
      var output = this.zeroPad(hour, 2) + ':' + this.zeroPad(minute, 2);
      if (flag > 2) output = output + ':' + this.zeroPad(second, 2);
    } else {
      var output = 'error';
    }

    return output;
  }

  //--------------------------------------------------------------
  // zero pad a string 'n' with 'digits' number of zeros
  zeroPad(n, digits) {
    n = n.toString();
    while (n.length < digits) {
      n = '0' + n;
    }
    return n;
  }

  /*************************************************************/
  /* Solar position calculation s */
  /*************************************************************/

  calcTimeJulianCent(jd) {
    var T = (jd - 2451545.0) / 36525.0;
    return T;
  }

  calcJDFromJulianCent(t) {
    var JD = t * 36525.0 + 2451545.0;
    return JD;
  }

  isLeapYear(yr) {
    return (yr % 4 == 0 && yr % 100 != 0) || yr % 400 == 0;
  }

  calcDateFromJD(jd) {
    var z = Math.floor(jd + 0.5);
    var f = jd + 0.5 - z;
    if (z < 2299161) {
      var A = z;
    } else {
      var alpha = Math.floor((z - 1867216.25) / 36524.25);
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

  calcDoyFromJD(jd) {
    var date = this.calcDateFromJD(jd);

    var k = this.isLeapYear(date.year) ? 1 : 2;
    var doy =
      Math.floor((275 * date.month) / 9) -
      k * Math.floor((date.month + 9) / 12) +
      date.day -
      30;

    return doy;
  }

  radToDeg(angleRad) {
    return (180.0 * angleRad) / Math.PI;
  }

  degToRad(angleDeg) {
    return (Math.PI * angleDeg) / 180.0;
  }

  calcGeomMeanLongSun(t) {
    var L0 = 280.46646 + t * (36000.76983 + t * 0.0003032);
    while (L0 > 360.0) {
      L0 -= 360.0;
    }
    while (L0 < 0.0) {
      L0 += 360.0;
    }
    return L0; // in degrees
  }

  calcGeomMeanAnomalySun(t) {
    var M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
    return M; // in degrees
  }

  calcEccentricityEarthOrbit(t) {
    var e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
    return e; // unitless
  }

  calcSunEqOfCenter(t) {
    var m = this.calcGeomMeanAnomalySun(t);
    var mrad = this.degToRad(m);
    var sinm = Math.sin(mrad);
    var sin2m = Math.sin(mrad + mrad);
    var sin3m = Math.sin(mrad + mrad + mrad);
    var C =
      sinm * (1.914602 - t * (0.004817 + 0.000014 * t)) +
      sin2m * (0.019993 - 0.000101 * t) +
      sin3m * 0.000289;
    return C; // in degrees
  }

  calcSunTrueLong(t) {
    var l0 = this.calcGeomMeanLongSun(t);
    var c = this.calcSunEqOfCenter(t);
    var O = l0 + c;
    return O; // in degrees
  }

  calcSunTrueAnomaly(t) {
    var m = this.calcGeomMeanAnomalySun(t);
    var c = this.calcSunEqOfCenter(t);
    var v = m + c;
    return v; // in degrees
  }

  calcSunRadVector(t) {
    var v = this.calcSunTrueAnomaly(t);
    var e = this.calcEccentricityEarthOrbit(t);
    var R = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(this.degToRad(v)));
    return R; // in AUs
  }

  calcSunApparentLong(t) {
    var o = this.calcSunTrueLong(t);
    var omega = 125.04 - 1934.136 * t;
    var lambda = o - 0.00569 - 0.00478 * Math.sin(this.degToRad(omega));
    return lambda; // in degrees
  }

  calcMeanObliquityOfEcliptic(t) {
    var seconds = 21.448 - t * (46.815 + t * (0.00059 - t * 0.001813));
    var e0 = 23.0 + (26.0 + seconds / 60.0) / 60.0;
    return e0; // in degrees
  }

  calcObliquityCorrection(t) {
    var e0 = this.calcMeanObliquityOfEcliptic(t);
    var omega = 125.04 - 1934.136 * t;
    var e = e0 + 0.00256 * Math.cos(this.degToRad(omega));
    return e; // in degrees
  }

  calcSunRtAscension(t) {
    var e = this.calcObliquityCorrection(t);
    var lambda = this.calcSunApparentLong(t);
    var tananum = Math.cos(this.degToRad(e)) * Math.sin(this.degToRad(lambda));
    var tanadenom = Math.cos(this.degToRad(lambda));
    var alpha = this.radToDeg(Math.atan2(tananum, tanadenom));
    return alpha; // in degrees
  }

  calcSunDeclination(t) {
    var e = this.calcObliquityCorrection(t);
    var lambda = this.calcSunApparentLong(t);
    var sint = Math.sin(this.degToRad(e)) * Math.sin(this.degToRad(lambda));
    var theta = this.radToDeg(Math.asin(sint));
    return theta; // in degrees
  }

  calcEquationOfTime(t) {
    var epsilon = this.calcObliquityCorrection(t);
    var l0 = this.calcGeomMeanLongSun(t);
    var e = this.calcEccentricityEarthOrbit(t);
    var m = this.calcGeomMeanAnomalySun(t);

    var y = Math.tan(this.degToRad(epsilon) / 2.0);
    y *= y;

    var sin2l0 = Math.sin(2.0 * this.degToRad(l0));
    var sinm = Math.sin(this.degToRad(m));
    var cos2l0 = Math.cos(2.0 * this.degToRad(l0));
    var sin4l0 = Math.sin(4.0 * this.degToRad(l0));
    var sin2m = Math.sin(2.0 * this.degToRad(m));

    var Etime =
      y * sin2l0 -
      2.0 * e * sinm +
      4.0 * e * y * sinm * cos2l0 -
      0.5 * y * y * sin4l0 -
      1.25 * e * e * sin2m;
    return this.radToDeg(Etime) * 4.0; // in minutes of time
  }

  calcHourAngleSunrise(lat, solarDec) {
    var latRad = this.degToRad(lat);
    var sdRad = this.degToRad(solarDec);
    var HAarg =
      Math.cos(this.degToRad(90.833)) / (Math.cos(latRad) * Math.cos(sdRad)) -
      Math.tan(latRad) * Math.tan(sdRad);
    var HA = Math.acos(HAarg);
    return HA; // in radians (for sunset, use -HA)
  }

  isNumber(inputVal) {
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

  getJD(year, month, day) {
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

  calcRefraction(elev) {
    if (elev > 85.0) {
      var correction = 0.0;
    } else {
      var te = Math.tan(this.degToRad(elev));
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

  calcAzEl(T, localtime, latitude, longitude, zone) {
    var eqTime = this.calcEquationOfTime(T);
    var theta = this.calcSunDeclination(T);

    var solarTimeFix = eqTime + 4.0 * longitude - 60.0 * zone;
    var earthRadVec = this.calcSunRadVector(T);
    var trueSolarTime = localtime + solarTimeFix;
    while (trueSolarTime > 1440) {
      trueSolarTime -= 1440;
    }
    var hourAngle = trueSolarTime / 4.0 - 180.0;
    if (hourAngle < -180) {
      hourAngle += 360.0;
    }
    var haRad = this.degToRad(hourAngle);
    var csz =
      Math.sin(this.degToRad(latitude)) * Math.sin(this.degToRad(theta)) +
      Math.cos(this.degToRad(latitude)) *
        Math.cos(this.degToRad(theta)) *
        Math.cos(haRad);
    if (csz > 1.0) {
      csz = 1.0;
    } else if (csz < -1.0) {
      csz = -1.0;
    }
    var zenith = this.radToDeg(Math.acos(csz));
    var azDenom =
      Math.cos(this.degToRad(latitude)) * Math.sin(this.degToRad(zenith));
    if (Math.abs(azDenom) > 0.001) {
      var azRad =
        (Math.sin(this.degToRad(latitude)) * Math.cos(this.degToRad(zenith)) -
          Math.sin(this.degToRad(theta))) /
        azDenom;
      if (Math.abs(azRad) > 1.0) {
        if (azRad < 0) {
          azRad = -1.0;
        } else {
          azRad = 1.0;
        }
      }
      var azimuth = 180.0 - this.radToDeg(Math.acos(azRad));
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
    var refractionCorrection = this.calcRefraction(exoatmElevation);

    var solarZen = zenith - refractionCorrection;
    var elevation = 90.0 - solarZen;

    return {azimuth: azimuth, elevation: elevation};
  }

  calcSolNoon(jd, longitude, timezone) {
    var tnoon = this.calcTimeJulianCent(jd - longitude / 360.0);
    var eqTime = this.calcEquationOfTime(tnoon);
    var solNoonOffset = 720.0 - longitude * 4 - eqTime; // in minutes
    var newt = this.calcTimeJulianCent(jd + solNoonOffset / 1440.0);
    eqTime = this.calcEquationOfTime(newt);
    var solNoonLocal = 720 - longitude * 4 - eqTime + timezone * 60.0; // in minutes
    while (solNoonLocal < 0.0) {
      solNoonLocal += 1440.0;
    }
    while (solNoonLocal >= 1440.0) {
      solNoonLocal -= 1440.0;
    }

    return solNoonLocal;
  }

  calcSunriseSetUTC(rise, JD, latitude, longitude) {
    var t = this.calcTimeJulianCent(JD);
    var eqTime = this.calcEquationOfTime(t);
    var solarDec = this.calcSunDeclination(t);
    var hourAngle = this.calcHourAngleSunrise(latitude, solarDec);
    if (!rise) hourAngle = -hourAngle;
    var delta = longitude + this.radToDeg(hourAngle);
    var timeUTC = 720 - 4.0 * delta - eqTime; // in minutes

    return timeUTC;
  }

  // rise = 1 for sunrise, 0 for sunset
  calcSunriseSet(rise, JD, latitude, longitude, timezone) {
    var timeUTC = this.calcSunriseSetUTC(rise, JD, latitude, longitude);
    var newTimeUTC = this.calcSunriseSetUTC(
      rise,
      JD + timeUTC / 1440.0,
      latitude,
      longitude,
    );
    if (this.isNumber(newTimeUTC)) {
      var timeLocal = newTimeUTC + timezone * 60.0;
      var riseT = this.calcTimeJulianCent(JD + newTimeUTC / 1440.0);
      var riseAzEl = this.calcAzEl(
        riseT,
        timeLocal,
        latitude,
        longitude,
        timezone,
      );
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
      var doy = this.calcDoyFromJD(JD);
      if (
        (latitude > 66.4 && doy > 79 && doy < 267) ||
        (latitude < -66.4 && (doy < 83 || doy > 263))
      ) {
        //previous sunrise/next sunset
        jday = this.calcJDofNextPrevRiseSet(
          !rise,
          rise,
          JD,
          latitude,
          longitude,
          timezone,
        );
      } else {
        //previous sunset/next sunrise
        jday = this.calcJDofNextPrevRiseSet(
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

  calcJDofNextPrevRiseSet(next, rise, JD, latitude, longitude, tz) {
    var julianday = JD;
    var increment = next ? 1.0 : -1.0;
    var time = this.calcSunriseSetUTC(rise, julianday, latitude, longitude);

    while (!this.isNumber(time)) {
      julianday += increment;
      time = this.calcSunriseSetUTC(rise, julianday, latitude, longitude);
    }
    var timeLocal = time + tz * 60.0;
    while (timeLocal < 0.0 || timeLocal >= 1440.0) {
      var incr = timeLocal < 0 ? 1 : -1;
      timeLocal += incr * 1440.0;
      julianday -= incr;
    }

    return julianday;
  }

  getTanFromDegrees(degrees) {
    return Math.tan((degrees * Math.PI) / 180);
  }

  arcctg(x) {
    return Math.PI / 2 - Math.atan(x);
  }

  mergeArrayObjects(arr1, arr2) {
    return arr1.map((item, i) => {
      if (item.id === arr2[i].id) {
        //merging two objects
        return Object.assign({}, item, arr2[i]);
      }
    });
  }

  /*************************************************************/
  /* end calculation s */
  /*************************************************************/
}

export default Helper;
