import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Button,
} from 'react-native';

import React, {useEffect, useState} from 'react';
import Helper from './helper';

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

const helper = new Helper();

const SalatTime = props => {
  const [isloaded, setIsLoaded] = useState(false);
  const [namaz, setNamaz] = useState(null);
  const [isSalatTime, setIsSalatTime] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  let salatTimes = [];

  const getAsarAngle = (shadowLength, latitude, declination) => {
    const asarElevationAngle = -helper.radToDeg(
      helper.arcctg(
        shadowLength +
          helper.getTanFromDegrees(Math.abs(latitude - declination)),
      ),
    );

    const hourAsarAngle = getHourAngle(
      asarElevationAngle,
      latitude,
      declination,
    );

    return (1.0 / 15.0) * hourAsarAngle;
  };

  const getHourAngle = (alpha, latitude, declination) => {
    alpha = helper.degToRad(alpha);
    latitude = helper.degToRad(latitude);
    declination = helper.degToRad(declination);

    const numerator =
      -Math.sin(alpha) - Math.sin(latitude) * Math.sin(declination);
    const denominator = Math.cos(latitude) * Math.cos(declination);

    return Math.acos(numerator / denominator);
  };

  const getTwilight = (twilightHourAngle, latitude, declination) => {
    const hourTwilightAngle = getHourAngle(
      twilightHourAngle,
      latitude,
      declination,
    );
    return (1 / 15) * hourTwilightAngle;
  };

  const get_input_data = position => {
    var date = helper.getDate();
    var mins = date.hour * 60 + date.minute + date.second / 60.0;
    var lat = position.coords.latitude;
    var lng = position.coords.longitude;
    // var tz = moment().utcOffset() / 60.0;
    var tz = -(moment.tz.zone('GMT').utcOffset(1388563200000) / 60.0);

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

  function fetchSalatDetails() {
    var data = get_input_data(props.position);
    var jday = helper.getJD(data.year, data.month, data.day);
    var total = jday + data.time_local / 1440.0 - data.tz / 24.0;
    var T = helper.calcTimeJulianCent(total);
    var azel = helper.calcAzEl(T, data.time_local, data.lat, data.lon, data.tz);
    var solnoon = helper.calcSolNoon(jday, data.lon, data.tz);
    var rise = helper.calcSunriseSet(1, jday, data.lat, data.lon, data.tz);
    var set = helper.calcSunriseSet(0, jday, data.lat, data.lon, data.tz);

    var eqTime = helper.calcEquationOfTime(T);
    var theta = helper.calcSunDeclination(T);

    var rise = helper.calcSunriseSet(1, jday, data.lat, data.lon, data.tz);
    var set = helper.calcSunriseSet(0, jday, data.lat, data.lon, data.tz);

    var eqTime = helper.calcEquationOfTime(T);
    var theta = helper.calcSunDeclination(T);
    let sunrise;
    let sunset;

    // sunrise time box
    if (rise.jday == jday) {
      sunrise = helper.timeString(rise.timelocal, 3);
    } else {
      if (rise.azimuth >= 0.0) {
        sunrise = helper.timeDateString(rise.jday, rise.timelocal);
      } else {
        sunrise = helper.dayString(rise.jday, 0, 3);
      }
    }

    // sunset time box
    if (set.jday == jday) {
      sunset = helper.timeString(set.timelocal, 2);
    } else {
      if (set.azimuth >= 0.0) {
        sunset = helper.timeDateString(set.jday, set.timelocal);
      } else {
        sunset = helper.dayString(set.jday, 0, 2);
      }
    }

    const twilight = (getTwilight(18, data.lat, theta) * (60 * 180)) / Math.PI;

    const asarTime = (getAsarAngle(1, data.lat, theta) * (60 * 180)) / Math.PI;

    salatTimes = {
      Fajr: helper.timeString(solnoon - twilight, 2),
      Dhuhr: helper.timeString(solnoon, 2),
      Asr: helper.timeString(solnoon + asarTime, 2),
      Maghrib: sunset,
      Isha: helper.timeString(solnoon + twilight, 2),
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
      if (hourMinute[0] === '03' && hourMinute[1] === '54') {
        return key;
      } else {
        return null;
      }
    });
    console.log(isNamazTime);
    setIsSalatTime(isNamazTime);
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

    fetchSalatDetails();
    setIsLoaded(true);
    return () => {
      ding.release();
    };
  }, [props.name]);

  useEffect(() => {
    if (isSalatTime) {
      alertSalatTime();

      notificationManager.configure(
        onRegister,
        onNotification,
        onOpenNotification,
      );
      const options = {
        soundName: 'default', //'azan1.mp3', //
        playSound: true,
        vibrate: true,
      };
      notificationManager.showNotification(
        1,
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
