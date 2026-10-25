import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let reqBody: any;
  try {
    reqBody = await req.json();
    const { messages, userId, botId } = reqBody;

    const result = await streamText({
      model: openai('gpt-4o'),
      messages,
      async onFinish({ text }) {
        const adminSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        await adminSupabase.from('messages').insert({
          sender_id: botId,
          receiver_id: userId,
          content: text,
          created_at: new Date().toISOString(),
        });
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    if (reqBody && reqBody.userId && reqBody.botId) {
        await supabase.from('messages').insert({
          id: crypto.randomUUID(),
          sender_id: reqBody.botId,
          receiver_id: reqBody.userId,
          content: "System: AI is currently offline or disconnected.",
          status: 'sent'
        });
    }
    return NextResponse.json({ error: 'AI offline' }, { status: 500 });
  }
}
