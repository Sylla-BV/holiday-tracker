import { NextRequest, NextResponse } from 'next/server';
import { sendDailyOutOfOfficeReport } from '@/app/actions';

export async function GET(request: NextRequest) {
  try {
    // Verify that this is a legitimate cron request from Vercel
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting daily out of office report...');
    
    // First check if anyone is out of office today
    const { getUsersOutOfOfficeToday } = await import('@/app/actions');
    const checkResult = await getUsersOutOfOfficeToday();
    
    if (!checkResult.success || !checkResult.users) {
      console.error('Failed to check out of office users:', checkResult.error);
      return NextResponse.json({ 
        success: false, 
        error: checkResult.error || 'Failed to check out of office users' 
      }, { status: 500 });
    }
    
    // If nobody is out of office, skip sending the report
    if (checkResult.users.length === 0) {
      console.log('No one is out of office today - skipping daily report');
      return NextResponse.json({ 
        success: true, 
        message: 'No one out of office - daily report skipped' 
      });
    }
    
    // Send the daily report
    const result = await sendDailyOutOfOfficeReport();
    
    if (result.success) {
      console.log('Daily report sent successfully');
      return NextResponse.json({ 
        success: true, 
        message: 'Daily report processed successfully' 
      });
    } else {
      console.error('Failed to send daily report:', result.error);
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in daily report cron job:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}