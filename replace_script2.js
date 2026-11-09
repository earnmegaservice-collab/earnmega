const fs = require('fs');
let content = fs.readFileSync('components/home/HorPalLandingGateway.tsx', 'utf8');

// Replace state and refs logic
const oldLogic = `  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }
    if (touchStart - touchEnd < -75) {
      setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
    }
  };

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);`;

const newLogic = `  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      setHasInteracted(true);
      setIsVideoMuted(false);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true });

    // Remember global mute state
    const savedMute = sessionStorage.getItem('horpal_hero_muted');
    if (savedMute !== null) {
      setIsVideoMuted(savedMute === 'true');
      if (savedMute === 'false') setHasInteracted(true);
    }

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuted = !isVideoMuted;
    setIsVideoMuted(newMuted);
    setHasInteracted(true);
    sessionStorage.setItem('horpal_hero_muted', newMuted.toString());
  };

  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    let timer: NodeJS.Timeout;
    const currentMedia = promoSlides[currentSlide];

    if (currentMedia.type === 'image') {
      timer = setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
      }, 5000);
    } else {
      // Safety timeout for video in case onEnded doesn't fire
      timer = setTimeout(() => {
         setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
      }, 12000);
    }

    return () => clearTimeout(timer);
  }, [currentSlide, isPaused]);

  // Handle video play logic manually to ensure only one plays and try/catch is used
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === currentSlide) {
        video.currentTime = 0;
        video.play().catch(err => console.warn('Autoplay prevented:', err));
      } else {
        video.pause();
      }
    });
  }, [currentSlide, isPaused]);

  const handleVideoEnded = () => {
    setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (touchStart - touchEnd > 75) {
      setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
    }
    if (touchStart - touchEnd < -75) {
      setCurrentSlide((prev) => (prev - 1 + promoSlides.length) % promoSlides.length);
    }
  };

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + promoSlides.length) % promoSlides.length);`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('components/home/HorPalLandingGateway.tsx', content, 'utf8');
console.log('Logic replaced.');
