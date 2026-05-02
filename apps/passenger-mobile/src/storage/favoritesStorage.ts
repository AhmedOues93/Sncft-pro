import type { FavoriteJourneySnapshot } from '../types';
import { getStoredItem, setStoredItem } from './deviceStorage';

const FAVORITES_KEY = 'sncft_passenger_mobile_favorites_by_account';

type FavoriteMap = Record<string, FavoriteJourneySnapshot[]>;

async function readFavoriteMap(): Promise<FavoriteMap> {
  try {
    const raw = await getStoredItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as FavoriteMap) : {};
  } catch {
    return {};
  }
}

export async function getFavoritesForAccount(email: string): Promise<FavoriteJourneySnapshot[]> {
  const store = await readFavoriteMap();
  return store[email] || [];
}

export async function saveFavoritesForAccount(
  email: string,
  items: FavoriteJourneySnapshot[],
): Promise<void> {
  const store = await readFavoriteMap();
  store[email] = items;
  await setStoredItem(FAVORITES_KEY, JSON.stringify(store));
}
