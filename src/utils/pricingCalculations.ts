/**
 * Pricing calculation utilities for the offer form
 * 
 * Calculation flow:
 * 1. Start with Gesamtbetrag Netto (sum of all position totals)
 * 2. Apply Nachlass (discount) - either % or fixed EUR
 * 3. Add MwSt (VAT) - % of net after discount
 * 4. Result: Gesamtbetrag Brutto
 * 5. Apply Skonto (cash discount) - % off gross
 * 6. Results: Final amounts
 */

export interface PricingData {
  netTotal: number; // Starting Gesamtbetrag Netto
  nachlass: number; // Discount value
  nachlassType: 'percentage' | 'fixed'; // Discount type
  mwstRate: number; // VAT rate in percentage
  skontoRate: number; // Cash discount rate in percentage
  skontoDays: number; // Payment term in days
}

export interface PricingResults {
  netTotal: number; // Original net total
  nachlassAmount: number; // Calculated discount amount
  netAfterNachlass: number; // Net total after discount
  mwstAmount: number; // Calculated VAT amount
  grossTotal: number; // Gross total (Gesamtbetrag Brutto)
  skontoAmount: number; // Calculated cash discount amount
  finalGrossTotal: number; // Gesamtbetrag Brutto (skontiert)
  finalNetTotal: number; // Gesamtbetrag Netto inkl. Nachlass (final net)
}

/**
 * Calculate all pricing values based on input data
 */
export function calculatePricing(data: PricingData): PricingResults {
  const { netTotal, nachlass, nachlassType, mwstRate, skontoRate } = data;

  // Step 1: Calculate Nachlass (discount) amount
  const nachlassAmount =
    nachlassType === 'percentage'
      ? netTotal * (nachlass / 100)
      : nachlass;

  // Step 2: Net total after discount
  const netAfterNachlass = netTotal - nachlassAmount;

  // Step 3: Calculate VAT (MwSt)
  const mwstAmount = netAfterNachlass * (mwstRate / 100);

  // Step 4: Gross total
  const grossTotal = netAfterNachlass + mwstAmount;

  // Step 5: Calculate Skonto (cash discount)
  const skontoAmount = grossTotal * (skontoRate / 100);

  // Step 6: Final gross total (with cash discount)
  const finalGrossTotal = grossTotal - skontoAmount;

  // Step 7: Final net total (reverse calculate from final gross)
  // finalNetTotal = finalGrossTotal / (1 + mwstRate/100)
  const finalNetTotal = mwstRate > 0 
    ? finalGrossTotal / (1 + mwstRate / 100)
    : finalGrossTotal;

  return {
    netTotal,
    nachlassAmount,
    netAfterNachlass,
    mwstAmount,
    grossTotal,
    skontoAmount,
    finalGrossTotal,
    finalNetTotal,
  };
}

/**
 * Format a number with German number formatting (comma for decimals, dot for thousands)
 * This is a wrapper for the existing formatGermanNumber function
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Validate pricing inputs
 */
export function validatePricingInputs(data: Partial<PricingData>): boolean {
  const { nachlass = 0, nachlassType = 'percentage', mwstRate = 0, skontoRate = 0 } = data;

  // Validate discount
  if (nachlassType === 'percentage' && (nachlass < 0 || nachlass > 100)) {
    return false;
  }

  // Validate VAT rate
  if (mwstRate < 0 || mwstRate > 100) {
    return false;
  }

  // Validate cash discount rate
  if (skontoRate < 0 || skontoRate > 100) {
    return false;
  }

  return true;
}
