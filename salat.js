import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Button,
  ImageBackground,
  NativeModules,
  NativeEventEmitter,
  Platform,
} from 'react-native';
import firebase from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';

import React, {useEffect, useState} from 'react';
import Geolocation from 'react-native-geolocation-service';
import Helper from './helper';
import * as axios from 'axios';

import moment from 'moment';
import * as m from 'moment-timezone';
import BackgroundFetch from 'react-native-background-fetch';
const {BGTimerModule} = NativeModules;
const eventEmitter = new NativeEventEmitter(BGTimerModule);
const api = axios.create({baseURL: 'http://localhost:3000/'});

const db = firestore();

const helper = new Helper();
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

const Salat = props => {
  const [isloaded, setIsLoaded] = useState(false);
  const [position, setPosition] = useState({
    coords: {
      accuracy: 25.541419948202723,
      altitude: 205.17584991455078,
      altitudeAccuracy: 16.47088623046875,
      heading: -1,
      latitude: 28.564209691838993,
      longitude: 77.39850825521523,
      speed: -1,
    },
    timestamp: 1643142451560.493,
  });
  const [currentTime, setCurrentTime] = useState(null);
  const [events, setEvents] = useState();
  const [currentSalatName, setCurrentSalatName] = useState('');
  const [minuteLeft, setMinuteLeft] = useState(15);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [hasFetchLocation, setHasFetchLocation] = useState(false);

  const [ringAzaan, setRingAzaan] = useState(false);

  const messaging = firebase.messaging();

  async function requestUserPermission() {
    const authStatus = await messaging.requestPermission();
    console.log(authStatus);
    const enabled = authStatus === 1 || authStatus === 0;

    if (enabled) {
      console.log('Authorization status:', authStatus);
    }
    return enabled;
  }

  const onSalatAlert = status => {
    console.log('class', status);
    if (status.time === 'Done') {
      setRingAzaan(true);
    }
  };
  const subscription = eventEmitter.addListener('onSalatAlert', onSalatAlert);

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
    var tz =
      moment.tz.zone(helper.getTimeZone()).utcOffset(position.timestamp) / 60.0;
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
      tz: -tz,
    };

    return data;
  };

  function fetchSalatDetails(pos) {
    var data = get_input_data(pos);
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

    const salatTimes = [
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
  }

  function setSalatTimings(salatTimes) {
    const updatedSalatData = helper.mergeArrayObjects(salatData, salatTimes);
    // console.log(updatedSalatData);
    setSalatData(updatedSalatData);
    // initBackgroundFetch(updatedSalatData);
    requestUserPermission()
      .then(enabled => {
        if (enabled) {
          if (Platform.OS == 'ios') {
            messaging
              .getToken()
              .then(_token => {
                console.log('firebase token', _token);
                updateStore(salatTimes, _token);
              })
              .catch(error => {
                console.log(error);
              });
          }
        }
      })
      .catch(error => {
        console.log(error);
      });
  }

  function updateUserInfo(id, token) {
    const userRef = db
      .collection('userInfo')
      .doc(id)
      .update({
        tokens: firestore.FieldValue.arrayUnion(token),
      });
  }

  function updateStore(salatTimes, token) {
    console.log('reached to update store');
    let currentDay = helper.getDate();
    let weekDay = helper.weekday[currentDay.weekday];
    let month = helper.monthList[currentDay.month - 1].abbr;
    var tz =
      moment.tz.zone(helper.getTimeZone()).utcOffset(position.timestamp) / 60.0;
    const id =
      position.coords.latitude.toFixed(2) +
      ':' +
      position.coords.longitude.toFixed(2);

    updateUserInfo(id, token);
    const tempTimeZone = tz.toString().split('.');
    const timeZone =
      (Math.sign(tempTimeZone[0]) === -1 ? '+' : '-') +
      Math.abs(tempTimeZone[0]).toString() +
      (':' + tempTimeZone[1] * 6 !== '60'
        ? (tempTimeZone[1] * 6).toString()
        : '00');
    console.log(timeZone);
    salatTimes.forEach(prayer => {
      const userId =
        position.coords.latitude.toFixed(2) +
        ':' +
        position.coords.longitude.toFixed(2) +
        ':' +
        prayer.id;
      const temp = prayer.namaz.split(':');

      let addTask = false;
      if (temp[0] > currentDay.hour) {
        addTask = true;
      } else if (temp[0] == currentDay.hour) {
        if (temp[1] > currentDay.minute) {
          addTask = true;
        }
      }
      if (addTask) {
        console.log(
          new Date(
            month +
              ' ' +
              currentDay.day +
              ', ' +
              currentDay.year +
              ' ' +
              prayer.namaz +
              ' GMT' +
              timeZone,
          ),
        );

        db.collection('tasks')
          .doc(userId)
          .set({
            worker: 'makeSalatNotification',
            status: 'scheduled',
            performAt: new Date(
              month +
                ' ' +
                currentDay.day +
                ', ' +
                currentDay.year +
                ' ' +
                prayer.namaz +
                ' GMT' +
                timeZone,
            ),
            options: {userId: userId},
          })
          .then(() => {
            console.log('task added!');
          })
          .catch(error => console.log(error));
      }
    });
  }

  function getCurrentPosition() {
    Geolocation.getCurrentPosition(
      position => {
        setHasFetchLocation(true);
        setPosition(position);
        fetchSalatDetails(position);
      },
      error => {
        // See error code charts below.
        setHasLocationPermission(false);
        fetchSalatDetails(position);
        console.log(error.code, error.message);
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  }

  useEffect(() => {
    ding.setVolume(1);
    setIsLoaded(true);

    Geolocation.requestAuthorization('whenInUse').then(value => {
      if (value === 'granted') {
        setHasLocationPermission(true);
        getCurrentPosition();
      } else {
        getCurrentPosition();
        setHasLocationPermission(false);
      }
    });

    // getCurrentPosition();

    return () => {
      ding.release();
    };
  }, []);

  useEffect(() => {
    if (ringAzaan) {
      subscription.remove();
    }
  }, [ringAzaan]);

  const Item = ({value}) => (
    <View style={styles.item}>
      <View style={styles.sectionOne}>
        <Text style={styles.title}>{value.title}</Text>
      </View>
      <View>
        {value.namaz ? (
          <Text style={styles.subTitle}> {value.namaz}</Text>
        ) : null}
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
        {!hasLocationPermission ? (
          <>
            <Text style={styles.info}>
              Turning on location and reloading app ensures accurate prayer
              times
            </Text>
          </>
        ) : null}
        {hasLocationPermission && !hasFetchLocation ? (
          <>
            <Text style={styles.info}>Fetching Location ...</Text>
          </>
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
    padding: '7vh 15%',
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
    textAlign: 'center',
  },
});
export default Salat;
