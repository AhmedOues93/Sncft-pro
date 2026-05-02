export function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toCurrentDateParts(): { date: string; time: string } {
  const now = new Date();
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

export function combineDateTime(date: string, time: string): string {
  return `${date}T${time || '00:00'}:00`;
}

export function nextDayFallbackIso(datetime: string): string | null {
  const next = new Date(datetime);
  if (Number.isNaN(next.getTime())) return null;
  next.setDate(next.getDate() + 1);
  next.setHours(4, 0, 0, 0);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T04:00:00`;
}

export function formatLongDate(datetime: string): string {
  const parsed = new Date(datetime);
  if (Number.isNaN(parsed.getTime())) return datetime;
  return parsed.toLocaleString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
