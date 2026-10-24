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
    const { messages, sender_id, receiver_id } = reqBody;

    const result = await streamText({
      model: openai('gpt-3.5-turbo'),
      messages,
      async onFinish({ text }) {
        await supabase.from('messages').insert({
          id: crypto.randomUUID(),
          sender_id: receiver_id, // AI is sender
          receiver_id: sender_id, // User is receiver
          content: text,
          status: 'sent'
        });
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    if (reqBody && reqBody.sender_id && reqBody.receiver_id) {
        await supabase.from('messages').insert({
          id: crypto.randomUUID(),
          sender_id: reqBody.receiver_id,
          receiver_id: reqBody.sender_id,
          content: "System: AI is currently offline or disconnected.",
          status: 'sent'
        });
    }
    return NextResponse.json({ error: 'AI offline' }, { status: 500 });
  }
}
