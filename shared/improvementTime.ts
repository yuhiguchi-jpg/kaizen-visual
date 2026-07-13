export const frequencyPeriods = ["day", "week", "month", "year"] as const;

export type FrequencyPeriod = typeof frequencyPeriods[number];

const annualFrequencyMultipliers: Record<FrequencyPeriod, number> = {
  day: 365,
  week: 52,
  month: 12,
  year: 1,
};

const frequencyPeriodLabels: Record<FrequencyPeriod, string> = {
  day: "1日",
  week: "1週間",
  month: "1か月",
  year: "1年",
};

export function calculateAnnualSavedSeconds(input: {
  beforeSeconds: number;
  afterSeconds: number;
  frequencyCount: number;
  frequencyPeriod: FrequencyPeriod;
}) {
  const savedSecondsPerOccurrence = Math.max(0, input.beforeSeconds - input.afterSeconds);
  return savedSecondsPerOccurrence * input.frequencyCount * annualFrequencyMultipliers[input.frequencyPeriod];
}

export function calculateReductionRate(beforeSeconds: number, afterSeconds: number) {
  if (beforeSeconds <= 0) return 0;
  return Math.max(0, Math.round((Math.max(0, beforeSeconds - afterSeconds) / beforeSeconds) * 100));
}

export function formatDuration(totalSeconds: number) {
  const normalized = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  const seconds = normalized % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours.toLocaleString("ja-JP")}時間`);
  if (minutes > 0) parts.push(`${minutes}分`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}秒`);
  return parts.join("");
}

export function formatFrequency(frequencyCount: number, frequencyPeriod: FrequencyPeriod) {
  return `${frequencyPeriodLabels[frequencyPeriod]}に${frequencyCount.toLocaleString("ja-JP")}回`;
}
