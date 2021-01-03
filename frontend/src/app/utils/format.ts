export function formatNumber(value: number, showCurrencySymbol = false, shrink = false): string {
  let affix = '';

  if (shrink) {
    if (value >= 1_000_000_000) {
      value /= 1_000_000_000;
      affix = ' mld.';
    }
    else if (value >= 1_000_000) {
      value /= 1_000_000;
      affix = ' mil.';
    }
  }

  affix += showCurrencySymbol ? ' Kč' : '';

  return `${value.toLocaleString()}${affix}`;
}
