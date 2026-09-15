export function formatCareEventRecency(value: string, now: Date): string {
  const occurredAt = Date.parse(value);

  if (Number.isNaN(occurredAt)) {
    return 'Sin hora';
  }

  const differenceMinutes = Math.max(
    0,
    Math.floor((now.getTime() - occurredAt) / 60_000),
  );

  if (differenceMinutes < 1) {
    return 'Ahora';
  }

  if (differenceMinutes < 60) {
    return `Hace ${differenceMinutes} min`;
  }

  if (differenceMinutes < 24 * 60) {
    const hours = Math.floor(differenceMinutes / 60);
    const minutes = differenceMinutes % 60;
    return minutes > 0 ? `Hace ${hours} h ${minutes} min` : `Hace ${hours} h`;
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(occurredAt));
}
