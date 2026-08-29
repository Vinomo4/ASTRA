// frontend/src/utils/formatters.ts

const SPANISH_LOCALE = 'es-ES';
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NAIVE_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

const parseUtcDate = (value: string | number): Date => {
  if (typeof value === 'number') return new Date(value);

  const normalizedValue = value.trim().replace(' ', 'T');
  const utcValue =
    DATE_ONLY_PATTERN.test(normalizedValue) || NAIVE_TIMESTAMP_PATTERN.test(normalizedValue)
      ? `${normalizedValue}Z`
      : normalizedValue;

  return new Date(utcValue);
};

export const formatNumber = (
  val: number | null | undefined,
  minimumFractionDigits = 0,
  maximumFractionDigits = 2
): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return val.toLocaleString(SPANISH_LOCALE, { minimumFractionDigits, maximumFractionDigits });
};

export const formatCurrency = (
  val: number | null | undefined,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2
): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return val.toLocaleString(SPANISH_LOCALE, {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits,
    maximumFractionDigits,
  });
};

/**
 * Formats axis price ticks with clean integers for large values and decimals only for sub-dollar assets.
 */
export const formatAxisPrice = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return formatCurrency(0, 0, 0);
  const abs = Math.abs(val);

  if (abs >= 1000) {
    return formatCurrency(Math.round(val), 0, 0);
  }
  if (abs >= 1) {
    return formatCurrency(val, 2, 2);
  }
  if (abs >= 0.01) {
    return formatCurrency(val, 4, 4);
  }
  return formatCurrency(val, 6, 6);
};

/**
 * High-precision formatter for Tooltip / HUD Inspector only.
 */
export const formatAdaptivePrice = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const abs = Math.abs(val);

  if (abs >= 1000) {
    return formatCurrency(val, 2, 2);
  }
  if (abs >= 1) {
    return formatCurrency(val, 2, 2);
  }
  if (abs >= 0.01) {
    return formatCurrency(val, 4, 4);
  }
  return formatCurrency(val, 6, 6);
};

/**
 * Compact volume formatter that strips redundant trailing zeros (e.g., 200B instead of 200.00B).
 */
export const formatCompactVolume = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '0';
  const abs = Math.abs(val);
  return val.toLocaleString(SPANISH_LOCALE, {
    notation: abs >= 1000 ? 'compact' : 'standard',
    compactDisplay: 'short',
    maximumFractionDigits: abs >= 1000 ? 2 : 0,
  });
};

/**
 * Compact currency formatter for equity axes ($100k, $1.2M).
 */
export const formatCompactCurrency = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return formatCurrency(0, 0, 0);
  const abs = Math.abs(val);
  return val.toLocaleString(SPANISH_LOCALE, {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    notation: abs >= 1000 ? 'compact' : 'standard',
    compactDisplay: 'short',
    maximumFractionDigits: abs >= 1e6 ? 2 : 0,
  });
};

export const formatPercent = (
  val: number | null | undefined,
  showSign = true,
  fractionDigits = 2
): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const sign = showSign && val > 0 ? '+' : '';
  return `${sign}${formatNumber(val, fractionDigits, fractionDigits)} %`;
};

export const formatAdaptiveDate = (dateStr: string | null | undefined, isIntraday: boolean): string => {
  if (!dateStr) return '';
  const parsed = parseUtcDate(dateStr);
  if (isNaN(parsed.getTime())) return dateStr;

  if (isIntraday) {
    return parsed.toLocaleString(SPANISH_LOCALE, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    });
  }

  return parsed.toLocaleString(SPANISH_LOCALE, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const parsed = parseUtcDate(dateStr);
  if (isNaN(parsed.getTime())) return dateStr;

  return parsed.toLocaleString(SPANISH_LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
};

export const formatDate = (value: unknown): string => {
  if (typeof value !== 'string' && typeof value !== 'number') return String(value ?? '');

  const parsed = parseUtcDate(value);
  if (isNaN(parsed.getTime())) return String(value);

  const isDateOnly = typeof value === 'string' && DATE_ONLY_PATTERN.test(value.trim());
  return parsed.toLocaleString(SPANISH_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(isDateOnly
      ? {}
      : { hour: '2-digit', minute: '2-digit', hour12: false }),
    timeZone: 'UTC',
  });
};

export const formatAxisDate = (dateStr: string, isIntraday: boolean): string => {
  if (!dateStr) return '';
  const parsed = parseUtcDate(dateStr);
  if (isNaN(parsed.getTime())) return dateStr.split(' ')[0];

  if (isIntraday) {
    return parsed.toLocaleString(SPANISH_LOCALE, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    });
  }

  return parsed.toLocaleString(SPANISH_LOCALE, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
};