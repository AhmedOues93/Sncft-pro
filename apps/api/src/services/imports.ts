import { ApiError } from '../errors.js';
import type { ImportIssue, ParsedFare, ParsedStop } from '../types.js';

interface SchedulePreview {
  summary: Record<string, number>;
  issues: ImportIssue[];
  stops: ParsedStop[];
  stations: string[];
}

interface FarePreview {
  summary: Record<string, number>;
  issues: ImportIssue[];
  fares: ParsedFare[];
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    return row;
  });
}

export function normalizeStationName(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parseTime(value: string, rowNumber: number, fieldName: string, issues: ImportIssue[]): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) {
    issues.push({ severity: 'error', sourceFile: 'schedules.csv', rowNumber, fieldName, code: 'TIME_FORMAT', message: `Invalid ${fieldName}` });
    return 0;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 47 || minutes > 59) {
    issues.push({ severity: 'error', sourceFile: 'schedules.csv', rowNumber, fieldName, code: 'TIME_VALUE', message: `Invalid ${fieldName} value` });
    return 0;
  }

  return hours * 60 + minutes;
}

export function previewSchedulesCsv(csvText: string): SchedulePreview {
  const rows = parseCsv(csvText);
  const issues: ImportIssue[] = [];
  const grouped = new Map<string, ParsedStop[]>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const lineCode = row.line || row.line_code;
    const station = row.station;
    const stationOrder = Number(row.station_order);

    if (!lineCode || !station || !Number.isFinite(stationOrder)) {
      issues.push({ severity: 'error', sourceFile: 'schedules.csv', rowNumber, code: 'REQUIRED_FIELDS', message: 'line, station and station_order are required' });
      return;
    }

    const tripKey = `${lineCode}:${row.train_number}:${row.direction}:${row.service_code}:${row.valid_from}:${row.valid_to}`;
    const arrival = row.arrival_time || row.time || row.departure_time;
    const departure = row.departure_time || row.time || row.arrival_time;
    const arrivalRaw = parseTime(arrival, rowNumber, 'arrival_time', issues);
    const departureRaw = parseTime(departure, rowNumber, 'departure_time', issues);

    if (!grouped.has(tripKey)) grouped.set(tripKey, []);
    grouped.get(tripKey)?.push({
      lineCode,
      lineName: row.line_name || lineCode,
      season: row.season || 'unknown',
      validFrom: row.valid_from,
      validTo: row.valid_to,
      direction: row.direction || 'outbound',
      trainNumber: row.train_number || 'unknown',
      serviceCode: row.service_code || 'DAILY',
      stationOrder,
      station,
      arrivalTime: arrival,
      departureTime: departure,
      arrivalMinutes: arrivalRaw,
      departureMinutes: departureRaw,
      dayOffset: 0,
    });
  });

  const stops: ParsedStop[] = [];
  for (const tripStops of grouped.values()) {
    tripStops.sort((a, b) => a.stationOrder - b.stationOrder);
    let offset = 0;
    let previous = -1;
    tripStops.forEach((stop) => {
      if (previous >= 0 && stop.arrivalMinutes < previous % (24 * 60)) offset += 1;
      stop.arrivalMinutes += offset * 24 * 60;
      stop.departureMinutes += offset * 24 * 60;
      if (stop.departureMinutes < stop.arrivalMinutes) stop.departureMinutes += 24 * 60;
      stop.dayOffset = offset;
      previous = stop.departureMinutes;
      stops.push(stop);
    });
  }

  const hasErrors = issues.some((issue) => issue.severity === 'error');

  return {
    summary: {
      total_rows: rows.length,
      trips_count: grouped.size,
      stop_times_count: stops.length,
      calendars_count: new Set(stops.map((s) => `${s.serviceCode}:${s.validFrom}:${s.validTo}`)).size,
      warnings_count: issues.filter((i) => i.severity === 'warning').length,
      errors_count: issues.filter((i) => i.severity === 'error').length,
      status: Number(hasErrors ? 0 : 1),
    },
    issues,
    stops,
    stations: Array.from(new Set(stops.map((s) => normalizeStationName(s.station)))),
  };
}

export function previewFaresCsv(csvText: string): FarePreview {
  const rows = parseCsv(csvText);
  const issues: ImportIssue[] = [];

  const fares: ParsedFare[] = rows.map((row, index) => {
    const rowNumber = index + 2;
    const amount = Number(row.amount || row.fare || '0');
    if (!Number.isFinite(amount) || amount < 0) {
      issues.push({ severity: 'error', sourceFile: 'fares.csv', rowNumber, fieldName: 'amount', code: 'INVALID_AMOUNT', message: 'Invalid fare amount' });
    }
    return {
      lineCode: row.line || row.line_code || 'ALL',
      origin: normalizeStationName(row.origin || row.origin_station || row.origin_station_id || ''),
      destination: normalizeStationName(row.destination || row.destination_station || row.destination_station_id || ''),
      amount,
      currency: row.currency || 'TND',
      fareType: row.fare_type || row.ticket_type || row.fare_class || 'normal',
      sections: Number(row.sections || row.section_count || 0) || undefined,
      validFrom: row.valid_from || undefined,
      validTo: row.valid_to || undefined,
    };
  });

  return {
    summary: {
      total_rows: rows.length,
      fare_rows_count: fares.length,
      warnings_count: issues.filter((i) => i.severity === 'warning').length,
      errors_count: issues.filter((i) => i.severity === 'error').length,
    },
    issues,
    fares,
  };
}

export function ensureBodyText(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, `${fieldName} is required`);
  return value;
}
