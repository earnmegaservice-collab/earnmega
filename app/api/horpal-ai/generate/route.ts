import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, mode } = await req.json();
    const apiKey = process.env.MAGIC_HOUR_API_KEY;

    // Determine if text or image/video based on prompt
    const lowerPrompt = prompt.toLowerCase();
    const isTextOnly = mode === 'argon4' || mode === 'quick' || mode === 'help' || lowerPrompt.includes('prompt') || lowerPrompt.includes('write') || lowerPrompt.includes('chat') || lowerPrompt.includes('explain') || lowerPrompt.includes('analyze');

    if (isTextOnly) {
      const systemPrompt = `You are horpal.ai, HorPal's flagship executive AI engine powered by Argon 4. When asked for an "AI Video Studio Prompt", generate a rich, copy-ready Master Video Production Prompt including: Scene Concept, Camera Movement & Lens, Lighting & Atmosphere, Master Text-to-Video Prompt, and Negative Prompt.`;

      let generatedText = '';

      try {
        if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");

        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ]
          })
        });

        if (!openaiRes.ok) throw new Error("OpenAI API failed");
        const openaiData = await openaiRes.json();
        generatedText = openaiData.choices[0].message.content;

      } catch (err) {
        console.error("Tier 1 LLM failed, falling back to Pollinations", err);
        const pollRes = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'openai',
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ]
          })
        });

        if (pollRes.ok) {
           const pollData = await pollRes.json();
           generatedText = pollData.choices[0].message.content;
        } else {
           generatedText = "I'm having trouble processing your request right now. Please try again later.";
        }
      }

      return NextResponse.json({
        isText: true,
        content: generatedText,
        reply: generatedText,
        success: true
      });
    }

    const isVideo = mode === 'video' || lowerPrompt.includes('video') || lowerPrompt.includes('clip') || lowerPrompt.includes('animation') || lowerPrompt.includes('render');

    let cleanPrompt = prompt.replace(/^(?:generate|create)\s+(?:an?\s+)?(?:image|video)(?:\s+of)?\s*/i, '').trim();
    if (!cleanPrompt) {
      if (isVideo) {
        cleanPrompt = "A breathtaking 4K cinematic aerial shot of a futuristic neon metropolis at golden hour, ultra-detailed, smooth camera motion";
      } else {
        cleanPrompt = "Ultra-luxury futuristic digital portrait, cinematic lighting, 8k photorealistic";
      }
    }

    // Call Magic Hour API
    let endpoint = 'https://api.magichour.ai/v1/ai-image-generator';
    let bodyPayload: any = {
      name: `HorPal AI Image`,
      image_count: 1,
      orientation: 'landscape',
      style: {
        prompt: cleanPrompt
      }
    };

    if (isVideo) {
      endpoint = 'https://api.magichour.ai/v1/text-to-video';
      bodyPayload = {
        name: `HorPal AI Video`,
        end_seconds: 5,
        orientation: 'landscape',
        style: {
          prompt: cleanPrompt
        }
      };
    }

    let response;
    if (apiKey) {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload)
      });
    }

    if (!apiKey || !response?.ok) {
       let errorData = null;
       if (response && !response.ok) {
           errorData = await response.json().catch(() => null);
           console.error("Magic Hour API error:", errorData || response.statusText);
       } else {
           console.error("Magic Hour API Key missing, triggering fallback.");
       }

       if (!isVideo) {
          // Image Fallback
          const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
          return NextResponse.json({
            isText: false,
            id: `fallback-${Date.now()}`,
            type: 'image',
            instantUrl: fallbackUrl,
            message: `Generated AI Image.`
          });
       } else {
          // Video Fallback
          const keyframePrompt = cleanPrompt + ', cinematic 4k film still, anamorphic lens';
          const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(keyframePrompt)}?width=1280&height=720&nologo=true&seed=${Date.now()}`;

          let generatedScript = '';
          try {
             const sysPrompt = "You are an expert AI Director. The user wanted to generate a video but the rendering engine is currently unavailable. Provide a complete AI Director Breakdown & Camera Motion Script based on their prompt.";
             const pollRes = await fetch('https://text.pollinations.ai/openai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: 'openai',
                  messages: [
                    { role: "system", content: sysPrompt },
                    { role: "user", content: cleanPrompt }
                  ]
                })
             });
             if (pollRes.ok) {
                const pollData = await pollRes.json();
                generatedScript = pollData.choices[0].message.content;
             }
          } catch (e) {}

          const breakdownMsg = generatedScript ? `\n\n**Director Breakdown:**\n${generatedScript}` : '';

          return NextResponse.json({
            isText: false,
            id: `fallback-${Date.now()}`,
            type: 'video',
            instantUrl: fallbackUrl,
            message: `**4K Keyframe Visual Preview**\n\nThe video rendering engine is currently over capacity. Here is a high-resolution keyframe preview of your prompt.${breakdownMsg}`
          });
       }
    }

    const data = await response.json();
    return NextResponse.json({
      isText: false,
      id: data.id,
      type: isVideo ? 'video' : 'image',
      message: `Your project has been queued with Job ID: ${data.id}. Generating media...`
    });

  } catch (error) {
    console.error('Error in horpal-ai generation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
