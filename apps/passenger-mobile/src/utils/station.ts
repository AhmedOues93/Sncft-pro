import type { StationItem } from '../types';

export function normalizeText(value: string): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function titleCase(value: string): string {
  return String(value || '')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function bestStationMatch(query: string, items: StationItem[]): StationItem | null {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return null;

  const ranked = items.map((item) => ({
    item,
    name: normalizeText(item.name),
    id: normalizeText(item.id),
  }));

  const exact = ranked.find((entry) => entry.name === normalizedQuery || entry.id === normalizedQuery);
  if (exact) return exact.item;

  const startsWith = ranked.filter(
    (entry) => entry.name.startsWith(normalizedQuery) || entry.id.startsWith(normalizedQuery),
  );
  if (startsWith.length === 1) return startsWith[0].item;

  const includes = ranked.filter(
    (entry) => entry.name.includes(normalizedQuery) || entry.id.includes(normalizedQuery),
  );
  if (includes.length === 1) return includes[0].item;

  return null;
}
