export interface Contraction {
  babyId: string;
  endedAt?: string;
  id: string;
  recordedBy: string;
  startedAt: string;
}

export function getContractionDurationSeconds(
  contraction: Contraction,
  now: Date,
): number {
  const endTime = contraction.endedAt
    ? Date.parse(contraction.endedAt)
    : now.getTime();
  return Math.max(0, Math.floor((endTime - Date.parse(contraction.startedAt)) / 1000));
}

export function getContractionIntervalSeconds(
  contraction: Contraction,
  previousContraction: Contraction | undefined,
): number | undefined {
  if (!previousContraction) return undefined;

  return Math.max(
    0,
    Math.floor(
      (Date.parse(contraction.startedAt) - Date.parse(previousContraction.startedAt)) /
        1000,
    ),
  );
}

export function formatTimer(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const parts = [minutes, remainingSeconds].map((part) => String(part).padStart(2, '0'));

  return hours > 0 ? `${String(hours).padStart(2, '0')}:${parts.join(':')}` : parts.join(':');
}

export function formatContractionInterval(seconds: number | undefined): string {
  if (seconds === undefined) return 'Primera contracción';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} min ${String(remainingSeconds).padStart(2, '0')} s desde la anterior`;
}
