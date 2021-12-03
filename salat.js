import PropTypes from 'prop-types';
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
} from 'react-native';
import React, {useEffect, useState} from 'react';
import Geolocation, {
  hasLocationPermission,
} from 'react-native-geolocation-service';
import SalatTime from './salat-time';

import Ionicons from 'react-native-vector-icons/Ionicons';

const Salat = props => {
  const [isloaded, setIsLoaded] = useState(false);
  const [position, setPosition] = useState(null);
  const data = [
    {
      id: 'bd7acbea-c1b1-46c2-aed5-3ad53abb28ba',
      title: 'Fajr',
    },
    {
      id: '3ac68afc-c605-48d3-a4f8-fbd91aa97f63',
      title: 'Dhuhr',
    },
    {
      id: '58694a0f-3da1-471f-bd96-145571e29d72',
      title: 'Asr',
    },
    {
      id: '58694a0f-3da1-471f-bd96-145571e29d73',
      title: 'Maghrib',
    },
    {
      id: '55694a0f-3da1-471f-bd96-145571e29d73',
      title: 'Isha',
    },
  ];
  useEffect(() => {
    Geolocation.requestAuthorization('always');
    Geolocation.getCurrentPosition(
      position => {
        setPosition(position);
        setIsLoaded(true);
      },
      error => {
        // See error code charts below.
        console.log(error.code, error.message);
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  }, []);

  const Item = ({title}) => (
    <View style={styles.item}>
      <Text style={styles.title}>{title}</Text>
      <SalatTime
        name={title}
        position={position}
        onComplete={callback => setIsLoaded(!callback)}
      />
    </View>
  );

  const renderItem = ({item}) => <Item title={item.title} />;

  return isloaded ? (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={item => item.id}
    />
  ) : null;
};

Salat.propTypes = {};
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
export default Salat;
