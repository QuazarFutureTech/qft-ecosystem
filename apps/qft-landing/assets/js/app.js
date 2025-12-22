window.addEventListener('load', function() {
  const preloader = document.getElementById('qft-preloader');
  
  // Optional: A minimal timeout to ensure users see the animation 
  // even if the site loads instantly (prevents a flashing glitch).
  setTimeout(() => {
    preloader.classList.add('fade-out');
  }, 1000); // 1000ms = 1 second
});

/* --- Procedural Circuit Generator --- */
function generateCircuit(nodesCount = 10) {
  const svgNS = "http://www.w3.org/2000/svg";
  const container = document.getElementById("circuit-dynamic");
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 1000 600");

  const nodes = [];

  for (let i = 0; i < nodesCount; i++) {
    const x = Math.floor(Math.random() * 950) + 25;
    const y = Math.floor(Math.random() * 550) + 25;

    const node = document.createElementNS(svgNS, "circle");
    node.setAttribute("cx", x);
    node.setAttribute("cy", y);
    node.setAttribute("r", 4);
    node.setAttribute("class", "circuit-node");
    svg.appendChild(node);
    nodes.push({ x, y });
  }

  for (let i = 0; i < nodes.length - 1; i++) {
    const line = document.createElementNS(svgNS, "path");
    line.setAttribute("d", `M${nodes[i].x},${nodes[i].y} L${nodes[i + 1].x},${nodes[i + 1].y}`);
    line.setAttribute("class", "circuit-line");
    svg.appendChild(line);
  }

  container.innerHTML = "";
  container.appendChild(svg);
}

document.addEventListener("DOMContentLoaded", () => {
  generateCircuit(15);
});

function activateEasterEgg() {
  const overlay = document.getElementById("screen_overlay");
  const text = document.getElementById("secretText");

  // Step 1: Fade overlay to black
  overlay.classList.add("active");

  // Step 2: Show text after overlay is fully opaque
  setTimeout(() => {
    text.classList.add("visible");
  }, 1000); // wait for overlay fade-in

  // Step 3: Keep text visible for 3 seconds
  setTimeout(() => {
    text.classList.add("fadeout");
  }, 4000); // 1s fade-in + 3s hold

  // Step 4: Redirect after text fades out
  setTimeout(() => {
    window.location.href = "/secret/game.html";
  }, 5500); // allow 1.5s fade-out
}



// --- Logo multi-click trigger ---
let logoClicks = 0;
document.getElementById("logo").addEventListener("click", () => {
  logoClicks++;
  if (logoClicks === 5) { // 5 presses unlocks
    activateEasterEgg();
  }
});

// --- Keyboard combo trigger ---
let secret = [];
const code = [
  "ArrowUp","ArrowUp","ArrowDown","ArrowDown",
  "ArrowLeft","ArrowRight","ArrowLeft","ArrowRight",
  "KeyB","KeyA"
];

window.addEventListener("keydown", e => {
  secret.push(e.code);
  // Keep only the last N entries
  if (secret.length > code.length) secret.shift();

  // Check if sequence matches
  if (secret.join(",") === code.join(",")) {
    activateEasterEgg();
    secret = [];
  }
});

/* --- Scroll + Navbar --- */
window.onscroll = function() {
  scrollEvent();
  activateTopScroll();
};

var windowheight = window.innerHeight;
var navbar = document.getElementById("navbar");
var sticky = navbar.offsetTop;
var scroller = document.getElementById("ScrollTop");
var home = document.getElementById("Top").offsetHeight;

async function pause(duration) {
  return new Promise(resolve => setTimeout(resolve, duration));
}

function menuToggle(x) {
  const nav = document.getElementById("mySidenav");

  if (nav.classList.contains("open")) {
    closeNav();
    x.classList.remove("change");
  } else {
    openNav();
    x.classList.add("change");
  }
}

function openNav() {
  const nav = document.getElementById("mySidenav");
  if (window.innerWidth <= 640) {
    nav.style.width = "100%";
    document.body.style.overflowY = "hidden";
  } else {
    document.body.style.marginLeft = "25%";
    nav.style.width = "25%";
  }
  nav.classList.add("open"); // track state
}

function closeNav() {
  const nav = document.getElementById("mySidenav");
  nav.style.width = "0";
  document.body.style.marginLeft = "0";
  document.body.style.overflowY = "initial";
  nav.classList.remove("open"); // reset state

  // Always reset the menu button
  const btn = document.querySelector(".menu_icon");
  if (btn) btn.classList.remove("change");
}

