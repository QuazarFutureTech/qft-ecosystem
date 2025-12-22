import { FaCog, FaMoon, FaSun } from 'react-icons/fa';
import { useUser } from '../../contexts/UserContext.jsx'; // Import useUser
import { useTheme } from '../../contexts/ThemeContext.jsx'; // Import useTheme
import RoleManagementModule from './RoleManagementModule.jsx'; // Import RoleManagementModule
import ThemeToggle from '../elements/ThemeToggle';

function SettingsModule() {
  const { userStatus } = useUser(); // Get userStatus from context
  const { theme, toggleTheme } = useTheme(); // Get theme and toggleTheme from ThemeContext

  return (
    <div className="qft-card">
      <h2><FaCog /> Settings</h2>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <button
          className="qft-button"
          onClick={toggleTheme}
        >
          {theme === 'light' ? <FaMoon /> : <FaSun />} Toggle Theme
        </button>
        {/* Specific theme selector */}
        <div style={{marginLeft:8}}>
          <span style={{marginRight:8}}>Theme:</span>
          <select aria-label="Select theme" value={theme} onChange={e=>{ const newTheme = e.target.value; const { setSpecificTheme } = require('../../contexts/ThemeContext.jsx').useTheme(); setSpecificTheme(newTheme); }}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="glass">Glass</option>
            <option value="cyber">Cyber</option>
          </select>
        </div>
      </div>

      <div style={{marginTop:12}}>
        <ThemeToggle />
      </div>

      {userStatus?.isAdmin && ( // Conditionally render RoleManagementModule
        <RoleManagementModule />
      )}
    </div>
  );
}
export default SettingsModule;