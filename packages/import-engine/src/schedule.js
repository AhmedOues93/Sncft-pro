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
  return line.split(',').map((value) => value.trim());
}

export function parseCsv(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
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
  return String(name)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeTime(timeValue) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(timeValue).trim());
  if (!match) throw new Error(`Invalid time format: ${timeValue}`);

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 47 || minutes < 0 || minutes > 59) throw new Error(`Invalid time value: ${timeValue}`);

  return hours * 60 + minutes;
}

export function detectOvernightStops(rows) {
  const byTripKey = new Map();

  for (const row of rows) {
    const tripId = row.trip_id ?? `${row.line}:${row.train_number}:${row.direction}:${row.service_code}`;
    if (!byTrip.has(tripId)) byTrip.set(tripId, []);
    byTrip.get(tripId).push(row);
  }

  const normalizedStops = [];

  for (const [tripId, tripRows] of byTrip.entries()) {
    tripRows.sort((a, b) => Number(a.stop_sequence ?? a.station_order) - Number(b.stop_sequence ?? b.station_order));

    let dayOffset = 0;
    let previousDepartureMinutes = null;

    for (const row of tripRows) {
      const arr = row.arrival_time || row.time || row.departure_time;
      const dep = row.departure_time || row.time || row.arrival_time;
      const arrivalRaw = normalizeTime(arr);
      const departureRaw = normalizeTime(dep);

      if (previousDeparture >= 0 && arrivalRaw < previousDeparture % (24 * 60)) dayOffset += 1;

      const arrivalMinutes = arrivalRaw + dayOffset * 24 * 60;
      let departureMinutes = departureRaw + dayOffset * 24 * 60;
      if (departureMinutes < arrivalMinutes) departureMinutes += 24 * 60;

      normalized.push({
        tripId,
        lineCode: row.line_code ?? row.line,
        serviceId: row.service_id ?? row.service_code,
        stationId: row.station_id ?? normalizeStationName(row.station),
        stationName: row.station ?? row.station_name,
        stopSequence: Number(row.stop_sequence ?? row.station_order),
        arrivalTimeRaw: arr,
        departureTimeRaw: dep,
        arrivalMinutes,
        departureMinutes,
        dayOffset,
        trainNumber: row.train_number || undefined,
      });

      previousDepartureMinutes = departureMinutes;
    }
  }

  return normalizedStops;
}

function validateRequiredFields(row, rowNumber, issues) {
  for (const field of REQUIRED_COLUMNS) {
    if (!String(row[field] || '').trim()) {
      issues.push({
        severity: 'error',
        sourceFile: 'schedules.csv',
        rowNumber,
        fieldName: field,
        code: 'REQUIRED_FIELD_MISSING',
        message: `${field} is required`,
      });
    }
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
      stationName: row.stationName,
      stationOrder: row.stationOrder,
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
    const rowNumber = index + 2;
    if (!(row.trip_id || row.train_number)) issues.push({ severity: 'error', sourceFile: 'schedules.csv', rowNumber, fieldName: 'trip_id', code: 'TRIP_REQUIRED', message: 'trip/train identifier required' });
    if (!(row.station_id || row.station)) issues.push({ severity: 'error', sourceFile: 'schedules.csv', rowNumber, fieldName: 'station', code: 'STATION_REQUIRED', message: 'station required' });
  }

  let validRows = [];
  if (!issues.some((issue) => issue.severity === 'error')) {
    validRows = detectOvernightStops(rows);
  }

  return { validRows, issues };
}

export function parseAndValidateFares(rows) {
  const issues = [];
  const fares = rows.map((row, index) => {
    const rowNumber = index + 2;
    const amount = Number(row.amount || row.fare || 0);
    if (!Number.isFinite(amount) || amount < 0) {
      issues.push({ severity: 'error', sourceFile: 'fares.csv', rowNumber, fieldName: 'amount', code: 'FARE_INVALID', message: 'Fare amount must be >= 0' });
    }

    return {
      lineCode: row.line || row.line_code || 'ALL',
      origin: normalizeStationName(row.origin || row.origin_station || row.origin_station_id || ''),
      destination: normalizeStationName(row.destination || row.destination_station || row.destination_station_id || ''),
      amount,
      currency: row.currency || 'TND',
    };
  });

  return { fares, issues };
}
