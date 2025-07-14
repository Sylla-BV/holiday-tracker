#!/usr/bin/env tsx
import { db } from '../src/lib/db';
import { publicHolidays, users } from '../src/lib/schema';
import { sql } from 'drizzle-orm';
import 'dotenv/config';

const HOLIDAYS_API_BASE_URL = 'https://date.nager.at/api/v3';

async function fetchHolidaysFromAPI(countryCode: string, year: number) {
  console.log(`Fetching holidays for ${countryCode} ${year}...`);
  
  const response = await fetch(`${HOLIDAYS_API_BASE_URL}/PublicHolidays/${year}/${countryCode}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch holidays: ${response.statusText}`);
  }
  
  return response.json();
}

async function storeHolidays(holidays: any[]) {
  if (holidays.length === 0) return;
  
  const dbHolidays = holidays.map((holiday) => ({
    country: holiday.countryCode,
    date: holiday.date,
    name: holiday.name,
    localName: holiday.localName,
    type: holiday.types?.[0] || 'Public', // Use first type or default to 'Public'
    year: new Date(holiday.date).getFullYear(),
  }));

  // Since we don't have a unique constraint, let's do upsert manually
  for (const holiday of dbHolidays) {
    // Check if holiday already exists
    const existing = await db.select()
      .from(publicHolidays)
      .where(sql`${publicHolidays.country} = ${holiday.country} AND ${publicHolidays.date} = ${holiday.date}`)
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing
      await db.update(publicHolidays)
        .set({
          name: holiday.name,
          localName: holiday.localName,
          type: holiday.type,
          updatedAt: new Date(),
        })
        .where(sql`${publicHolidays.country} = ${holiday.country} AND ${publicHolidays.date} = ${holiday.date}`);
    } else {
      // Insert new
      await db.insert(publicHolidays)
        .values(holiday);
    }
  }
}

async function syncAllHolidays() {
  try {
    // Get all unique countries from users
    const activeCountries = await db.selectDistinct({ country: users.country })
      .from(users)
      .where(sql`${users.country} IS NOT NULL`);

    const countries = activeCountries.map(row => row.country).filter((country): country is string => Boolean(country));
    
    if (countries.length === 0) {
      console.log('No active countries found');
      return;
    }

    console.log(`Found countries: ${countries.join(', ')}`);
    
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // Fetch and store holidays for each country
    for (const country of countries) {
      for (const year of [currentYear, nextYear]) {
        try {
          const holidays = await fetchHolidaysFromAPI(country, year);
          await storeHolidays(holidays);
          console.log(`✅ Stored ${holidays.length} holidays for ${country} ${year}`);
        } catch (error) {
          console.error(`❌ Failed to sync holidays for ${country} ${year}:`, error);
        }
      }
    }
    
    // Show summary
    const holidayCount = await db.select({ 
      country: publicHolidays.country,
      year: publicHolidays.year,
      count: sql<number>`count(*)::int`
    })
    .from(publicHolidays)
    .groupBy(publicHolidays.country, publicHolidays.year)
    .orderBy(publicHolidays.country, publicHolidays.year);
    
    console.log('\n📊 Holiday Summary:');
    holidayCount.forEach(row => {
      console.log(`${row.country} ${row.year}: ${row.count} holidays`);
    });
    
    // Show some examples
    const examples = await db.select()
      .from(publicHolidays)
      .where(sql`${publicHolidays.country} = 'PT'`)
      .orderBy(publicHolidays.date)
      .limit(5);
      
    console.log('\n🎊 Sample Portuguese holidays:');
    examples.forEach(h => {
      console.log(`${h.date}: ${h.name} (${h.localName})`);
    });
    
  } catch (error) {
    console.error('Error syncing holidays:', error);
    process.exit(1);
  }
}

// Run the sync
syncAllHolidays()
  .then(() => {
    console.log('\n✨ Holiday sync complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Holiday sync failed:', error);
    process.exit(1);
  });