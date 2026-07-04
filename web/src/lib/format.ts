export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const RELATIVE_TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

export function formatRelativeTime(dateString: string): string {
  const elapsedSeconds = (Date.parse(dateString) - Date.now()) / 1000;

  for (const [unit, secondsPerUnit] of RELATIVE_TIME_UNITS) {
    if (Math.abs(elapsedSeconds) >= secondsPerUnit) {
      return relativeTimeFormatter.format(
        Math.round(elapsedSeconds / secondsPerUnit),
        unit,
      );
    }
  }
  return relativeTimeFormatter.format(Math.round(elapsedSeconds), "second");
}
