const prompts = [
  "Generate an image of a boy",
  "Generate image",
  "Generate video",
  "Create an image",
  "Create an image of a car"
];

for (const p of prompts) {
  let cleanPrompt = p.replace(/^(?:generate|create)\s+(?:an?\s+)?(?:image|video)(?:\s+of)?\s*/i, '').trim();
  if (!cleanPrompt) {
    cleanPrompt = "Ultra-luxury futuristic digital portrait, cinematic lighting, 8k photorealistic";
  }
  console.log(`Original: "${p}" -> Cleaned: "${cleanPrompt}"`);
}
