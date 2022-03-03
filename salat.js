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
  RefreshControl,
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
import EventEmitter from './event-emitter';
const {BGTimerModule} = NativeModules;
const eventEmitterNative = new NativeEventEmitter(BGTimerModule);

const db = firestore();

const helper = new Helper();
var Sound = require('react-native-sound');
Sound.setCategory('Playback');
var ding = new Sound('azan.m4a', Sound.MAIN_BUNDLE, error => {
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
  let count = 0;
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
  const [showPlayButton, setShowPlayButton] = useState(true);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [hasFetchLocation, setHasFetchLocation] = useState(false);
  const [address, setAddress] = useState(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const [ringAzaan, setRingAzaan] = useState(false);

  const messaging = firebase.messaging();

  // background refresh

  const wait = timeout => {
    return new Promise(resolve => setTimeout(resolve, timeout));
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    getCurrentPosition(false);
    wait(2000).then(() => setRefreshing(false));
  }, []);

  async function initBackgroundFetch() {
    // BackgroundFetch event handler.

    const onEvent = async taskId => {
      console.log('[BackgroundFetch] task: ', taskId);
      // Do your background work...
      await addEvent(taskId);
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
      {minimumFetchInterval: 300},
      onEvent,
      onTimeout,
    );

    console.log('[BackgroundFetch] configure status: ', status);
  }

  function addEvent(taskId, updatedSalatData) {
    // Simulate a possibly long-running asynchronous task with a Promise.
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        setHasLocationPermission(true);
        getCurrentPosition(true);
        resolve('foo');
      }, 300);
    });
  }

  function getMessagingPermission(salatDetails, pos) {
    requestUserPermission()
      .then(enabled => {
        if (enabled) {
          if (Platform.OS == 'ios') {
            messaging
              .getToken()
              .then(_token => {
                console.log('firebase token', _token);
                updateStore(salatDetails, _token, pos);
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

  useEffect(() => {
    const onToken = eventData => {
      console.log('Notification token', eventData);
      if (eventData.tokenNotify.token) {
        // fetchSalatDetails(position, false, true, true);
        getUserLocationPermission();
      }
    };
    const listener = EventEmitter.addListener('notificationToken', onToken);

    return () => {
      listener.remove();
    };
  }, []);

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
  const subscription = eventEmitterNative.addListener(
    'onSalatAlert',
    onSalatAlert,
  );

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

  function fetchSalatDetails(
    pos,
    isBackgroundRefresh,
    isStaticData,
    isNotificationEnabled,
  ) {
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

    setSalatTimings(
      pos,
      salatTimes,
      isBackgroundRefresh,
      isStaticData,
      isNotificationEnabled,
    );
  }

  function setSalatTimings(
    pos,
    salatTimes,
    isBackgroundRefresh,
    isStaticData,
    isNotificationEnabled,
  ) {
    const updatedSalatData = helper.mergeArrayObjects(salatData, salatTimes);
    // console.log(updatedSalatData);
    setSalatData(updatedSalatData);
    if (isBackgroundRefresh && !isStaticData) {
      getMessagingPermission(updatedSalatData, pos);
    } else if (isNotificationEnabled) {
      getMessagingPermission(updatedSalatData, pos);
    }
  }

  async function checkIfTokenExistsInAnotherDocument(id, token) {
    const usersInfoRef = db.collection('userInfo');
    const snapshot = await usersInfoRef.get();
    snapshot.forEach(doc => {
      console.log(doc.id, '=>', doc.data());
      if (doc.id !== id) {
        doc.data().tokens.forEach(existingToken => {
          if (existingToken === token) {
            var index = doc.data().tokens.indexOf(token);
            if (index !== -1) {
              doc.data().tokens.splice(index, 1);
              db.collection('userInfo').doc(doc.id).update({
                tokens: doc.data().tokens,
              });
            }
          }
        });
      }
    });
  }

  function updateUserInfo(id, token, salatTimes, position) {
    checkIfTokenExistsInAnotherDocument(id, token);

    const userRef = db
      .collection('userInfo')
      .doc(id)
      .update({
        tokens: firestore.FieldValue.arrayUnion(token),
      });
    userRef
      .then(val => {
        console.log('token updated');
        updateUserSalatTime(salatTimes, position, 0);
        db.collection('logs').add({
          token: val ? val : null,
          datetime: new Date(),
          isSameZone: true,
        });
      })
      .catch(error => {
        console.log(error);
        db.collection('logs').add({
          error: error,
          datetime: new Date(),
          isSameZone: true,
        });

        if (error.code === 'firestore/not-found') {
          const userAdd = db
            .collection('userInfo')
            .doc(id)
            .set({
              tokens: firestore.FieldValue.arrayUnion(token),
            });
          userAdd
            .then(val => {
              console.log('token added');
              for (let index = 1; index <= 2; index++) {
                updateUserSalatTime(salatTimes, position, 0);
              }

              db.collection('logs').add({
                token: val ? val : null,
                datetime: new Date(),
                isSameZone: false,
              });
            })
            .catch(error => {
              console.log('error happen');
              db.collection('logs').add({
                error: error,
                datetime: new Date(),
                isSameZone: false,
              });
            });
        }
      });
  }

  function updateUserSalatTime(salatTimes, position, numberOfNextDays) {
    let currentDay = helper.getDate();
    let weekDay = helper.weekday[currentDay.weekday];
    let month = helper.monthList[currentDay.month - 1].abbr;
    var tz =
      moment.tz.zone(helper.getTimeZone()).utcOffset(position.timestamp) / 60.0;
    const tempTimeZone = tz.toString().split('.');
    let timeZone = null;
    if (tempTimeZone[1]) {
      timeZone =
        (Math.sign(tempTimeZone[0]) === -1 ? '+' : '-') +
        Math.abs(tempTimeZone[0]).toString() +
        (':' + tempTimeZone[1] && tempTimeZone[1] * 6 !== '60'
          ? (tempTimeZone[1] * 6).toString()
          : '00');
      console.log(timeZone);
    } else {
      timeZone = 0;
    }
    if (numberOfNextDays > 0) {
      currentDay.day = currentDay.day + numberOfNextDays;
    }
    salatTimes.forEach(prayer => {
      const userId =
        position.coords.latitude.toFixed(1) +
        ':' +
        position.coords.longitude.toFixed(1) +
        ':' +
        prayer.id +
        ':' +
        numberOfNextDays;

      const temp = prayer.namaz ? prayer.namaz.split(':') : [];

      let addTask = false;
      if (temp[0] > currentDay.hour) {
        addTask = true;
      } else if (temp[0] == currentDay.hour) {
        if (temp[1] > currentDay.minute) {
          addTask = true;
        }
      }

      if (!addTask && numberOfNextDays === 0) {
        return;
      }
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
          if (count <= 14) {
            updateUserSalatTime(salatTimes, position, ++count);
          } else if (count > 14) {
            return;
          }
        })
        .catch(error => console.log(error));
    });
  }

  function updateStore(salatTimes, token, position) {
    console.log('reached to update store');

    const id =
      position.coords.latitude.toFixed(1) +
      ':' +
      position.coords.longitude.toFixed(1);

    updateUserInfo(id, token, salatTimes, position);
  }

  function getLocationDetails(pos) {
    const googleMapApiKey = 'AIzaSyCZJLDE9bxYzifFTyu1IN6rnjupzDDeNmo';
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${pos.coords.latitude},${pos.coords.longitude}&key=${googleMapApiKey}`;
    axios
      .get(url)
      .then(response => {
        setAddress(
          response.data.results[0].address_components[2].long_name +
            ' ' +
            response.data.results[0].address_components[3].long_name,
        );
      })
      .catch(error => console.log(error));
  }

  function getCurrentPosition(isBackgroundRefresh) {
    Geolocation.getCurrentPosition(
      position => {
        setHasFetchLocation(true);
        setPosition(position);
        getLocationDetails(position);
        fetchSalatDetails(position, isBackgroundRefresh, false, true);
      },
      error => {
        // See error code charts below.
        setHasLocationPermission(false);
        fetchSalatDetails(position, isBackgroundRefresh, true, false);
        console.log(
          'location access was not given yet ',
          error.code,
          error.message,
        );
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  }

  function getUserLocationPermission() {
    Geolocation.requestAuthorization('whenInUse').then(value => {
      if (value === 'granted') {
        setHasLocationPermission(true);
        getCurrentPosition(false);
      } else {
        getCurrentPosition(false);
        setHasLocationPermission(false);
      }
    });
  }
  useEffect(() => {
    ding.setVolume(1);
    initBackgroundFetch();
    setIsLoaded(true);
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
          <Text style={styles.sectionAddress}>{address ? address : ''}</Text>
        </View>
        <View>
          <FlatList
            data={salatData}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
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
    marginBottom: 5,
  },
  sectionAddress: {
    fontSize: 18,
    fontWeight: '400',
    color: '#fff',
    marginTop: 0,
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
