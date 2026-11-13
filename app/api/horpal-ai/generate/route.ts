import { NextResponse } from 'next/server';
import { paywallErrorResponse, requirePillarAccess } from '../../../../lib/server/paywall';

const PERSONA_SYSTEM_PROMPTS: Record<string, string> = {
  general:
    'You are operating in ⚡ General Genius mode: provide crystal-clear, comprehensive, executive-grade answers with structured headings, actionable bullet points, and practical examples.',
  code_architect:
    'You are operating in 💻 Full-Stack Code Architect mode: design production-ready software architectures, clean TypeScript/Next.js/Python/SQL code, security best practices, and step-by-step implementation blueprints.',
  business_strategist:
    'You are operating in 📈 Business & Marketing Strategist mode: craft high-converting sales funnels, viral ad scripts, pricing models, revenue projections, and African + global digital growth strategies.',
  exam_tutor:
    'You are operating in 🎓 Exam & Academic Tutor mode: break down complex university, professional, STEM, finance, and law topics into intuitive step-by-step explanations, worked formulas, memory frameworks, and practice questions with solutions.',
};

export async function POST(req: Request) {
  try {
    // Server-side Pillar 3 license check (live from public.profiles) - the AI engine is never
    // reachable by an unpaid, expired, or anonymous caller, whatever the browser UI shows.
    try {
      await requirePillarAccess(req, 3);
    } catch (accessErr) {
      return paywallErrorResponse(accessErr);
    }

    const { prompt, mode, persona, userProfile, tier } = await req.json();
    const apiKey = process.env.MAGIC_HOUR_API_KEY;

    const userFirstName = (userProfile?.first_name || '').trim();
    const userFullName = (userProfile?.full_name || userFirstName || '').trim();
    const userHandle = (userProfile?.username || '').replace(/^@+/, '').trim();
    const personalizationContext = userFirstName
      ? ` The authenticated user you are assisting is ${userFullName} (First Name: "${userFirstName}"${
          userHandle ? `, Username: "@${userHandle}"` : ''
        }, Active Plan: "${(tier || 'pro').toUpperCase()}"). Address ${userFirstName} naturally by their real name during conversations and tailor your strategies specifically to their goals.`
      : '';

    const personaInstruction =
      PERSONA_SYSTEM_PROMPTS[persona || 'general'] || PERSONA_SYSTEM_PROMPTS.general;

    // Determine if text or image/video based on prompt
    const lowerPrompt = (prompt || '').toLowerCase();
    const isMediaRequest =
      mode === 'image' ||
      mode === 'video' ||
      /^(generate|create|render)\s+(an?\s+)?(ai\s+)?(image|photo|picture|video|clip|animation)\b/i.test(
        prompt.trim()
      );
    const isTextOnly = !isMediaRequest || lowerPrompt.includes('prompt');

    if (isTextOnly) {
      const systemPrompt = `You are Earnmega AI Studio (horpal.ai), Earnmega's flagship executive neural AI engine powered by Argon 4 Pro.${personalizationContext} ${personaInstruction} When asked for an "AI Video Studio Prompt", generate a rich, copy-ready Master Video Production Prompt including: Scene Concept, Camera Movement & Lens, Lighting & Atmosphere, Master Text-to-Video Prompt, and Negative Prompt.`;

      let generatedText = '';

      try {
        if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');

        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
          }),
        });

        if (!openaiRes.ok) throw new Error('OpenAI API failed');
        const openaiData = await openaiRes.json();
        generatedText = openaiData.choices[0].message.content;
      } catch (err) {
        console.error('Tier 1 LLM failed, falling back to Pollinations', err);
        const pollRes = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
          }),
        });

        if (pollRes.ok) {
          const pollData = await pollRes.json();
          generatedText = pollData.choices[0].message.content;
        } else {
          generatedText =
            "I'm having trouble processing your request right now. Please try again in a moment.";
        }
      }

      return NextResponse.json({
        isText: true,
        content: generatedText,
        reply: generatedText,
        success: true,
      });
    }

    const isVideo =
      mode === 'video' ||
      lowerPrompt.includes('video') ||
      lowerPrompt.includes('clip') ||
      lowerPrompt.includes('animation') ||
      lowerPrompt.includes('render');

    let cleanPrompt = prompt
      .replace(/^(?:generate|create|render)\s+(?:an?\s+)?(?:ai\s+)?(?:image|video|photo|picture|clip)(?:\s+of)?\s*/i, '')
      .trim();
    if (!cleanPrompt) {
      if (isVideo) {
        cleanPrompt =
          'A breathtaking 4K cinematic aerial shot of a futuristic neon metropolis at golden hour, ultra-detailed, smooth camera motion';
      } else {
        cleanPrompt =
          'Ultra-luxury futuristic digital portrait, cinematic lighting, 8k photorealistic';
      }
    }

    // Call Magic Hour API
    let endpoint = 'https://api.magichour.ai/v1/ai-image-generator';
    let bodyPayload: any = {
      name: `HorPal AI Image`,
      image_count: 1,
      orientation: 'landscape',
      style: {
        prompt: cleanPrompt,
      },
    };

    if (isVideo) {
      endpoint = 'https://api.magichour.ai/v1/text-to-video';
      bodyPayload = {
        name: `HorPal AI Video`,
        end_seconds: 5,
        orientation: 'landscape',
        style: {
          prompt: cleanPrompt,
        },
      };
    }

    let response;
    if (apiKey) {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });
    }

    if (!apiKey || !response?.ok) {
      if (!isVideo) {
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
          cleanPrompt
        )}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
        return NextResponse.json({
          isText: false,
          id: `fallback-${Date.now()}`,
          type: 'image',
          instantUrl: fallbackUrl,
          message: `Generated AI Studio Visual for: "${cleanPrompt}"`,
        });
      } else {
        const keyframePrompt = cleanPrompt + ', cinematic 4k film still, anamorphic lens';
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
          keyframePrompt
        )}?width=1280&height=720&nologo=true&seed=${Date.now()}`;

        let generatedScript = '';
        try {
          const sysPrompt =
            'You are an expert AI Director. Provide a concise AI Director Breakdown & Camera Motion Script based on the user prompt.';
          const pollRes = await fetch('https://text.pollinations.ai/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'openai',
              messages: [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: cleanPrompt },
              ],
            }),
          });
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            generatedScript = pollData.choices[0].message.content;
          }
        } catch (_) {}

        const breakdownMsg = generatedScript
          ? `\n\n**Director Breakdown:**\n${generatedScript}`
          : '';

        return NextResponse.json({
          isText: false,
          id: `fallback-${Date.now()}`,
          type: 'video',
          instantUrl: fallbackUrl,
          message: `**4K Keyframe Visual Preview**\n\nHere is a high-resolution keyframe preview and production script for your prompt.${breakdownMsg}`,
        });
      }
    }

    const data = await response.json();
    return NextResponse.json({
      isText: false,
      id: data.id,
      type: isVideo ? 'video' : 'image',
      message: `Your project has been queued with Job ID: ${data.id}. Generating media...`,
    });
  } catch (error) {
    console.error('Error in horpal-ai generation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
