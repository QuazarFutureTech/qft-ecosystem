import React, { useEffect, useCallback } from 'react'; // Added useCallback
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import Login from './Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Chat from './pages/Chat.jsx'; // Renamed from Feed
import CommandCenter from './pages/CommandCenter.jsx';
import Commands from './pages/Commands.jsx';
import ControlPanel from './pages/ControlPanel.jsx';
import AiModules from './pages/AiModules.jsx';
import Shop from './pages/Shop.jsx';
import './theme.css';
import './assets/css/theme-dark.css';
import './assets/css/theme-light.css';
import './assets/css/theme-glass.css';
import './assets/css/theme-cyber.css';
import './assets/css/theme-holographic.css';
import './assets/css/buttons.css';
import './assets/css/forms.css';
import './assets/css/page-layout.css';
import './Layout.css';
import { UserProvider, useUser } from './contexts/UserContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { SelectedGuildProvider } from './contexts/SelectedGuildContext.jsx';
import { enrichUserStatus, fetchUserStatus, fetchUserGuilds } from './services/user';
import { sendRpcActivity } from './services/discord'; // Import sendRpcActivity
import QFTPreloader from './components/QFTPreloader';
import Layout from './components/Layout.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx'; // Import ErrorBoundary

function AppContent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    userStatus, setUserStatus,
    qftUuid, setQftUuid,
    discordClientId, setDiscordClientId,
    userGuilds, setUserGuilds,
    qftRole, setQftRole,
    roleName, setRoleName,
    setAllRoles,
    isLoadingUser, setIsLoadingUser,
    logout,
  } = useUser();

  const loadUserData = useCallback(async (token) => {
    setIsLoadingUser(true);
    try {
      const fetchedStatus = await fetchUserStatus(token);
      if (fetchedStatus) {
        setUserStatus(enrichUserStatus(fetchedStatus));
        setDiscordClientId(fetchedStatus.discord_client_id);
        setQftRole(fetchedStatus.qft_role);
        setRoleName(fetchedStatus.role_name);
        setAllRoles(fetchedStatus.all_roles || []);
        
        // Fetch guilds only if auth succeeded
        const fetchedGuilds = await fetchUserGuilds(token);
        setUserGuilds(fetchedGuilds);
      } else {
        logout();
      }
    } catch (error) {
      console.error("Failed to load user data", error);
      logout();
    } finally {
      setIsLoadingUser(false);
    }
  }, [setUserStatus, setDiscordClientId, setQftRole, setRoleName, setAllRoles, setUserGuilds, setIsLoadingUser, logout]);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    const tokenFromStorage = localStorage.getItem('qft-token');
    let activeToken = null;

    if (tokenFromUrl) {
      // 1. Found a new token! Save it.
      localStorage.setItem('qft-token', tokenFromUrl);
      const uuid = tokenFromUrl.replace('QFT_IDENTITY_', '');
      setQftUuid(uuid);
      activeToken = tokenFromUrl;
      
      // 2. Clear the token from the URL so it looks clean
      navigate('/', { replace: true });
    } else if (tokenFromStorage) {
      // 3. Found an old token in storage
      const uuid = tokenFromStorage.replace('QFT_IDENTITY_', '');
      setQftUuid(uuid);
      activeToken = tokenFromStorage;
    }

    // 4. If we have a token but no user data yet, fetch it!
    if (activeToken && !userStatus) {
      loadUserData(activeToken).then(() => {
        sendRpcActivity({
          details: 'Browsing the QFT App',
          state: 'Idle',
          assets: {
            large_image: 'qft_logo',
            large_text: 'QFT Ecosystem'
          }
        }, activeToken).catch(console.error);
      });
    } else if (!activeToken && window.location.pathname !== '/login') {
      navigate('/login');
      setIsLoadingUser(false);
    } else if (!activeToken && window.location.pathname === '/login') {
      setIsLoadingUser(false);
    }
  }, [searchParams, navigate, setQftUuid, loadUserData, userStatus, sendRpcActivity, setIsLoadingUser]);

  // ✅ THE FIX IS HERE:
  // If we are loading OR if there is a token in the URL, show the preloader.
  // This prevents the "Not Logged In" screen from flashing while we process the token.
  const isProcessingToken = !!searchParams.get('token');

  if (isLoadingUser || isProcessingToken) {
    return <QFTPreloader />;
  }

  // If user is not logged in and not on the login page, show a message or redirect
  if (!userStatus && window.location.pathname !== '/login') {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '50px' }}>
        <h1>Not Logged In</h1>
        <p>Please log in to access this page.</p>
        <button onClick={() => navigate('/login')} className="qft-button" style={{ marginTop: '20px' }}>
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ErrorBoundary><Layout /></ErrorBoundary>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/feed" element={<Chat />} />
        <Route path="/command-center" element={<CommandCenter />} />
        <Route path="/commands" element={<Commands />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/control-panel" element={<ControlPanel />} />
        <Route path="/control-panel/users" element={<ControlPanel />} />
        <Route path="/control-panel/users/:userId" element={<ControlPanel />} />
        <Route path="/control-panel/permissions" element={<ControlPanel />} />
        <Route path="/control-panel/ai-modules" element={<AiModules />} />
        <Route path="/control-panel/ai-modules/:platform" element={<AiModules />} />
        <Route path="/control-panel/ai-modules/:platform/:module" element={<AiModules />} />
        <Route path="/bot-management" element={<Navigate to="/control-panel" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <UserProvider>
      <SelectedGuildProvider>
        <AppContent />
      </SelectedGuildProvider>
    </UserProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);