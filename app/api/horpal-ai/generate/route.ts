import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, mode } = await req.json();
    const apiKey = process.env.MAGIC_HOUR_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server missing Magic Hour API configuration.', isText: true, content: 'Server missing Magic Hour API configuration.' },
        { status: 500 }
      );
    }

    // Determine if text or image/video based on prompt
    const isVideo = prompt.toLowerCase().includes('video');
    const isTextOnly = prompt.toLowerCase().includes('explain') || prompt.toLowerCase().includes('analyze') || prompt.toLowerCase().includes('write');

    if (isTextOnly) {
      // Simulate an immediate text/assistant response
      return NextResponse.json({
        isText: true,
        content: `**horpal.ai Analysis Mode (${mode})**\n\nI analyzed your prompt: "${prompt}".\n\nHere is your generated textual response.\n\n\`\`\`javascript\nconsole.log("Hello from horpal.ai");\n\`\`\`\n\nI can also generate images or videos if you ask me to "create an image" or "generate a video".`
      });
    }

    let cleanPrompt = prompt.replace(/^(?:generate|create)\s+(?:an?\s+)?(?:image|video)(?:\s+of)?\s*/i, '').trim();
    if (!cleanPrompt) {
      cleanPrompt = "Ultra-luxury futuristic digital portrait, cinematic lighting, 8k photorealistic";
    }

    // Call Magic Hour API
    let endpoint = 'https://api.magichour.ai/v1/ai-image-generator';
    let bodyPayload: any = {
      name: `Horpal AI Image - ${Date.now()}`,
      image_count: 1,
      orientation: 'square',
      style: {
        prompt: cleanPrompt
      }
    };

    if (isVideo) {
      endpoint = 'https://api.magichour.ai/v1/video-projects';
      bodyPayload = {
        name: `Horpal AI Video - ${Date.now()}`,
        style: {
          prompt: cleanPrompt
        }
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
       const errorData = await response.json().catch(() => null);
       console.error("Magic Hour API error:", errorData || response.statusText);
       return NextResponse.json({ error: 'Failed to generate content', details: errorData }, { status: response.status });
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
