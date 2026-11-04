// These optional choices are persisted by /api/me/financing-preferences, never in a second local profile.
export const financingOptions = {
  studentStage: ['', 'entry', 'enrolled'],
  support: ['', 'tuition', 'living', 'mobility'],
  repayment: ['', 'no', 'accepted'],
  international: ['', 'yes', 'no'],
  admission: ['', 'yes', 'no'],
  nationality: ['', 'Colombianos', 'Extranjeros'],
};

export const emptyFinancingPreferences = Object.freeze({ studentStage: '', support: '', repayment: '', international: '', admission: '', nationality: '' });

export function validFinancingPreferences(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === Object.keys(financingOptions).length
    && Object.entries(financingOptions).every(([field, options]) => Object.hasOwn(value, field) && typeof value[field] === 'string' && options.includes(value[field]));
}
