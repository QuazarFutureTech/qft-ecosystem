# QuazarFutureTech Website

This repository hosts the marketing website for **QuazarFutureTech (QFT)**, showcasing their services, company information, FAQs, and providing avenues for community engagement and contact. The website is a modern, responsive, and component-based static site with dynamic elements and external integrations, designed to provide an engaging user experience.

## Architecture Overview

The website's architecture is primarily client-side (frontend-focused), utilizing a combination of HTML, CSS, and JavaScript to deliver a dynamic and interactive experience without a dedicated backend server for content delivery.

### Key Technologies:
*   **HTML5:** Structured content and modular components.
*   **CSS3:** Styling, primarily with the **Bulma CSS Framework** augmented by extensive custom stylesheets.
*   **JavaScript:** Core interactivity, dynamic content loading, UI manipulations, and animations.

### Core Structure:

1.  **Main Pages:**
    *   `index.html`: The primary landing page, acting as an entry point and organized into distinct thematic sections (e.g., "Top," "Our Services," "About Us," "FAQs").
    *   Other HTML files (`construction.html`, `dashboard.html`, `join.html`, `secret/game.html`, `test/*.html`): Serve specific purposes like under-construction notices, internal dashboards, join pages, a hidden game, and development/backup pages.

2.  **Modular HTML Components:**
    *   Common UI elements such as the preloader, navigation bar, side menu, and footer are housed in separate HTML files (`preloader.html`, `main-navbar.html`, `index-sidemenu.html`, `generic-sidemenu.html`, `footer.html`).
    *   These components are **dynamically loaded** into corresponding container `div`s (`preloader-container`, `navbar-container`, `sidemenu-container`, `footer-container`) on `DOMContentLoaded` by the `assets/js/load_components.js` script.
    *   The side menu (`index-sidemenu.html` vs. `generic-sidemenu.html`) is conditionally loaded based on whether the user is on the `index.html` page or another page, providing flexible navigation.

3.  **Styling (`assets/css/`):**
    *   `bulma.min.css`: The foundational CSS framework.
    *   `styles.css`, `main.css`, `plugins.css`, `fonts.css`, `Accordion.css`, `modals.css`, `Carosel.css`, `Views.css`, `dashboard.css`: Custom stylesheets defining the unique visual identity, responsive behaviors, and specific component styling.
    *   `assets/fonts/zekton.ttf`: Custom font integration.
    *   **Font Awesome:** Integrated for scalable vector icons.

4.  **Interactivity (`assets/js/`):**
    *   `app.js`: Contains the main site-wide JavaScript logic, including:
        *   **Preloader Management:** Controls the initial loading animation.
        *   **Sticky Navigation & Scroll-to-Top:** Enhances user navigation.
        *   **Responsive Side Menu:** Provides an optimized navigation experience for mobile devices.
        *   **Scroll-Triggered Animations:** Elements (with classes `.reveal`, `.text-reveal`) animate into view as the user scrolls.
        *   **Easter Egg:** A hidden feature accessible via a "Konami code" or repeated logo clicks, leading to `secret/game.html`.
        *   **Dynamic Circuit Generator:** Creates aesthetic SVG circuit patterns.
        *   **3D Ring Carousel:** Manages the interactive services display with navigation and swipe support.
    *   `accordion.js`: Handles the functionality of expandable FAQ sections.
    *   `modals.js`: Manages modal dialogs for contact forms and "Join Us" prompts.
    *   `Carosel.js`, `ring-carousel.js`: Implement various carousel and slideshow functionalities.
    *   `particles.js`, `particles-dots.js`: Used for background particle effects to enhance visual appeal.
    *   `load_components.js`: Orchestrates the dynamic loading of HTML snippets described above.
    *   `SH_UTC.js`: Its specific function is not immediately clear from analysis but likely supports some time-related or utility function.

### External Integrations:
*   **Google Forms:** Embedded for "Contact Us" and "Sales" inquiries.
*   **Discord:** Integrated for community engagement and support via `Widgetbot`.
*   **Social Media:** Links to YouTube, Twitter, and Facebook.

### Assets (`assets/images/`):
*   A comprehensive collection of logos, favicons, banners, service-specific images, and social media icons, organized into subdirectories (`favicons/`, `box_icon/`).

### Special Directories:
*   `secret/`: Contains files for a hidden game (`game.html`, `game.css`, `game.js`).
*   `test/`: Holds various HTML files potentially used for development, testing, or backups.

## Getting Started

To view the website locally, simply open `index.html` in your web browser. Ensure all local assets and linked files are correctly resolved.

Feel free to explore the code to understand the implementation details of each component and feature.
