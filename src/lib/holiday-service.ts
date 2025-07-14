/**
 * Holiday service layer combining API integration with database operations
 */

import { db } from './db';
import { publicHolidays, users } from './schema';
import { 
  fetchPublicHolidays, 
  fetchHolidaysForMultipleCountries,
  type NagerHoliday 
} from './public-holidays-api';
import { eq, and, sql, inArray } from 'drizzle-orm';
import type { PublicHoliday, NewPublicHoliday } from './schema';

/**
 * Convert Nager.Date API response to database format
 */
function convertNagerToDbFormat(nagerHoliday: NagerHoliday): Omit<NewPublicHoliday, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    country: nagerHoliday.countryCode,
    date: nagerHoliday.date,
    name: nagerHoliday.name,
    localName: nagerHoliday.localName,
    type: nagerHoliday.type,
    year: new Date(nagerHoliday.date).getFullYear(),
  };
}

/**
 * Store holidays in database
 */
export async function storeHolidays(holidays: NagerHoliday[]): Promise<void> {
  if (holidays.length === 0) return;

  const dbHolidays = holidays.map(convertNagerToDbFormat);
  
  await db.insert(publicHolidays)
    .values(dbHolidays)
    .onConflictDoUpdate({
      target: [publicHolidays.country, publicHolidays.date],
      set: {
        name: sql`excluded.name`,
        localName: sql`excluded.local_name`,
        type: sql`excluded.type`,
        updatedAt: sql`now()`,
      },
    });
}

/**
 * Get holidays from database for a specific country and year
 */
export async function getStoredHolidays(
  countryCode: string,
  year: number
): Promise<PublicHoliday[]> {
  return db.select()
    .from(publicHolidays)
    .where(
      and(
        eq(publicHolidays.country, countryCode),
        eq(publicHolidays.year, year)
      )
    )
    .orderBy(publicHolidays.date);
}

/**
 * Get holidays for multiple countries and years
 */
export async function getStoredHolidaysForMultipleCountries(
  countryCodes: string[],
  years: number[]
): Promise<PublicHoliday[]> {
  if (countryCodes.length === 0 || years.length === 0) return [];

  return db.select()
    .from(publicHolidays)
    .where(
      and(
        inArray(publicHolidays.country, countryCodes),
        inArray(publicHolidays.year, years)
      )
    )
    .orderBy(publicHolidays.date);
}

/**
 * Get holidays for a specific date range
 */
export async function getHolidaysInDateRange(
  countryCode: string,
  startDate: string,
  endDate: string
): Promise<PublicHoliday[]> {
  return db.select()
    .from(publicHolidays)
    .where(
      and(
        eq(publicHolidays.country, countryCode),
        sql`${publicHolidays.date} >= ${startDate}`,
        sql`${publicHolidays.date} <= ${endDate}`
      )
    )
    .orderBy(publicHolidays.date);
}

/**
 * Check if a specific date is a public holiday
 */
export async function isPublicHolidayOnDate(
  countryCode: string,
  date: string
): Promise<boolean> {
  const result = await db.select()
    .from(publicHolidays)
    .where(
      and(
        eq(publicHolidays.country, countryCode),
        eq(publicHolidays.date, date)
      )
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Get all unique countries that have users
 */
export async function getActiveUserCountries(): Promise<string[]> {
  const result = await db.selectDistinct({ country: users.country })
    .from(users)
    .where(sql`${users.country} IS NOT NULL`);

  return result.map(row => row.country).filter((country): country is string => Boolean(country));
}

/**
 * Fetch and store holidays with fallback to database
 */
export async function fetchAndStoreHolidays(
  countryCode: string,
  year: number,
  fallbackToDb: boolean = true
): Promise<PublicHoliday[]> {
  try {
    // Try to fetch from API first
    const apiHolidays = await fetchPublicHolidays(countryCode, year);
    
    // Store in database
    await storeHolidays(apiHolidays);
    
    // Return stored holidays to ensure consistency
    return getStoredHolidays(countryCode, year);
  } catch (error) {
    console.error(`Failed to fetch holidays from API for ${countryCode} ${year}:`, error);
    
    if (fallbackToDb) {
      // Fallback to database if API fails
      return getStoredHolidays(countryCode, year);
    }
    
    throw error;
  }
}

/**
 * Sync holidays for all active user countries
 */
export async function syncHolidaysForAllActiveCountries(
  years: number[] = [new Date().getFullYear(), new Date().getFullYear() + 1]
): Promise<void> {
  const activeCountries = await getActiveUserCountries();
  
  if (activeCountries.length === 0) {
    console.log('No active countries found, skipping holiday sync');
    return;
  }

  console.log(`Syncing holidays for countries: ${activeCountries.join(', ')} for years: ${years.join(', ')}`);

  try {
    const holidaysData = await fetchHolidaysForMultipleCountries(activeCountries, years);
    
    for (const [key, holidays] of Object.entries(holidaysData)) {
      if (holidays.length > 0) {
        await storeHolidays(holidays);
        console.log(`Stored ${holidays.length} holidays for ${key}`);
      }
    }
  } catch (error) {
    console.error('Failed to sync holidays:', error);
    throw error;
  }
}

/**
 * Get holidays for team dashboard (all countries for current and next year)
 */
export async function getHolidaysForDashboard(): Promise<PublicHoliday[]> {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const activeCountries = await getActiveUserCountries();

  if (activeCountries.length === 0) return [];

  return getStoredHolidaysForMultipleCountries(activeCountries, [currentYear, nextYear]);
}

/**
 * Check if any dates in a range conflict with public holidays
 */
export async function checkHolidayConflicts(
  countryCode: string,
  startDate: string,
  endDate: string
): Promise<PublicHoliday[]> {
  return getHolidaysInDateRange(countryCode, startDate, endDate);
}