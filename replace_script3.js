const fs = require('fs');
let content = fs.readFileSync('components/home/HorPalLandingGateway.tsx', 'utf8');

// Replace carousel DOM
const oldDOM = `      {/* 2. MAIN HERO CAROUSEL */}
      <section className="pt-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div
          className="relative w-full h-[420px] sm:h-[500px] rounded-3xl overflow-hidden shadow-2xl bg-black group"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              {carouselSlides[currentSlide].type === 'video' ? (
                <video
                  ref={(el) => { if (el) videoRefs.current[currentSlide] = el; }}
                  src={carouselSlides[currentSlide].url}
                  autoPlay
                  loop
                  muted={isVideoMuted}
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={carouselSlides[currentSlide].url}
                  alt={carouselSlides[currentSlide].headline}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Gradient Overlay for Text Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-8 sm:p-12">
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-xs font-bold tracking-widest text-white mb-4 w-fit">
                  {carouselSlides[currentSlide].badge}
                </span>
                <h2 className="text-3xl sm:text-5xl font-black mb-3 leading-tight text-white drop-shadow-lg max-w-3xl">
                  {carouselSlides[currentSlide].headline}
                </h2>
                <p className="text-white/80 text-sm sm:text-lg max-w-2xl drop-shadow-md">
                  {carouselSlides[currentSlide].subtitle}
                </p>
              </div>

              {/* Audio Toggle for Videos */}
              {carouselSlides[currentSlide].type === 'video' && (
                <button
                  onClick={() => setIsVideoMuted(!isVideoMuted)}
                  className="absolute top-6 right-6 p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-colors z-20"
                >
                  {isVideoMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          <div className="absolute inset-y-0 left-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button onClick={prevSlide} className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-white/20"><ChevronLeft size={24} /></button>
          </div>
          <div className="absolute inset-y-0 right-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button onClick={nextSlide} className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-white/20"><ChevronRight size={24} /></button>
          </div>

          {/* Progress Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20 w-full max-w-md px-4">
            {carouselSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={\`h-1.5 rounded-full flex-1 transition-all duration-300 \${
                  idx === currentSlide ? 'bg-amber-400 w-8' : 'bg-white/30'
                }\`}
              />
            ))}
          </div>
        </div>`;

const newDOM = `      {/* 2. MAIN HERO CAROUSEL */}
      <section className="pt-24 px-4 md:px-8 max-w-7xl mx-auto relative">
        {/* Ambient Glow */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-amber-500/20 blur-[100px] rounded-full pointer-events-none transition-colors duration-1000"></div>

        <div
          className="relative w-full h-[48vh] sm:h-[55vh] max-h-[600px] rounded-[32px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(233,185,73,0.15)] bg-black group border border-amber-400/30 ring-1 ring-white/5"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0"
            >
              {promoSlides[currentSlide].type === 'video' ? (
                <video
                  ref={(el) => { if (el) videoRefs.current[currentSlide] = el; }}
                  src={promoSlides[currentSlide].src}
                  muted={isVideoMuted}
                  playsInline
                  preload="auto"
                  onEnded={handleVideoEnded}
                  className="w-full h-full object-cover"
                  poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                />
              ) : (
                <img
                  src={promoSlides[currentSlide].src}
                  alt="HorPal Luxury Media"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              )}

              {/* Minimal Bottom Vignette for Progress Bar Visibility */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>

              {/* Audio Toggle */}
              {promoSlides[currentSlide].type === 'video' && (
                <button
                  onClick={toggleMute}
                  aria-label={isVideoMuted ? "Unmute video" : "Mute video"}
                  className="absolute top-6 right-6 p-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 transition-all z-20 shadow-lg"
                >
                  {isVideoMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Keyboard & Mouse Navigation (Accessibility & Desktop) */}
          <div className="absolute inset-y-0 left-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
            <button onClick={prevSlide} className="p-3 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all"><ChevronLeft size={24} /></button>
          </div>
          <div className="absolute inset-y-0 right-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
            <button onClick={nextSlide} className="p-3 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all"><ChevronRight size={24} /></button>
          </div>

          {/* Progress Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20 w-full max-w-sm px-8">
            {promoSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                aria-label={\`Go to slide \${idx + 1}\`}
                className={\`h-1.5 rounded-full flex-1 transition-all duration-500 \${
                  idx === currentSlide ? 'bg-[#E9B949] w-8' : 'bg-white/20 hover:bg-white/40'
                }\`}
              />
            ))}
          </div>
        </div>`;

content = content.replace(oldDOM, newDOM);
fs.writeFileSync('components/home/HorPalLandingGateway.tsx', content, 'utf8');
console.log('DOM replaced.');
