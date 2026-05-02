import Constants from 'expo-constants';
import type { JourneyResponse, StationItem } from '../types';

const configuredBase = String(Constants.expoConfig?.extra?.apiBaseUrl || '').trim();
export const DEFAULT_API_BASE = configuredBase || 'http://127.0.0.1:3000';

async function readJson<T>(path: string): Promise<T> {
  const response = await fetch(`${DEFAULT_API_BASE}${path}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || 'Connexion API indisponible.');
  }

  return data as T;
}

export async function searchStations(query: string): Promise<StationItem[]> {
  const text = query.trim();
  if (!text) return [];
  const data = await readJson<{ items?: StationItem[] }>(
    `/stations/search?q=${encodeURIComponent(text)}&limit=8`,
  );
  return Array.isArray(data.items) ? data.items : [];
}

export async function fetchJourneyBatch(
  originStationId: string,
  destinationStationId: string,
  datetime: string,
  passengers: number,
  offset: number,
): Promise<JourneyResponse> {
  return readJson<JourneyResponse>(
    `/journeys/search?originStationId=${encodeURIComponent(
      originStationId,
    )}&destinationStationId=${encodeURIComponent(
      destinationStationId,
    )}&datetime=${encodeURIComponent(datetime)}&passengers=${passengers}&offset=${offset}&limit=5`,
  );
}
