import { db } from './db';
import { users, holidayRequests } from './schema';
import 'dotenv/config';

const seedUsers = [
  {
    email: 'sarah.johnson@company.com',
    name: 'Sarah Johnson',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150',
    role: 'admin' as const,
  },
  {
    email: 'mike.chen@company.com',
    name: 'Mike Chen',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    role: 'member' as const,
  },
  {
    email: 'emily.davis@company.com',
    name: 'Emily Davis',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    role: 'member' as const,
  },
  {
    email: 'alex.rodriguez@company.com',
    name: 'Alex Rodriguez',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    role: 'member' as const,
  },
  {
    email: 'jessica.wang@company.com',
    name: 'Jessica Wang',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    role: 'member' as const,
  },
];

const seedHolidayRequests = [
  // Current holidays (happening now)
  {
    startDate: '2025-06-23',
    endDate: '2025-06-27',
    leaveType: 'annual' as const,
    status: 'approved' as const,
    notes: 'Summer vacation with family',
  },
  {
    startDate: '2025-06-24',
    endDate: '2025-06-25',
    leaveType: 'sick' as const,
    status: 'approved' as const,
    notes: 'Doctor appointment and recovery',
  },
  
  // Upcoming holidays
  {
    startDate: '2025-07-01',
    endDate: '2025-07-05',
    leaveType: 'annual' as const,
    status: 'approved' as const,
    notes: 'Independence Day week off',
  },
  {
    startDate: '2025-07-08',
    endDate: '2025-07-12',
    leaveType: 'annual' as const,
    status: 'pending' as const,
    notes: 'Beach vacation',
  },
  {
    startDate: '2025-07-15',
    endDate: '2025-07-16',
    leaveType: 'personal' as const,
    status: 'approved' as const,
    notes: 'Moving to new apartment',
  },
  {
    startDate: '2025-08-01',
    endDate: '2025-08-15',
    leaveType: 'maternity' as const,
    status: 'approved' as const,
    notes: 'Maternity leave start',
  },
  {
    startDate: '2025-08-05',
    endDate: '2025-08-09',
    leaveType: 'annual' as const,
    status: 'pending' as const,
    notes: 'Wedding anniversary trip',
  },
  
  // Past holidays for history
  {
    startDate: '2025-05-15',
    endDate: '2025-05-17',
    leaveType: 'annual' as const,
    status: 'approved' as const,
    notes: 'Long weekend getaway',
  },
  {
    startDate: '2025-04-20',
    endDate: '2025-04-22',
    leaveType: 'sick' as const,
    status: 'approved' as const,
    notes: 'Flu recovery',
  },
];

async function seed() {
  console.log('🌱 Seeding database...');
  
  try {
    // Insert users
    console.log('👥 Creating users...');
    const insertedUsers = await db.insert(users).values(seedUsers).returning();
    console.log(`✅ Created ${insertedUsers.length} users`);
    
    // Create holiday requests with random user assignments
    console.log('🏖️ Creating holiday requests...');
    const holidayRequestsWithUsers = seedHolidayRequests.map((request, index) => ({
      ...request,
      userId: insertedUsers[index % insertedUsers.length].id,
      approvedBy: request.status === 'approved' ? insertedUsers[0].id : null, // Sarah (admin) approves
    }));
    
    const insertedRequests = await db.insert(holidayRequests).values(holidayRequestsWithUsers).returning();
    console.log(`✅ Created ${insertedRequests.length} holiday requests`);
    
    console.log('🎉 Database seeding completed successfully!');
    
    // Print summary
    console.log('\n📊 Summary:');
    console.log(`- Users: ${insertedUsers.length}`);
    console.log(`- Holiday Requests: ${insertedRequests.length}`);
    console.log(`- Approved Requests: ${insertedRequests.filter(r => r.status === 'approved').length}`);
    console.log(`- Pending Requests: ${insertedRequests.filter(r => r.status === 'pending').length}`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✨ Seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seed };