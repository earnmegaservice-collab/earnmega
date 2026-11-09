const fs = require('fs');
let content = fs.readFileSync('components/home/HorPalLandingGateway.tsx', 'utf8');

// 1. Replace carouselSlides with promoSlides (keeping old text for later extraction)
const originalSlidesStr = `const carouselSlides = [
  {
    type: 'video',
    url: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/promo.mp4',
    badge: 'OFFICIAL PLATFORM PROMO',
    headline: 'Welcome to HorPal — Where Real Connections Turn Into Real Value',
    subtitle: 'Experience HD live streaming, verified social discovery, VIP communities, and instant creator rewards.',
  },
  {
    type: 'video',
    url: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/gemini_generated_video_74257962.mp4',
    badge: 'NEXT-GEN CREATOR ARENA',
    headline: 'Broadcast Live in HD & Monetize Your Audience Globally',
    subtitle: 'Go live with zero lag, receive animated 3D gifts in real time, and build your global fanbase.',
  },
  {
    type: 'image',
    url: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/file_0000000009b08211b57dd97f6fc9d336.png',
    badge: 'PILLAR 1 • SOCIAL & EARNING HUB',
    headline: 'Make Verified Friends, Chat Privately & Grow Together',
    subtitle: '100% real verified people, interactive group chats, voice notes, and smart AI assistance.',
  },
  {
    type: 'image',
    url: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/file_00000000006082438fdf286c8d7920d7.png',
    badge: 'THE HORPAL ECOSYSTEM',
    headline: 'One Elite Platform. Two Powerful Wealth & Social Pillars.',
    subtitle: 'Built with enterprise AI and dedicated human staff to deliver a world-class experience.',
  },
];`;

const newSlidesStr = `export const promoTextBlocks = [
  {
    badge: 'OFFICIAL PLATFORM PROMO',
    headline: 'Welcome to HorPal — Where Real Connections Turn Into Real Value',
    subtitle: 'Experience HD live streaming, verified social discovery, VIP communities, and instant creator rewards.',
  },
  {
    badge: 'NEXT-GEN CREATOR ARENA',
    headline: 'Broadcast Live in HD & Monetize Your Audience Globally',
    subtitle: 'Go live with zero lag, receive animated 3D gifts in real time, and build your global fanbase.',
  },
  {
    badge: 'PILLAR 1 • SOCIAL & EARNING HUB',
    headline: 'Make Verified Friends, Chat Privately & Grow Together',
    subtitle: '100% real verified people, interactive group chats, voice notes, and smart AI assistance.',
  },
  {
    badge: 'THE HORPAL ECOSYSTEM',
    headline: 'One Elite Platform. Two Powerful Wealth & Social Pillars.',
    subtitle: 'Built with enterprise AI and dedicated human staff to deliver a world-class experience.',
  },
];

const promoSlides = [
  { id: 1, type: 'video', src: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/gemini_generated_video_d176d608.mp4' },
  { id: 2, type: 'video', src: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/gemini_generated_video_88322b33.mp4' },
  { id: 3, type: 'video', src: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/gemini_generated_video_74257962.mp4' },
  { id: 4, type: 'image', src: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/1793877659965.jpg' },
  { id: 5, type: 'image', src: 'https://rbyoqehpntitdjztnmbe.supabase.co/storage/v1/object/public/public-assets/1793877634662.jpg' },
];`;

content = content.replace(originalSlidesStr, newSlidesStr);
fs.writeFileSync('components/home/HorPalLandingGateway.tsx', content, 'utf8');
console.log('Slides replaced.');
