import type { TripHistoryEntry } from '../types';
import { getStoredItem, setStoredItem } from './deviceStorage';

const TRIPS_KEY = 'sncft_passenger_mobile_trips_by_account';

type TripMap = Record<string, TripHistoryEntry[]>;

async function readTripMap(): Promise<TripMap> {
  try {
    const raw = await getStoredItem(TRIPS_KEY);
    return raw ? (JSON.parse(raw) as TripMap) : {};
  } catch {
    return {};
  }
}

export async function getTripsForAccount(email: string): Promise<TripHistoryEntry[]> {
  const store = await readTripMap();
  return store[email] || [];
}

export async function saveTripsForAccount(
  email: string,
  items: TripHistoryEntry[],
): Promise<void> {
  const store = await readTripMap();
  store[email] = items;
  await setStoredItem(TRIPS_KEY, JSON.stringify(store));
}
