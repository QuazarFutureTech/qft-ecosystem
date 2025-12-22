(function(){
  'use strict';

  function initRingCarousel(container, options = {}){
    if(!container) return null;
    const cfg = Object.assign({
      sensitivity: 4.0,
      projectionMs: 80,
      baseDuration: 800,   // slightly longer for smoother feel
      maxExtra: 800,
      radiusAttr: '--radius'
    }, options);

    const track = container.querySelector('.qft-carousel-track');
    if(!track) return null;
    const cards = Array.from(track.querySelectorAll('.qft-service-card'));
    if(!cards.length) return null;

    const controls = container.querySelector('.qft-carousel-controls');
    const nextBtn = controls?.querySelector('.qft-next');
    const prevBtn = controls?.querySelector('.qft-prev');

    const leftArrow = container.querySelector('.swipe-left');
    const rightArrow = container.querySelector('.swipe-right');

    let angle = 0;
    const count = cards.length;
    const step = 360 / count;
    const radius = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(cfg.radiusAttr)) || 500;

    // Position cards around the ring
    cards.forEach((card,i)=>{
      const theta = i * step;
      card.style.transform = `rotateY(${theta}deg) translateZ(${radius}px)`;
    });
    track.style.transform = `translateZ(-${radius}px) rotateY(${angle}deg)`;

    function updateActive(currentAngle = angle){
      const normalized = ((-currentAngle % 360) + 360) % 360;
      const index = Math.round(normalized / step) % count;
      cards.forEach((card,i)=> card.classList.toggle('qft-active', i === index));
    }
// --- Autoplay ---
let autoplayId = null;
const autoplayDelay = 10000; // 10 seconds between slides

function startAutoplay() {
  stopAutoplay(); // clear any existing loop
  autoplayId = setInterval(() => {
    const target = angle - step; // move forward one step
    animateTo(target, cfg.baseDuration);
  }, autoplayDelay);
}

function stopAutoplay() {
  if (autoplayId) {
    clearInterval(autoplayId);
    autoplayId = null;
  }
}

// Start autoplay when initialized
startAutoplay();

// Pause autoplay while dragging or hovering controls
container.addEventListener('mouseenter', stopAutoplay);
container.addEventListener('mouseleave', startAutoplay);

    // Smooth animation
    function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
    function animateTo(target, duration){
      cancelAnimationFrame(rafId);
      const start = performance.now(); const from = angle;
      function frame(now){
        const p = Math.min(1, (now - start) / duration);
        const eased = easeOutCubic(p);
        angle = from + (target - from) * eased;
        track.style.transform = `translateZ(-${radius}px) rotateY(${angle}deg)`;
        updateActive();
        if(p < 1) rafId = requestAnimationFrame(frame);
      }
      rafId = requestAnimationFrame(frame);
    }

    // Button navigation → smooth
    nextBtn?.addEventListener('click', (e)=>{
      e.stopPropagation();
      const target = angle - step;
      animateTo(target, cfg.baseDuration);
    });
    prevBtn?.addEventListener('click', (e)=>{
      e.stopPropagation();
      const target = angle + step;
      animateTo(target, cfg.baseDuration);
    });

    // Swipe arrow feedback
    function showSwipeArrow(direction){
      if (direction === 'left') {
        leftArrow?.classList.add('show');
        rightArrow?.classList.remove('show');
      } else if (direction === 'right') {
        rightArrow?.classList.add('show');
        leftArrow?.classList.remove('show');
      }
      setTimeout(() => {
        leftArrow?.classList.remove('show');
        rightArrow?.classList.remove('show');
      }, 400);
    }

    // Drag logic
    let startX = null, lastX = null, lastTime = 0, dragging = false, degPerMs = 0, rafId = null;

    function onStart(e){
      e.preventDefault();
      const tgt = e.target || e.srcElement;
      if (tgt && tgt.closest && tgt.closest('.qft-carousel-controls')) return;
      dragging = true; container.classList.add('qft-dragging');
      const x = (e.touches?.[0]?.clientX ?? e.clientX);
      startX = x; lastX = x; lastTime = performance.now(); degPerMs = 0;
      cancelAnimationFrame(rafId);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
    }

    function onMove(e){
      if(!dragging) return;
      const x = (e.touches?.[0]?.clientX ?? e.clientX);
      const now = performance.now();
      const dx = x - lastX;
      if (Math.abs(dx) > 4) {
        showSwipeArrow(dx < 0 ? 'left' : 'right');
      }
      lastX = x;

      const dAngle = dx / cfg.sensitivity;
      angle += dAngle;
      track.style.transform = `translateZ(-${radius}px) rotateY(${angle}deg)`;

      const dt = Math.max(1, now - lastTime);
      degPerMs = dAngle / dt;
      lastTime = now;

      updateActive(angle);
    }

    function snapToNearestFrom(a){
      const normalized = ((-a % 360) + 360) % 360;
      const nearestIndex = Math.round(normalized / step) % count;
      return -nearestIndex * step;
    }

    function onEnd(){
      if(!dragging) return;
      dragging = false; container.classList.remove('qft-dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);

      const projectedAngle = angle + degPerMs * cfg.projectionMs;
      const baseTarget = snapToNearestFrom(projectedAngle);
      let target = baseTarget;
      while (target - angle > 180) target -= 360;
      while (target - angle < -180) target += 360;

      const extra = Math.min(cfg.maxExtra, Math.abs(degPerMs) * 600);
      const duration = Math.max(180, cfg.baseDuration + extra);
      animateTo(target, duration);

      startX = null; lastX = null; degPerMs = 0;
    }

    container.addEventListener('touchstart', onStart, { passive: true });
    container.addEventListener('touchmove', onMove, { passive: false });
    container.addEventListener('touchend', onEnd);
    container.addEventListener('mousedown', onStart);

    function destroy(){
      cancelAnimationFrame(rafId);
      container.removeEventListener('touchstart', onStart);
      container.removeEventListener('touchmove', onMove);
      container.removeEventListener('touchend', onEnd);
      container.removeEventListener('mousedown', onStart);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      nextBtn?.removeEventListener('click', animateTo);
      prevBtn?.removeEventListener('click', animateTo);
    }

    updateActive();
    return { destroy };
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    document.querySelectorAll('.qft-ring-carousel').forEach(el => initRingCarousel(el));
  });

  window.qftRingCarousel = { init: initRingCarousel };
})();
