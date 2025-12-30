/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength (minimum 6 characters)
 * @param {string} password
 * @returns {boolean}
 */
export const isValidPassword = (password) => {
  return password && password.length >= 6;
};

/**
 * Validate required fields
 * @param {Object} data - Object with fields to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Object} { valid: boolean, missing: Array<string> }
 */
export const validateRequiredFields = (data, requiredFields) => {
  const missing = requiredFields.filter(field => !data[field]);
  return {
    valid: missing.length === 0,
    missing
  };
};

/**
 * Validate pregnancy week (1-40)
 * @param {number} week
 * @returns {boolean}
 */
export const isValidPregnancyWeek = (week) => {
  return Number.isInteger(week) && week >= 1 && week <= 40;
};

/**
 * Validate date is in the future
 * @param {Date|string} date
 * @returns {boolean}
 */
export const isFutureDate = (date) => {
  const dateObj = new Date(date);
  return dateObj > new Date();
};
