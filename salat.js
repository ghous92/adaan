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
  ImageBackground,
} from 'react-native';
import React, {useEffect, useState} from 'react';
import Geolocation, {
  hasLocationPermission,
} from 'react-native-geolocation-service';
import Helper from './helper';

import moment from 'moment';
import * as m from 'moment-timezone';
import BackgroundTimer from 'react-native-background-timer';
import {notificationManager} from './NotificationManager';
import BackgroundFetch from 'react-native-background-fetch';

var Sound = require('react-native-sound');
Sound.setCategory('Playback');
var ding = new Sound('best-azan.mp3', Sound.MAIN_BUNDLE, error => {
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

const Salat = props => {
  const [isloaded, setIsLoaded] = useState(false);
  const [position, setPosition] = useState(null);
  const [currentTime, setCurrentTime] = useState(null);
  const [isSalatTime, setIsSalatTime] = useState(false);
  const [events, setEvents] = useState();
  const [ringAzaan, setRingAzaan] = useState(false);
  const [currentSalatName, setCurrentSalatName] = useState('');
  const [minuteLeft, setMinuteLeft] = useState(null);
  const [showPlayButton, setShowPlayButton] = useState(true);

  const play = () => {
    setShowPlayButton(false);
    ding.play(success => {
      if (success) {
        console.log('successfully finished playing');
        setShowPlayButton(true);
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
  const [salatData, setSalatData] = useState([
    {
      id: 'bd7acbea-c1b1-46c2-aed5-3ad53abb28ba',
      title: 'Fajr',
      disabled: true,
      turnOn: false,
    },
    {
      id: '3ac68afc-c605-48d3-a4f8-fbd91aa97f63',
      title: 'Dhuhr',
      disabled: false,
      turnOn: false,
    },
    {
      id: '58694a0f-3da1-471f-bd96-145571e29d72',
      title: 'Asr',
      disabled: false,
      turnOn: false,
    },
    {
      id: '58694a0f-3da1-471f-bd96-145571e29d73',
      title: 'Maghrib',
      disabled: false,
      turnOn: false,
    },
    {
      id: '55694a0f-3da1-471g-bd96-145571e29d73',
      title: 'Isha',
      disabled: false,
      turnOn: false,
    },
  ]);

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
    console.log('lat long timezone', lat, lng, helper.getTimeZone());
    // var tz = moment().utcOffset() / 60.0;
    var tz = -(
      moment.tz.zone(helper.getTimeZone()).utcOffset(position.timestamp) / 60.0
    );
    console.log('offset', tz);

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

  function fetchSalatDetails(position) {
    var data = get_input_data(position);
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

    salatTimes = [
      {
        id: 'bd7acbea-c1b1-46c2-aed5-3ad53abb28ba',
        namaz: helper.timeString(solnoon - twilight, 2),
      },
      {
        id: '3ac68afc-c605-48d3-a4f8-fbd91aa97f63',
        namaz: helper.timeString(solnoon, 2),
      },
      {
        id: '58694a0f-3da1-471f-bd96-145571e29d72',
        namaz: helper.timeString(solnoon + asarTime, 2),
      },
      {
        id: '58694a0f-3da1-471f-bd96-145571e29d73',
        namaz: sunset,
      },
      {
        id: '55694a0f-3da1-471g-bd96-145571e29d73',
        namaz: helper.timeString(solnoon + twilight, 2),
      },
    ];

    setSalatTimings(salatTimes);
    // const currentTime = helper.getDate();
    // calculateNearestSalatTime(currentTime.hour, currentTime.minute);
  }

  function setSalatTimings(salatTimes) {
    const updatedSalatData = helper.mergeArrayObjects(salatData, salatTimes);
    // console.log(updatedSalatData);
    setSalatData(updatedSalatData);
    setIsLoaded(true);
    initBackgroundFetch(updatedSalatData);
  }

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

  useEffect(() => {
    ding.setVolume(1);

    Geolocation.requestAuthorization('always');
    Geolocation.getCurrentPosition(
      position => {
        setPosition(position);
        fetchSalatDetails(position);
      },
      error => {
        // See error code charts below.
        console.log(error.code, error.message);
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );

    return () => {
      ding.release();
    };
  }, []);

  useEffect(() => {
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
    if (ringAzaan) {
      notificationManager.showNotification(
        1,
        'Salat Time ',
        `Its  ${currentSalatName} Time `,
        {},
        options,
      );
    }
  }, [ringAzaan]);

  async function initBackgroundFetch(updatedSalatData) {
    // BackgroundFetch event handler.

    const onEvent = async taskId => {
      console.log('[BackgroundFetch] task: ', taskId);
      // Do your background work...
      await addEvent(taskId, updatedSalatData);
      // IMPORTANT:  You must signal to the OS that your task is complete.
      BackgroundFetch.finish(taskId);
    };

    // Timeout callback is executed when your Task has exceeded its allowed running-time.
    // You must stop what you're doing immediately BackgroundFetch.finish(taskId)
    const onTimeout = async taskId => {
      console.warn('[BackgroundFetch] TIMEOUT task: ', taskId);
      BackgroundFetch.finish(taskId);
    };

    // Initialize BackgroundFetch only once when component mounts.
    let status = await BackgroundFetch.configure(
      {minimumFetchInterval: 15},
      onEvent,
      onTimeout,
    );

    console.log('[BackgroundFetch] configure status: ', status);
  }

  function addEvent(taskId, updatedSalatData) {
    // Simulate a possibly long-running asynchronous task with a Promise.
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const currentTime = helper.getDate();

        setEvents('foo');
        setCurrentTime(
          currentTime.hour +
            ':' +
            currentTime.minute +
            ':' +
            currentTime.second,
        );
        calculateNearestSalatTime(
          updatedSalatData,
          currentTime.hour,
          currentTime.minute,
        );
        resolve('foo');
      }, 300);
    });
  }

  function calculateNearestSalatTime(
    updatedSalatData,
    currentHour,
    currentMinute,
  ) {
    const nearestSalat = updatedSalatData.find(item => {
      let salatTime = null;
      if (item.namaz) {
        salatTime = item.namaz.split(':');
      }
      return salatTime[0] >= currentHour;
    });
    const nearestTime = nearestSalat ? nearestSalat.namaz.split(':') : null;
    console.log('nearestTime', nearestTime);
    setCurrentSalatName(nearestSalat ? nearestSalat.title : null);
    if (nearestTime) {
      const timeInterval =
        parseInt(nearestTime[0]) * 60 +
        parseInt(nearestTime[1]) -
        (parseInt(currentHour) * 60 + parseInt(currentMinute));
      console.log(timeInterval);
      if (timeInterval <= 15 && timeInterval > 0) {
        startTimer(timeInterval);
      } else if (timeInterval === 0) {
        setRingAzaan(true);
      }
    } else {
      console.log('wait for the next day');
    }
  }

  useEffect(() => {
    if (ringAzaan) {
      BackgroundTimer.stopBackgroundTimer();
    }
  }, [ringAzaan]);

  function startTimer(timeInterval) {
    let countdown = 0;
    setMinuteLeft(parseInt(timeInterval) - parseInt(countdown));

    BackgroundTimer.runBackgroundTimer(() => {
      //code that will be called every 1 min
      countdown++;
      setMinuteLeft(parseInt(timeInterval) - parseInt(countdown));
      console.log('countdown', countdown);
      console.log('timeInterval', timeInterval);
      if (parseInt(timeInterval) - parseInt(countdown) === 0) {
        setRingAzaan(true);
        countdown = 1;
      }
    }, 60000);
  }

  const Item = ({value}) => (
    <View style={styles.item}>
      <View style={styles.sectionOne}>
        <Text style={styles.title}>{value.title}</Text>
      </View>
      <View>
        <Text style={styles.subTitle}> {value.namaz}</Text>
      </View>
    </View>
  );

  const renderItem = ({item}) => <Item disabled={item.disabled} value={item} />;
  return isloaded ? (
    <ImageBackground
      source={require('../adaan/assets/images/bg.jpg')}
      resizeMode="cover"
      style={styles.bgImage}>
      <SafeAreaView style={styles.sectionContainer}>
        <View>
          <Text style={styles.sectionTitle}>Salat</Text>
        </View>
        <View>
          <FlatList
            data={salatData}
            renderItem={renderItem}
            keyExtractor={item => item.id}
          />
        </View>
        <TouchableOpacity style={styles.playBtn}>
          {showPlayButton ? (
            <Button
              color="#fff"
              title="Play Azaan"
              color="#fff"
              onPress={play}></Button>
          ) : (
            <Button color="#fff" title="Pause Azaan" onPress={pause}></Button>
          )}
        </TouchableOpacity>
        {minuteLeft > 0 && currentSalatName ? (
          <Text style={styles.info}>
            {minuteLeft} minute to {currentSalatName} Azaan time
          </Text>
        ) : null}
      </SafeAreaView>
    </ImageBackground>
  ) : null;
};

Salat.propTypes = {};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 15,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    marginTop: 10,
    marginLeft: 10,
    marginBottom: 10,
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
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: 28,
    marginVertical: 5,
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    borderRadius: 15,
    filter: 'grayscale(100%)',
  },
  header: {
    fontSize: 32,
    backgroundColor: '#fff',
  },
  sectionOne: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    color: '#fff',
  },
  subTitle: {
    fontSize: 18,
    color: '#fff',
  },
  playBtn: {
    padding: 10,
    backgroundColor: 'rgb(28,187,83)',
    width: '50%',
    margin: 20,
    borderRadius: 15,
    alignSelf: 'center',
  },
  bgImage: {
    height: '100%',
  },
  info: {
    fontSize: 18,
    color: '#fff',
    alignSelf: 'center',
  },
});
export default Salat;
