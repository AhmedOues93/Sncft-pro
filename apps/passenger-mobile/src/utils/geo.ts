import * as Location from 'expo-location';
import { Platform } from 'react-native';

export const stationCoordinates = [
  { name: 'Tunis Ville', lat: 36.8008, lng: 10.18 },
  { name: 'Tunis', lat: 36.8065, lng: 10.1815 },
  { name: 'Hammam Lif', lat: 36.7272, lng: 10.3417 },
  { name: 'Ezzahra', lat: 36.7436, lng: 10.3082 },
  { name: 'Ez Zahra', lat: 36.7436, lng: 10.3082 },
  { name: 'Bougatfa', lat: 36.799, lng: 10.102 },
  { name: 'Goubaa', lat: 36.812, lng: 10.075 },
  { name: 'Mellassine', lat: 36.79, lng: 10.155 },
  { name: 'Erriadh', lat: 36.699, lng: 10.402 },
  { name: 'Ezzouhour 2', lat: 36.8012, lng: 10.1125 },
  { name: 'Sidi Rezig', lat: 36.7704, lng: 10.2468 },
  { name: 'Rades', lat: 36.7698, lng: 10.2741 },
  { name: 'Megrine', lat: 36.7691, lng: 10.2338 },
];

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

async function locateOnWeb(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La géolocalisation n’est pas disponible sur cet appareil.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => reject(new Error('Autorisation de localisation refusée.')),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

export async function locateNearestStation(): Promise<
  | {
      station: (typeof stationCoordinates)[number];
      distanceKm: number;
      walkingMinutes: number;
    }
  | null
> {
  let coords: { latitude: number; longitude: number };

  if (Platform.OS === 'web') {
    coords = await locateOnWeb();
  } else {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Autorisation de localisation refusée.');
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  }

  const nearest = stationCoordinates
    .map((station) => ({
      station,
      distanceKm: haversineDistanceKm(
        coords.latitude,
        coords.longitude,
        station.lat,
        station.lng,
      ),
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm)[0];

  if (!nearest) return null;

  const walkingMinutes = Math.max(1, Math.round((nearest.distanceKm / 4.5) * 60));

  return {
    station: nearest.station,
    distanceKm: nearest.distanceKm,
    walkingMinutes,
  };
}
