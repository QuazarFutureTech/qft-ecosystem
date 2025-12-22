import { FaChartBar } from 'react-icons/fa';

function AnalyticsModule({ user }) {
  return (
    <div className="module analytics-module">
      <h2><FaChartBar /> Analytics</h2>
      <p>Usage stats and system metrics.</p>
      {/* Later: integrate with /api/metrics */}
    </div>
  );
}

export default AnalyticsModule;