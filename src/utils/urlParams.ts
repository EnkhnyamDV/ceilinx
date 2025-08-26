export function getFormIdFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

export function formatGermanNumber(value: number): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function parseGermanNumber(value: string): number {
  if (!value) return 0;
  
  // Convert German format (1.234,56) to English format (1234.56) for parsing
  const normalizedValue = value
    .replace(/\./g, '') // Remove thousand separators (dots)
    .replace(',', '.'); // Replace decimal comma with dot
  
  return parseFloat(normalizedValue) || 0;
}