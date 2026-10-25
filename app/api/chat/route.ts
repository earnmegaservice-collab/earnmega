import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, userId, botId, botType } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Missing OpenAI API Key' }, { status: 500 });
    }

    const systemPrompt = botType === 'help'
      ? 'You are EarnMega 24/7 AI Concierge Support. Be concise, helpful, and friendly.'
      : 'You are a witty, engaging, loyal AI Friend on EarnMega. Keep responses natural, warm, and conversational.';

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content || ''
      })),
    });

    // Save AI response to Supabase if userId and botId are provided
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey && userId && botId) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('messages').insert({
        sender_id: botId,
        receiver_id: userId,
        content: text,
      });
    }

    return NextResponse.json({ reply: text });
  } catch (error: any) {
    console.error('AI API Error:', error);
    return NextResponse.json({ error: error.message || 'AI failed to respond' }, { status: 500 });
  }
}
