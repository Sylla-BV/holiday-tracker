import { NextResponse } from 'next/server';
import { syncPublicHolidays } from '@/app/actions';

export async function GET() {
  try {
    const result = await syncPublicHolidays();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error syncing holidays:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync holidays',
    }, { status: 500 });
  }
}