function activateTopScroll() {
  if (window.pageYOffset >= home / 2) {
    scroller.classList.add("scrActive");
    scroller.style.display = "block";
  } else {
    scroller.classList.remove("scrActive");
    scroller.style.display = "none";
  }
}

function scrollEvent() {
  if (window.pageYOffset >= sticky) {
    navbar.classList.add("sticky");
  } else {
    navbar.classList.remove("sticky");
  }
}

/* --- Reveal Animations --- */
window.addEventListener('scroll', reveal);
window.addEventListener('scroll', SecHeadExp);

async function reveal() {
  var reveals = document.querySelectorAll('.reveal');
  var textReveals = document.querySelectorAll('.text-reveal');
  var revealpoint = 50;

  for (var i = 0; i < reveals.length; i++) {
    var revealtop = reveals[i].getBoundingClientRect().top;
    if (revealtop < windowheight - revealpoint) {
      reveals[i].classList.add('loadUp');
      await pause(100);
    } else {
      reveals[i].classList.remove('loadUp');
    }
  }

  for (var j = 0; j < textReveals.length; j++) {
    var textTop = textReveals[j].getBoundingClientRect().top;
    const span = textReveals[j].querySelector('.reveal-text');

    if (textTop < windowheight - revealpoint) {
      textReveals[j].classList.add('animate');
      if (span) span.classList.add('animate');
    } else {
      textReveals[j].classList.remove('animate');
      if (span) span.classList.remove('animate');
    }
  }
}

function SecHeadExp() {
  var SecHeads = document.querySelectorAll('.sec-head');
  var SecHeadspoint = 50;

  for (var i = 0; i < SecHeads.length; i++) {
    var SecHeadstop = SecHeads[i].getBoundingClientRect().top;
    if (SecHeadstop < windowheight - SecHeadspoint) {
      SecHeads[i].classList.add('Expand');
    } else {
      SecHeads[i].classList.remove('Expand');
    }
  }
}

/* --- Tabs --- */
function openPage(pageName, elmnt) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("linkcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("link");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].style.boxShadow = "";
    tablinks[i].style.textShadow = "";
    tablinks[i].style.color = "";
    tablinks[i].classList.remove('active');
  }
  document.getElementById(pageName).style.display = "flex";
  elmnt.classList.add('active');
}

var side_dropdown = document.getElementsByClassName("side_dropdown-btn");
for (var i = 0; i < side_dropdown.length; i++) {
  side_dropdown[i].addEventListener("click", function() {
    this.classList.toggle("side_drpdwn_active");
    var side_dropdownContent = this.nextElementSibling;
    if (side_dropdownContent.style.display === "block") {
      side_dropdownContent.style.display = "none";
      side_dropdownContent.style.maxHeight = "0vh";
    } else {
      side_dropdownContent.style.display = "block";
      side_dropdownContent.style.maxHeight = side_dropdownContent.scrollHeight + "vh";
    }
  });
}

if (document.getElementById("defaultOpen").style.display != 'none') {
  document.getElementById("defaultOpen").click();
}

document.addEventListener("DOMContentLoaded", () => {
  const servicesRoot = document.querySelector('#services .services-carousel');
  if (!servicesRoot) return;

  const track = servicesRoot.querySelector('.carousel-track');
  const cards = servicesRoot.querySelectorAll('.service-card');
  const nextBtn = servicesRoot.querySelector('.next_card');
  const prevBtn = servicesRoot.querySelector('.prev_card');

  if (!track || !cards.length || !nextBtn || !prevBtn) {
    console.error('Services carousel setup incomplete');
    return;
  }

  let angle = 0;
  const count = cards.length;
  const step = 360 / count;
  const radius = 420;

  // Position cards in a 3D ring
  cards.forEach((card, i) => {
    const theta = i * step;
    card.style.transform = `rotateY(${theta}deg) translateZ(${radius}px)`;
  });

  function rotate(dir) {
    angle += dir * step;
    track.style.transform = `rotateY(${angle}deg)`;
  }

  nextBtn.addEventListener('click', () => rotate(-1));
  prevBtn.addEventListener('click', () => rotate(1));

  // Optional swipe support
  let startX = null;
  servicesRoot.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  servicesRoot.addEventListener('touchend', (e) => {
    if (startX == null) return;
    const endX = e.changedTouches[0].clientX;
    const dx = endX - startX;
    if (Math.abs(dx) > 40) rotate(dx < 0 ? -1 : 1);
    startX = null;
  });
});
