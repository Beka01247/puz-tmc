/**
 * Calculate age from Kazakh IIN (Individual Identification Number)
 * IIN format: YYMMDDXXXXXX where:
 * - YY: last 2 digits of birth year
 * - MM: birth month (01-12)
 * - DD: birth day (01-31)
 * - XXXXXX: additional digits including century and gender indicators
 */

export function calculateAgeFromIIN(iin: string): number {
  if (!iin || iin.length !== 12) {
    return 0;
  }

  try {
    // Extract birth date components from IIN
    const year = parseInt(iin.slice(0, 2), 10);
    const month = parseInt(iin.slice(2, 4), 10) - 1; // Month is 0-indexed in Date
    const day = parseInt(iin.slice(4, 6), 10);

    // Determine the full year based on century rules for Kazakh IINs
    // For Kazakh IINs, the century is determined by the 7th digit:
    // 1-2: 1800-1899, 3-4: 1900-1999, 5-6: 2000-2099
    const centuryDigit = parseInt(iin.charAt(6), 10);
    let fullYear: number;

    if (centuryDigit >= 1 && centuryDigit <= 2) {
      fullYear = 1800 + year;
    } else if (centuryDigit >= 3 && centuryDigit <= 4) {
      fullYear = 1900 + year;
    } else if (centuryDigit >= 5 && centuryDigit <= 6) {
      fullYear = 2000 + year;
    } else {
      // Fallback logic if century digit is not standard
      // Assume 1900s for years 00-99 if born before 2000, otherwise 2000s
      if (year < 50) {
        fullYear = 2000 + year;
      } else {
        fullYear = 1900 + year;
      }
    }

    // Create birth date
    const birthDate = new Date(fullYear, month, day);
    const currentDate = new Date();

    // Calculate age
    let age = currentDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = currentDate.getMonth() - birthDate.getMonth();

    // Adjust age if birthday hasn't occurred this year
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return Math.max(0, age); // Ensure age is not negative
  } catch (error) {
    console.error("Error calculating age from IIN:", error);
    return 0;
  }
}

/**
 * Get formatted birth date from Kazakh IIN
 */
export function getBirthDateFromIIN(iin: string): Date | null {
  if (!iin || iin.length !== 12) {
    return null;
  }

  try {
    const year = parseInt(iin.slice(0, 2), 10);
    const month = parseInt(iin.slice(2, 4), 10) - 1;
    const day = parseInt(iin.slice(4, 6), 10);

    // Determine full year (same logic as age calculation)
    const centuryDigit = parseInt(iin.charAt(6), 10);
    let fullYear: number;

    if (centuryDigit >= 1 && centuryDigit <= 2) {
      fullYear = 1800 + year;
    } else if (centuryDigit >= 3 && centuryDigit <= 4) {
      fullYear = 1900 + year;
    } else if (centuryDigit >= 5 && centuryDigit <= 6) {
      fullYear = 2000 + year;
    } else {
      // Fallback logic
      if (year < 50) {
        fullYear = 2000 + year;
      } else {
        fullYear = 1900 + year;
      }
    }

    return new Date(fullYear, month, day);
  } catch (error) {
    console.error("Error getting birth date from IIN:", error);
    return null;
  }
}

/**
 * Format age with proper Russian pluralization
 */
export function formatAge(age: number): string {
  if (age === 1) {
    return `${age} год`;
  } else if (age >= 2 && age <= 4) {
    return `${age} года`;
  } else {
    return `${age} лет`;
  }
}
