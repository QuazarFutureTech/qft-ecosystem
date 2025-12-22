setTimeout(function() {
    particlesJS("particles-dots", {
        particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: "#a7c5d9" },
            shape: {
                type: "polygon",
                stroke: { width: 0, color: "#a7c5d9" },
                polygon: { nb_sides: 6 },
            },
            opacity: {
                value: 0.5,
                random: false,
                anim: { enable: false, speed: 1, opacity_min: 0.1, sync: false },
            },
            size: {
                value: 2,
                random: true,
                anim: { enable: false, speed: 20, size_min: 0.1, sync: false },
            },
            line_linked: {
                enable: true,
                distance: 150,
                color: "#0084ff",
                opacity: 0.4,
                width: 1,
            },
            move: {
                enable: true,
                speed: 5,
                direction: "none",
                random: false,
                straight: false,
                out_mode: "out",
                bounce: false,
                attract: { enable: false, rotateX: 600, rotateY: 1200 },
            },
        },
        interactivity: {
            detect_on: "canvas",
            events: {
                onhover: { enable: true, mode: "grab" },
                onclick: { enable: true, mode: "push" },
                resize: true,
            },
            modes: {
                grab: { distance: 231.44271031594977, line_linked: { opacity: .5 } },
                bubble: { distance: 400, size: 40, duration: 100, opacity: 8, speed: .5 },
                repulse: { distance: 200, duration: 0.4 },
                push: { particles_nb: 4 },
                remove: { particles_nb: 2 },
            },
        },
        retina_detect: true,
    });
}, 500);