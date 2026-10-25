import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const { messages, userId, botId } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o'),
    messages,
    async onFinish({ text }) {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      await supabase.from('messages').insert({
        sender_id: botId,
        receiver_id: userId,
        content: text,
        created_at: new Date().toISOString()
      });
    }
  });
  return result.toTextStreamResponse();
}
