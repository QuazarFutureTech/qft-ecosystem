import { FaGlobe } from 'react-icons/fa';

function PortalModule({ user }) {
  return (
    <div className="qft-card">
      <h2><FaGlobe /> Client Portal</h2>
      {user.inPortal ? (
        <p>You are connected to the Client Portal server.</p>
      ) : (
        <p>Please join the Client Portal to access services.</p>
      )}
    </div>
  );
}
export default PortalModule;