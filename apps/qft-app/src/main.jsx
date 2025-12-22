import React, { useEffect, useCallback } from 'react'; // Added useCallback
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import Login from './Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Chat from './pages/Chat.jsx'; // Renamed from Feed
import Users from './pages/Users.jsx';
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
    qftRole, setQftRole, // Destructure setQftRole
    roleName, setRoleName, // Destructure role name setters
    setAllRoles,
    isLoadingUser, setIsLoadingUser,
    logout,
  } = useUser();

  // useCallback to memoize loadUserData
      const loadUserData = useCallback(async (token) => {
      setIsLoadingUser(true);
      const fetchedStatus = await fetchUserStatus(token);
      if (fetchedStatus) {
        setUserStatus(enrichUserStatus(fetchedStatus));
        setDiscordClientId(fetchedStatus.discord_client_id);
        setQftRole(fetchedStatus.qft_role); // Set the qftRole from fetched status
        setRoleName(fetchedStatus.role_name); // Set primary role name
        setAllRoles(fetchedStatus.all_roles || []); // Set all roles
        const fetchedGuilds = await fetchUserGuilds(token);
        setUserGuilds(fetchedGuilds);
      } else {
        logout(); // Use the logout from context on fetch failure
      }
      setIsLoadingUser(false);
    }, [setUserStatus, setDiscordClientId, setQftRole, setRoleName, setAllRoles, setUserGuilds, setIsLoadingUser, logout]); // Dependencies for useCallback
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    const tokenFromStorage = localStorage.getItem('qft-token');
    let activeToken = null;

    if (tokenFromUrl) {
      localStorage.setItem('qft-token', tokenFromUrl);
      const uuid = tokenFromUrl.replace('QFT_IDENTITY_', '');
      setQftUuid(uuid);
      activeToken = tokenFromUrl;
      navigate('/', { replace: true });
    } else if (tokenFromStorage) {
      const uuid = tokenFromStorage.replace('QFT_IDENTITY_', '');
      setQftUuid(uuid);
      activeToken = tokenFromStorage;
    }

    // Only load user data if an active token is present and userStatus is not already loaded
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
      // If no active token and not on login page, redirect to login
      navigate('/login');
      setIsLoadingUser(false);
    } else if (!activeToken && window.location.pathname === '/login') {
      // If no active token and on login page, stop loading
      setIsLoadingUser(false);
    }
  }, [searchParams, navigate, setQftUuid, loadUserData, userStatus, sendRpcActivity]);


  if (isLoadingUser) {
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
      <Route element={<ErrorBoundary><Layout /></ErrorBoundary>}> {/* Wrap Layout with ErrorBoundary */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} /> {/* Renamed from /feed */}
        <Route path="/feed" element={<Chat />} /> {/* Redirect old route */}
        <Route path="/users" element={<Users />} />
        <Route path="/command-center" element={<CommandCenter />} />
        <Route path="/commands" element={<Commands />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/control-panel" element={<ControlPanel />} />
        {/* Ai Modules - Platform-first architecture */}
        <Route path="/control-panel/ai-modules" element={<AiModules />} />
        <Route path="/control-panel/ai-modules/:platform" element={<AiModules />} />
        <Route path="/control-panel/ai-modules/:platform/:module" element={<AiModules />} />
        {/* Legacy route - redirect to Control Panel */}
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