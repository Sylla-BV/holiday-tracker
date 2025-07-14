/**
 * Nager.Date API integration for public holidays
 * Documentation: https://date.nager.at/Api
 */

export interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  type: string;
}

export interface CountryInfo {
  countryCode: string;
  name: string;
}

const BASE_URL = 'https://date.nager.at/api/v3';

/**
 * Fetch public holidays for a specific country and year
 */
export async function fetchPublicHolidays(
  countryCode: string,
  year: number
): Promise<NagerHoliday[]> {
  const response = await fetch(`${BASE_URL}/PublicHolidays/${year}/${countryCode}`, {
    // Cache for 24 hours since holidays rarely change
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch holidays for ${countryCode} in ${year}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all available countries from Nager.Date API
 */
export async function fetchAvailableCountries(): Promise<CountryInfo[]> {
  const response = await fetch(`${BASE_URL}/AvailableCountries`, {
    // Cache for 1 week since countries rarely change
    next: { revalidate: 604800 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch available countries: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check if a specific date is a public holiday in a country
 */
export async function isPublicHoliday(
  countryCode: string,
  date: string
): Promise<boolean> {
  const response = await fetch(`${BASE_URL}/IsTodayPublicHoliday/${countryCode}?date=${date}`, {
    // Cache for 24 hours
    next: { revalidate: 86400 },
  });

  return response.status === 200;
}

/**
 * Get holidays for the current year for a specific country
 */
export async function fetchCurrentYearHolidays(
  countryCode: string
): Promise<NagerHoliday[]> {
  const currentYear = new Date().getFullYear();
  return fetchPublicHolidays(countryCode, currentYear);
}

/**
 * Get holidays for next year for a specific country
 */
export async function fetchNextYearHolidays(
  countryCode: string
): Promise<NagerHoliday[]> {
  const nextYear = new Date().getFullYear() + 1;
  return fetchPublicHolidays(countryCode, nextYear);
}

/**
 * Batch fetch holidays for multiple countries and years
 */
export async function fetchHolidaysForMultipleCountries(
  countryCodes: string[],
  years: number[]
): Promise<{ [key: string]: NagerHoliday[] }> {
  const results: { [key: string]: NagerHoliday[] } = {};

  for (const countryCode of countryCodes) {
    for (const year of years) {
      const key = `${countryCode}-${year}`;
      try {
        results[key] = await fetchPublicHolidays(countryCode, year);
      } catch (error) {
        console.error(`Failed to fetch holidays for ${countryCode} in ${year}:`, error);
        results[key] = [];
      }
    }
  }

  return results;
}