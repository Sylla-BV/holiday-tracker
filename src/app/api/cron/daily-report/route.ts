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