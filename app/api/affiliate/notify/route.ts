import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Sending notification email to horpalservice@gmail.com:', data);

    // Simulating sending email
    return NextResponse.json({ success: true, message: 'Notification sent successfully.' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to send notification.' }, { status: 500 });
  }
}
