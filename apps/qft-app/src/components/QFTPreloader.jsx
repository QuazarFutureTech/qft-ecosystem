// src/components/QFTPreloader.jsx
import React, { useEffect, useState } from 'react';
import './QFTPreloader.css';

function QFTPreloader() {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Trigger fade-out after 1 second (or tie this to your app's loading state)
    const timer = setTimeout(() => {
      setFadeOut(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div id="qft-preloader" className={fadeOut ? 'fade-out' : ''}>
      <img src="../assets/images/QFT.png" alt="icon" />
      <div className="loader-container">
        <div className="quasar-ring"></div>
        <div className="quasar-core"></div>
        <p className="loading-text">Initializing 🌐〢🆀🅵🆃™ Systems...</p>
      </div>
    </div>
  );
}

export default QFTPreloader;