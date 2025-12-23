import React from 'react';
import './Layout.css'; // General layout styles

// Get the Client ID from the public environment variable
const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FACEBOOK_CLIENT_ID = import.meta.env.VITE_FACEBOOK_CLIENT_ID;

// ✅ THE FIX: Use the Environment Variable
// If VITE_API_URL is set (on Vercel), use it. Otherwise, default to localhost.
const API_GATEWAY_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Update the URLs to use this dynamic variable
const DISCORD_OAUTH_URL = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${API_GATEWAY_URL}/auth/discord/callback&scope=identify%20guilds%20email`;

const GOOGLE_OAUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${GOOGLE_CLIENT_ID}&scope=openid%20profile%20email&redirect_uri=${API_GATEWAY_URL}/auth/google/callback`;

const FACEBOOK_OAUTH_URL = `https://www.facebook.com/v12.0/dialog/oauth?client_id=${FACEBOOK_CLIENT_ID}&redirect_uri=${API_GATEWAY_URL}/auth/facebook/callback&scope=email,public_profile`;

function Login() {
  // Simple function to redirect the user to Discord's authorization page
  const handleDiscordLogin = () => {
    if (DISCORD_CLIENT_ID) {
      window.location.href = DISCORD_OAUTH_URL;
    } else {
      console.warn("Discord Client ID not configured.");
      // Optionally show a user-facing message
    }
  };

  const handleGoogleLogin = () => {
    // Implement Google OAuth redirection here
    if (GOOGLE_CLIENT_ID) {
      window.location.href = GOOGLE_OAUTH_URL;
    } else {
      console.warn("Google Client ID not configured.");
      // Optionally show a user-facing message
    }
  };

  const handleFacebookLogin = () => {
    // Implement Facebook OAuth redirection here
    if (FACEBOOK_CLIENT_ID) {
      window.location.href = FACEBOOK_OAUTH_URL;
    } else {
      console.warn("Facebook Client ID not configured.");
      // Optionally show a user-facing message
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>QFT App</h1>
        <p>Log in with your preferred service to continue.</p>
        
        <button onClick={handleDiscordLogin} className="login-button" style={{ marginBottom: '10px' }}>
          Login with Discord
        </button>
        
        <button onClick={handleGoogleLogin} className="login-button" style={{ marginBottom: '10px', backgroundColor: '#DB4437' }}>
          Login with Google
        </button>

        <button onClick={handleFacebookLogin} className="login-button" style={{ backgroundColor: '#4267B2' }}>
          Login with Facebook
        </button>

        <div className="footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
      </div>
    </div>
  );
}

export default Login;