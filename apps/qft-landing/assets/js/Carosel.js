let slideIndex = 1;
const slidesContainer = document.querySelector(".slideshow-container .slides");
const slides = document.getElementsByClassName("mySlides");
const dots = document.getElementsByClassName("dot");

let autoplayInterval;
const autoplayDelay = 10000;


// Attach listeners once DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  Array.from(dots).forEach((dot, i) => {
    dot.addEventListener("click", () => currentSlide(i + 1));
  });
});
// Render/update function (keep this separate)
// This is the mechanism you had that works
function showSlides(n) {
  const total = slides.length;
  if (n > total) slideIndex = 1;
  if (n < 1) slideIndex = total;

  const zeroIndex = slideIndex - 1;

  slidesContainer.style.transition = "transform 0.5s ease";
  slidesContainer.style.transform = `translateX(-${zeroIndex * 100}%)`;

  // Reset dots (ACTIVE STATE ONLY)
  Array.from(dots).forEach(dot => dot.classList.remove("active_dot"));
  dots[zeroIndex]?.classList.add("active_dot");

  // Toggle text-reveal animations: activate for the current slide, reset others
  try {
    Array.from(slides).forEach((slideEl, idx) => {
      const reveals = slideEl.querySelectorAll('.text-reveal');
      if (idx === zeroIndex) {
        reveals.forEach(r => {
          // ensure attribute and inner span exist (app.js init covers this, but be defensive)
          if (!r.getAttribute('data-text')) r.setAttribute('data-text', r.textContent.trim());
          	  if (!r.querySelector('.reveal-text')) {
            	    r.innerHTML = '<span class="reveal-text">' + r.innerHTML + '</span>';
            	    try {
            	      const span = r.querySelector('.reveal-text');
            	      if (span) {
            	        const classesToCopy = Array.from(r.classList).filter(c => c.startsWith('theme-') || c === 'hero-text' || c.startsWith('has-text-'));
            	        classesToCopy.forEach(c => span.classList.add(c));
            	      }
            	    } catch (e) { /* ignore */ }
            	  }
          r.classList.add('animate');
          const span = r.querySelector('.reveal-text');
          if (span) span.classList.add('animate');
        });
      } else {
        reveals.forEach(r => {
          r.classList.remove('animate');
          const span = r.querySelector('.reveal-text');
          if (span) span.classList.remove('animate');
        });
      }
    });
  } catch (e) {
    console.error('Carousel text-reveal toggle error', e);
  }
}

function plusSlides(n) {
  slideIndex += n;
  showSlides(slideIndex);
}

function currentSlide(n) {
  slideIndex = n;
  showSlides(slideIndex);
}

/* --- Autoplay --- */
function startAutoplay() {
  autoplayInterval = setInterval(() => {
    plusSlides(1);
  }, autoplayDelay);
}

function stopAutoplay() {
  clearInterval(autoplayInterval);
}

/* --- Swipe/Drag --- */
let startX = 0;
let isDragging = false;
let currentTranslate = 0;
let prevTranslate = 0;

function setPrevTranslateFromIndex() {
  prevTranslate = -(slideIndex - 1) * window.innerWidth;
  currentTranslate = prevTranslate;
}

setPrevTranslateFromIndex();

function dragStart(e) {
  startX = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;
  isDragging = true;
  slidesContainer.style.transition = "none";
  setPrevTranslateFromIndex();
  e.preventDefault();
}

function dragMove(e) {
  if (!isDragging) return;
  const currentX = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;
  const diff = currentX - startX;
  currentTranslate = prevTranslate + diff;
  slidesContainer.style.transform = `translateX(${currentTranslate}px)`;

  // Parallax
  const parallaxEls = document.querySelectorAll(".bg-layer");
  parallaxEls.forEach(el => {
    el.style.transform = `translateX(${diff * 0.5}px)`;
  });
}

function dragEnd() {
  isDragging = false;
  const movedBy = currentTranslate - prevTranslate;
  const threshold = window.innerWidth * 0.2;

  if (movedBy < -threshold) plusSlides(1);
  else if (movedBy > threshold) plusSlides(-1);
  else showSlides(slideIndex);

  // Reset parallax
  const parallaxEls = document.querySelectorAll(".bg-layer");
  parallaxEls.forEach(el => {
    el.style.transition = "transform 0.5s ease";
    el.style.transform = "translateX(0)";
  });
}

/* --- Event Listeners --- */
slidesContainer.addEventListener("touchstart", dragStart, { passive: true });
slidesContainer.addEventListener("touchmove", dragMove, { passive: false });
slidesContainer.addEventListener("touchend", dragEnd);

slidesContainer.addEventListener("mousedown", dragStart);
slidesContainer.addEventListener("mousemove", dragMove);
slidesContainer.addEventListener("mouseup", dragEnd);
slidesContainer.addEventListener("mouseleave", () => { if (isDragging) dragEnd(); });

document.querySelector(".next")?.addEventListener("click", () => plusSlides(1));
document.querySelector(".prev")?.addEventListener("click", () => plusSlides(-1));

/* --- Init --- */
window.addEventListener("load", () => {
  showSlides(slideIndex);
  startAutoplay();
});

window.addEventListener("resize", () => {
  slidesContainer.style.transition = "none";
  slidesContainer.style.transform = `translateX(-${(slideIndex - 1) * 100}%)`;
  setPrevTranslateFromIndex();
});
