import React, { useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext.jsx';
import { useHeader } from '../contexts/HeaderContext.jsx'; // Import useHeader
import { isStaffMember, isPrivilegedStaff, isClient, isAffiliate } from '../utils/clearance';
import { FaHome, FaTasks, FaShoppingCart, FaBell, FaChartLine, FaRobot, FaClock, FaCheckCircle, FaExclamationTriangle, FaEnvelope, FaUsers, FaFileInvoiceDollar, FaDollarSign, FaTachometerAlt } from 'react-icons/fa';
import './Dashboard.css';

function Dashboard() {
  const { userStatus, roleName } = useUser();
  const { setHeaderContent } = useHeader(); // Use setHeaderContent
  const isStaff = isStaffMember(roleName);
  const isPrivileged = isPrivilegedStaff(roleName);
  const isClientUser = isClient(roleName);
  const isAffiliateUser = isAffiliate(roleName);
  const userDisplayName = userStatus?.username || userStatus?.global_name || 'Operator';

  useEffect(() => {
    setHeaderContent({
      kicker: 'QFT ecosystem',
      title: <><FaTachometerAlt /> Dashboard</>,
      subtitle: `Welcome back, ${userDisplayName}. Here is your current operational snapshot.`,
      actions: (
        <>
          {isStaff && <Link to="/control-panel" className="header-action-link">Control Panel</Link>}
          {isPrivileged && <Link to="/bot-management" className="header-action-link">Bot Management</Link>}
        </>
      ),
    });
    // Clear header content when component unmounts or dependencies change
    return () => setHeaderContent(null);
  }, [isStaff, isPrivileged, userDisplayName, setHeaderContent]); // Add setHeaderContent to dependencies

  const quickNav = useMemo(
    () => [
      { id: 'overview', icon: FaHome, label: 'Overview' },
      ...(isStaff ? [{ id: 'tasks', icon: FaTasks, label: 'Tasks' }] : []),
      { id: 'orders', icon: FaShoppingCart, label: 'Orders' },
      { id: 'notifications', icon: FaBell, label: 'Alerts' },
      { id: 'activity', icon: FaChartLine, label: 'Activity' },
      { id: 'actions', icon: FaRobot, label: 'Actions' }
    ],
    [isStaff]
  );

  const dashboardData = useMemo(
    () => {
      // Base data structure
      const baseData = {
        stats: {
          openTasks: isStaff ? 6 : 0,
          pendingOrders: 3,
          newMessages: 12,
          upcomingEvents: 2,
          // Affiliate-specific stats
          referrals: isAffiliateUser ? 24 : 0,
          earnings: isAffiliateUser ? '$480' : '$0',
          // Client-specific stats
          activeProjects: isClientUser ? 2 : 0,
          invoicesDue: isClientUser ? 1 : 0
        },
        tasks: [
          { id: 1, title: 'Process new onboarding batch', dueDate: 'Today', status: 'In Progress', priority: 'high' },
          { id: 2, title: 'Verify client role sync', dueDate: 'Tomorrow', status: 'Pending', priority: 'medium' },
          { id: 3, title: 'Schedule maintenance window', dueDate: 'Friday', status: 'Planned', priority: 'low' }
        ],
        orders: [
          { id: 1042, name: 'Premium Support', date: 'Today', status: 'processing', total: '$240' },
          { id: 1041, name: 'Automation Add-on', date: 'Yesterday', status: 'completed', total: '$180' },
          { id: 1039, name: 'Discord Audit', date: '2 days ago', status: 'shipped', total: '$95' }
        ],
        notifications: [
          { id: 21, type: 'success', message: 'Ticket #352 resolved by Ops.', time: '5m ago' },
          { id: 22, type: 'warning', message: 'API latency spiked in us-east.', time: '18m ago' },
          { id: 23, type: 'info', message: 'New partnership inquiry arrived.', time: '1h ago' }
        ],
        recentActivity: [
          { id: 301, action: 'Changelogs synced for v1.6.2', time: 'Just now' },
          { id: 302, action: 'User roles refreshed for 3 guilds', time: '8m ago' },
          { id: 303, action: 'Command center export generated', time: '26m ago' }
        ],
        // Client-specific data
        projects: [
          { id: 1, name: 'Discord Bot Setup', status: 'In Progress', progress: 75, dueDate: 'Dec 28' },
          { id: 2, name: 'Website Integration', status: 'Planning', progress: 20, dueDate: 'Jan 15' }
        ],
        // Affiliate-specific data
        referralStats: [
          { month: 'Nov', conversions: 8, earnings: '$160' },
          { month: 'Dec', conversions: 16, earnings: '$320' }
        ]
      };
      return baseData;
    },
    [isStaff, isClientUser, isAffiliateUser]
  );

  return (
    <>
      {/* Page header content now set via HeaderContext and rendered in Header.jsx */}

      <div className="page-content dashboard-content">
        <section className="dashboard-section stats-section">
          <div className="stats-grid">
            {/* Staff Stats */}
            {isStaff && (
              <>
                <div className="stat-card">
                  <div className="stat-icon tasks"><FaTasks /></div>
                  <div className="stat-info">
                    <h3>{dashboardData.stats.openTasks}</h3>
                    <p>Open Tasks</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon users"><FaUsers /></div>
                  <div className="stat-info">
                    <h3>{dashboardData.stats.newMessages}</h3>
                    <p>New Messages</p>
                  </div>
                </div>
              </>
            )}
            {/* Client Stats */}
            {isClientUser && (
              <>
                <div className="stat-card">
                  <div className="stat-icon orders"><FaFileInvoiceDollar /></div>
                  <div className="stat-info">
                    <h3>{dashboardData.stats.activeProjects}</h3>
                    <p>Active Projects</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon messages"><FaBell /></div>
                  <div className="stat-info">
                    <h3>{dashboardData.stats.invoicesDue}</h3>
                    <p>Invoices Due</p>
                  </div>
                </div>
              </>
            )}
            {/* Affiliate Stats */}
            {isAffiliateUser && (
              <>
                <div className="stat-card">
                  <div className="stat-icon tasks"><FaUsers /></div>
                  <div className="stat-info">
                    <h3>{dashboardData.stats.referrals}</h3>
                    <p>Total Referrals</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon orders"><FaDollarSign /></div>
                  <div className="stat-info">
                    <h3>{dashboardData.stats.earnings}</h3>
                    <p>Total Earnings</p>
                  </div>
                </div>
              </>
            )}
            {/* Universal Stats */}
            <div className="stat-card">
              <div className="stat-icon orders"><FaShoppingCart /></div>
              <div className="stat-info">
                <h3>{dashboardData.stats.pendingOrders}</h3>
                <p>Pending Orders</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon events"><FaClock /></div>
              <div className="stat-info">
                <h3>{dashboardData.stats.upcomingEvents}</h3>
                <p>Upcoming Events</p>
              </div>
            </div>
          </div>
        </section>

        <div className="dashboard-grid">
          {/* ...existing code for dashboard cards... */}
          {/* This section remains unchanged, just moved up one level */}
          {isStaff && (
            <div className="dashboard-card" id="tasks">
              <div className="card-header">
                <h2><FaTasks /> Your Tasks</h2>
                <Link to="/command-center" className="view-all-link">View All</Link>
              </div>
              <div className="card-content">
                {dashboardData.tasks.map(task => (
                  <div key={task.id} className="task-item">
                    <div className={`task-priority ${task.priority}`}></div>
                    <div className="task-info">
                      <h4>{task.title}</h4>
                      <p className="task-meta">
                        <FaClock /> Due: {task.dueDate}
                        <span className={`task-status ${task.status.toLowerCase().replace(' ', '-')}`}>{task.status}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* ...rest of dashboard cards unchanged... */}
          {/* Client-Specific: Active Projects */}
          {isClientUser && (
            <div className="dashboard-card" id="projects">
              <div className="card-header">
                <h2><FaTasks /> Your Projects</h2>
                <Link to="/shop" className="view-all-link">View All</Link>
              </div>
              <div className="card-content">
                {dashboardData.projects.map(project => (
                  <div key={project.id} className="project-item">
                    <div className="project-info">
                      <h4>{project.name}</h4>
                      <div className="project-progress">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${project.progress}%` }}></div>
                        </div>
                        <span className="progress-text">{project.progress}%</span>
                      </div>
                      <p className="project-meta">
                        Status: <span className={`project-status ${project.status.toLowerCase().replace(' ', '-')}`}>{project.status}</span>
                        <FaClock /> Due: {project.dueDate}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Affiliate-Specific: Referral Performance */}
          {isAffiliateUser && (
            <div className="dashboard-card" id="referrals">
              <div className="card-header">
                <h2><FaDollarSign /> Referral Performance</h2>
                <Link to="/shop" className="view-all-link">View Details</Link>
              </div>
              <div className="card-content">
                {dashboardData.referralStats.map((stat, idx) => (
                  <div key={idx} className="referral-stat-item">
                    <div className="referral-month">{stat.month}</div>
                    <div className="referral-details">
                      <span className="referral-conversions">{stat.conversions} conversions</span>
                      <span className="referral-earnings">{stat.earnings}</span>
                    </div>
                  </div>
                ))}
                <div className="affiliate-summary">
                  <p><strong>Total Referrals:</strong> {dashboardData.stats.referrals}</p>
                  <p><strong>Total Earnings:</strong> {dashboardData.stats.earnings}</p>
                </div>
              </div>
            </div>
          )}
          <div className="dashboard-card" id="orders">
            <div className="card-header">
              <h2><FaShoppingCart /> Recent Orders</h2>
              <Link to="/shop" className="view-all-link">View All</Link>
            </div>
            <div className="card-content">
              {dashboardData.orders.map(order => (
                <div key={order.id} className="order-item">
                  <div className="order-info">
                    <h4>{order.name}</h4>
                    <p className="order-meta">Order #{order.id} • {order.date}</p>
                  </div>
                  <div className="order-right">
                    <span className={`order-status ${order.status}`}>{order.status}</span>
                    <span className="order-total">{order.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="dashboard-card" id="notifications">
            <div className="card-header">
              <h2><FaBell /> Notifications</h2>
            </div>
            <div className="card-content">
              {dashboardData.notifications.length > 0 ? (
                dashboardData.notifications.map(notif => (
                  <div key={notif.id} className={`notification-item ${notif.type}`}>
                    <div className="notif-icon">
                      {notif.type === 'success' && <FaCheckCircle />}
                      {notif.type === 'warning' && <FaExclamationTriangle />}
                      {notif.type === 'info' && <FaBell />}
                    </div>
                    <div className="notif-content">
                      <p>{notif.message}</p>
                      <span className="notif-time">{notif.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p>No notifications</p>
              )}
            </div>
          </div>
          <div className="dashboard-card" id="activity">
            <div className="card-header">
              <h2><FaChartLine /> Recent Activity</h2>
            </div>
            <div className="card-content activity-list">
              {dashboardData.recentActivity.length > 0 ? (
                dashboardData.recentActivity.map(activity => (
                  <div key={activity.id} className="activity-item">
                    <span className="activity-action">{activity.action}</span>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                ))
              ) : (
                <p>No recent activity</p>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-grid" id="actions">
          <div className="dashboard-card quick-actions">
            <div className="card-header">
              <h2>Quick Actions</h2>
            </div>
            <div className="card-content">
              <div className="quick-actions-grid">
                {isStaff && (
                  <>
                    <Link to="/command-center" className="quick-action-btn">
                      <FaTasks />
                      <span>Manage Tasks</span>
                    </Link>
                    <Link to="/control-panel" className="quick-action-btn">
                      <FaRobot />
                      <span>Command Center</span>
                    </Link>
                  </>
                )}
                <Link to="/shop" className="quick-action-btn">
                  <FaShoppingCart />
                  <span>Browse Shop</span>
                </Link>
                {isPrivileged && (
                  <Link to="/control-panel/users" className="quick-action-btn">
                    <FaRobot />
                    <span>Control Panel</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
