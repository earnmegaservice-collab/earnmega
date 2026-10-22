import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        // Extract data for email
        const { reporterId, reporterName, accusedId, accusedName, category, description, time, recentMessages } = body;

        // Simulating the backend dispatch of an HTML email to earnmegadesk@gmail.com
        // Ensure sender is unaware of destination email
        console.log("Simulating email to earnmegadesk@gmail.com:", {
            reporter: `${reporterName} (${reporterId})`,
            accused: `${accusedName} (${accusedId})`,
            category,
            description,
            time,
            recentMessages
        });

        return NextResponse.json({ success: true, message: "Thank you for your report! It has been successfully received and our security team will investigate this user's activities immediately." });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message }, { status: 500 });
    }
}
