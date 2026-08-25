// frontend/src/utils/formatters.ts

/**
 * Formats axis price ticks with clean integers for large values and decimals only for sub-dollar assets.
 */
export const formatAxisPrice = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '$0';
  const abs = Math.abs(val);

  if (abs >= 1000) {
    // Round to whole dollars with comma separators ($75,000, $100,000)
    return `$${Math.round(val).toLocaleString('en-US')}`;
  }
  if (abs >= 1) {
    return `$${val.toFixed(2)}`;
  }
  if (abs >= 0.01) {
    return `$${val.toFixed(4)}`;
  }
  return `$${val.toFixed(6)}`;
};

/**
 * High-precision formatter for Tooltip / HUD Inspector only.
 */
export const formatAdaptivePrice = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const abs = Math.abs(val);

  if (abs >= 1000) {
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (abs >= 1) {
    return `$${val.toFixed(2)}`;
  }
  if (abs >= 0.01) {
    return `$${val.toFixed(4)}`;
  }
  return `$${val.toFixed(6)}`;
};

/**
 * Compact volume formatter that strips redundant trailing zeros (e.g., 200B instead of 200.00B).
 */
export const formatCompactVolume = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '0';
  const abs = Math.abs(val);

  const cleanNumber = (num: number, digits: number) => {
    return parseFloat(num.toFixed(digits)).toString();
  };

  if (abs >= 1e9) return `${cleanNumber(val / 1e9, 2)}B`;
  if (abs >= 1e6) return `${cleanNumber(val / 1e6, 2)}M`;
  if (abs >= 1e3) return `${cleanNumber(val / 1e3, 1)}k`;
  return `${Math.round(val)}`;
};

/**
 * Compact currency formatter for equity axes ($100k, $1.2M).
 */
export const formatCompactCurrency = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '$0';
  const abs = Math.abs(val);

  const cleanNumber = (num: number, digits: number) => {
    return parseFloat(num.toFixed(digits)).toString();
  };

  if (abs >= 1e9) return `$${cleanNumber(val / 1e9, 2)}B`;
  if (abs >= 1e6) return `$${cleanNumber(val / 1e6, 2)}M`;
  if (abs >= 1e3) return `$${cleanNumber(val / 1e3, 0)}k`;
  return `$${Math.round(val)}`;
};

export const formatPercent = (val: number | null | undefined, showSign = true): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const sign = showSign && val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
};

export const formatAdaptiveDate = (dateStr: string | null | undefined, isIntraday: boolean): string => {
  if (!dateStr) return '';
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return dateStr;

  if (isIntraday) {
    return parsed.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatAxisDate = (dateStr: string, isIntraday: boolean): string => {
  if (!dateStr) return '';
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return dateStr.split(' ')[0];

  if (isIntraday) {
    return parsed.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};