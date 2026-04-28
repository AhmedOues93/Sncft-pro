const REQUIRED_COLUMNS = [
  'line',
  'line_name',
  'season',
  'valid_from',
  'valid_to',
  'direction',
  'train_number',
  'service_code',
  'station_order',
  'station',
];

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeHeader(header) {
  return String(header)
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, '')
    .replace(/\s+/g, '_');
}

function firstValue(row, keys, fallback = '') {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return fallback;
}

function padTime(raw) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(raw).trim());
  if (!match) return String(raw).trim();

  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
}

export function parseCsv(csvText) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });

    return row;
  });
}

export function parseScheduleCsv(csvText) {
  return parseCsv(csvText);
}

export function parseFareCsv(csvText) {
  return parseCsv(csvText);
}

export function normalizeStationName(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeTime(timeValue) {
  const value = String(timeValue || '').trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);

  if (!match) throw new Error(`Invalid time format: ${timeValue}`);

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 47 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time value: ${timeValue}`);
  }

  return hours * 60 + minutes;
}

function buildTripKey(row) {
  const tripId = firstValue(row, ['trip_id', 'external_trip_id']);
  if (tripId) return tripId;

  const lineCode = firstValue(row, ['line', 'line_code'], 'UNKNOWN');
  const trainNumber = firstValue(row, ['train_number', 'train'], 'UNKNOWN');
  const direction = firstValue(row, ['direction'], 'unknown');
  const serviceCode = firstValue(row, ['service_code', 'service_id'], 'daily');

  return `${lineCode}:${trainNumber}:${direction}:${serviceCode}`;
}

export function detectOvernightStops(rows) {
  const byTrip = new Map();

  for (const row of rows) {
    const tripKey = buildTripKey(row);
    if (!byTrip.has(tripKey)) byTrip.set(tripKey, []);
    byTrip.get(tripKey).push(row);
  }

  const normalizedStops = [];

  for (const [tripKey, tripRows] of byTrip.entries()) {
    tripRows.sort((a, b) => {
      const aOrder = Number(firstValue(a, ['stop_sequence', 'station_order'], '0'));
      const bOrder = Number(firstValue(b, ['stop_sequence', 'station_order'], '0'));
      return aOrder - bOrder;
    });

    let dayOffset = 0;
    let previousDepartureMinutes = null;

    for (const row of tripRows) {
      const arrivalRaw = firstValue(row, ['arrival_time', 'time', 'departure_time']);
      const departureRaw = firstValue(row, ['departure_time', 'time', 'arrival_time']);

      const arrivalBaseMinutes = normalizeTime(arrivalRaw);
      const departureBaseMinutes = normalizeTime(departureRaw);

      if (
        previousDepartureMinutes !== null &&
        arrivalBaseMinutes < previousDepartureMinutes % (24 * 60)
      ) {
        dayOffset += 1;
      }

      const arrivalMinutes = arrivalBaseMinutes + dayOffset * 24 * 60;
      let departureMinutes = departureBaseMinutes + dayOffset * 24 * 60;

      if (departureMinutes < arrivalMinutes) {
        departureMinutes += 24 * 60;
      }

      normalizedStops.push({
        ...row,
        tripKey,
        externalTripId: tripKey,
        lineCode: firstValue(row, ['line', 'line_code'], 'UNKNOWN'),
        lineName: firstValue(row, ['line_name'], ''),
        season: firstValue(row, ['season'], ''),
        validFrom: firstValue(row, ['valid_from', 'validFrom'], ''),
        validTo: firstValue(row, ['valid_to', 'validTo'], ''),
        direction: firstValue(row, ['direction'], ''),
        serviceCode: firstValue(row, ['service_code', 'service_id'], 'daily'),
        trainNumber: firstValue(row, ['train_number', 'train'], ''),
        stationId: firstValue(row, ['station_id'], normalizeStationName(firstValue(row, ['station', 'station_name']))),
        stationName: firstValue(row, ['station', 'station_name']),
        stationOrder: Number(firstValue(row, ['station_order', 'stop_sequence'], '0')),
        stopSequence: Number(firstValue(row, ['station_order', 'stop_sequence'], '0')),
        arrivalDisplayTime: padTime(arrivalRaw),
        departureDisplayTime: padTime(departureRaw),
        arrivalMinutes,
        departureMinutes,
        dayOffset,
      });

      previousDepartureMinutes = departureMinutes;
    }
  }

  return normalizedStops;
}

function validateRequiredFields(row, rowNumber, issues) {
  const hasTrip = Boolean(firstValue(row, ['trip_id', 'train_number', 'train']));
  const hasStation = Boolean(firstValue(row, ['station_id', 'station', 'station_name']));

  if (!hasTrip) {
    issues.push({
      severity: 'error',
      sourceFile: 'schedules.csv',
      rowNumber,
      fieldName: 'trip_id',
      code: 'TRIP_REQUIRED',
      message: 'trip/train identifier required',
    });
  }

  if (!hasStation) {
    issues.push({
      severity: 'error',
      sourceFile: 'schedules.csv',
      rowNumber,
      fieldName: 'station',
      code: 'STATION_REQUIRED',
      message: 'station required',
    });
  }

  for (const field of REQUIRED_COLUMNS) {
    const relaxedAlternativeExists =
      (field === 'line' && firstValue(row, ['line', 'line_code'])) ||
      (field === 'station_order' && firstValue(row, ['station_order', 'stop_sequence'])) ||
      (field === 'station' && firstValue(row, ['station', 'station_name', 'station_id']));

    if (!String(row[field] || '').trim() && !relaxedAlternativeExists) {
      issues.push({
        severity: 'warning',
        sourceFile: 'schedules.csv',
        rowNumber,
        fieldName: field,
        code: 'OPTIONAL_FIELD_MISSING',
        message: `${field} is missing`,
      });
    }
  }

  const order = Number(firstValue(row, ['station_order', 'stop_sequence'], '0'));
  if (!Number.isInteger(order) || order <= 0) {
    issues.push({
      severity: 'error',
      sourceFile: 'schedules.csv',
      rowNumber,
      fieldName: 'station_order',
      code: 'STATION_ORDER_INVALID',
      message: 'station_order must be a positive integer',
    });
  }

  const timeValue = firstValue(row, ['arrival_time', 'departure_time', 'time']);
  try {
    normalizeTime(timeValue);
  } catch {
    issues.push({
      severity: 'error',
      sourceFile: 'schedules.csv',
      rowNumber,
      fieldName: 'time',
      code: 'TIME_INVALID',
      message: 'time must use HH:mm format',
    });
  }
}

function buildNormalizedImportOutput(validRows) {
  const tripMap = new Map();
  const calendarMap = new Map();

  for (const row of validRows) {
    if (!tripMap.has(row.tripKey)) {
      tripMap.set(row.tripKey, {
        externalTripId: row.tripKey,
        lineCode: row.lineCode,
        serviceCode: row.serviceCode,
        trainNumber: row.trainNumber,
        direction: row.direction,
        headsign: row.stationName,
        validFrom: row.validFrom,
        validTo: row.validTo,
      });
    }

    if (!calendarMap.has(row.serviceCode)) {
      calendarMap.set(row.serviceCode, {
        serviceCode: row.serviceCode,
        validFrom: row.validFrom,
        validTo: row.validTo,
        season: row.season,
      });
    }
  }

  return {
    trips: Array.from(tripMap.values()),
    stopTimes: validRows.map((row) => ({
      externalTripId: row.tripKey,
      stationId: row.stationId,
      stationName: row.stationName,
      stationOrder: row.stationOrder,
      stopSequence: row.stopSequence,
      arrivalDisplayTime: row.arrivalDisplayTime,
      departureDisplayTime: row.departureDisplayTime,
      arrivalMinutes: row.arrivalMinutes,
      departureMinutes: row.departureMinutes,
      dayOffset: row.dayOffset,
    })),
    calendars: Array.from(calendarMap.values()),
  };
}

export function validateScheduleRows(rows) {
  const issues = [];

  rows.forEach((row, index) => {
    validateRequiredFields(row, index + 2, issues);
  });

  let validRows = [];
  let normalized = {
    trips: [],
    stopTimes: [],
    calendars: [],
  };

  if (!issues.some((issue) => issue.severity === 'error')) {
    validRows = detectOvernightStops(rows);
    normalized = buildNormalizedImportOutput(validRows);
  }

  return {
    validRows,
    normalized,
    normalizedOutput: normalized,
    issues: issues.map((issue) => ({
      sourceFile: 'schedules.csv',
      code: 'VALIDATION_ISSUE',
      ...issue,
    })),
  };
}

export function parseAndValidateFares(rows) {
  const issues = [];

  const fares = rows.map((row, index) => {
    const rowNumber = index + 2;
    const amount = Number(firstValue(row, ['amount', 'fare', 'price', 'tarif'], '0'));

    if (!Number.isFinite(amount) || amount < 0) {
      issues.push({
        severity: 'error',
        sourceFile: 'fares.csv',
        rowNumber,
        fieldName: 'amount',
        code: 'FARE_INVALID',
        message: 'Fare amount must be >= 0',
      });
    }

    return {
      lineCode: firstValue(row, ['line', 'line_code'], 'ALL'),
      origin: normalizeStationName(firstValue(row, ['origin', 'origin_station', 'origin_station_id'])),
      destination: normalizeStationName(firstValue(row, ['destination', 'destination_station', 'destination_station_id'])),
      amount,
      currency: firstValue(row, ['currency'], 'TND'),
    };
  });

  return { fares, issues };
}
