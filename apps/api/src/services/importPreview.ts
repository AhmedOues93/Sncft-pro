import { parseScheduleCsv, validateScheduleRows } from '@sncft/import-engine';

export type ImportStatus = 'ready' | 'needs_review' | 'failed';

interface PreviewStop {
  stationOrder: number;
  stationName: string;
  arrivalDisplayTime: string;
  departureDisplayTime: string;
  dayOffset: number;
}

interface PreviewTrip {
  externalTripId: string;
  lineCode: string;
  trainNumber: string;
  direction: string;
  serviceCode: string;
  stops: PreviewStop[];
}

export function extractCsvTextFromPayload(payload: unknown): string {
  if (typeof payload === 'string') {
    return payload;
  }

  if (payload && typeof payload === 'object' && 'csvText' in payload) {
    const candidate = (payload as { csvText?: unknown }).csvText;
    if (typeof candidate === 'string') {
      return candidate;
    }
  }

  return '';
}

export function buildImportPreviewResponse(csvText: string) {
  const parsedRows = parseScheduleCsv(csvText);
  const validation = validateScheduleRows(parsedRows);

  const errorsCount = validation.issues.filter((issue: { severity: string }) => issue.severity === 'error').length;
  const warningsCount = validation.issues.filter((issue: { severity: string }) => issue.severity === 'warning').length;

  const normalized = validation.normalizedOutput;
  const trips = normalized?.trips ?? [];
  const stopTimes = normalized?.stopTimes ?? [];
  const calendars = normalized?.calendars ?? [];

  const tripStopsMap = new Map<string, PreviewStop[]>();
  for (const stop of stopTimes) {
    if (!tripStopsMap.has(stop.externalTripId)) {
      tripStopsMap.set(stop.externalTripId, []);
    }
    tripStopsMap.get(stop.externalTripId)?.push({
      stationOrder: stop.stationOrder,
      stationName: stop.stationName,
      arrivalDisplayTime: stop.arrivalDisplayTime,
      departureDisplayTime: stop.departureDisplayTime,
      dayOffset: stop.dayOffset,
    });
  }

  for (const stops of tripStopsMap.values()) {
    stops.sort((a, b) => a.stationOrder - b.stationOrder);
  }

  const preview: PreviewTrip[] = trips.slice(0, 5).map((trip) => ({
    externalTripId: trip.externalTripId,
    lineCode: trip.lineCode,
    trainNumber: trip.trainNumber,
    direction: trip.direction,
    serviceCode: trip.serviceCode,
    stops: tripStopsMap.get(trip.externalTripId) ?? [],
  }));

  let importStatus: ImportStatus = 'ready';
  if (errorsCount > 0) {
    importStatus = 'failed';
  } else if (warningsCount > 0) {
    importStatus = 'needs_review';
  }

  return {
    importStatus,
    summary: {
      totalRows: parsedRows.length,
      tripsCount: trips.length,
      stopTimesCount: stopTimes.length,
      calendarsCount: calendars.length,
      warningsCount,
      errorsCount,
    },
    issues: validation.issues,
    preview,
  };
}

export function previewSchedulesFromPayload(payload: unknown) {
  const csvText = extractCsvTextFromPayload(payload);

  if (!csvText.trim()) {
    return {
      statusCode: 400,
      body: {
        error: 'CSV payload is required. Send text/csv body or JSON {"csvText":"..."}.',
      },
    };
  }

  try {
    return {
      statusCode: 200,
      body: buildImportPreviewResponse(csvText),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: {
        importStatus: 'failed',
        error: error instanceof Error ? error.message : 'Failed to parse schedule CSV',
      },
    };
  }
}
