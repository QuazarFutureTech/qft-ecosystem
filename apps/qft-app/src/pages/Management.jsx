import React, { useState } from 'react';
import './Management.css'; // Assuming you'll create this for styling
import { useModal } from '../hooks/useModal';
import ConfirmModal from '../components/elements/ConfirmModal';

// Mock data for tasks
const mockTasks = [
  { id: 't1', name: 'Review QFT Agent Logs', assignee: 'Alice Smith', status: 'Pending', dueDate: '2025-12-20' },
  { id: 't2', name: 'Update Discord Bot Configuration', assignee: 'Bob Johnson', status: 'In Progress', dueDate: '2025-12-25' },
  { id: 't3', name: 'Deploy new API Gateway Feature', assignee: 'Charlie Brown', status: 'Completed', dueDate: '2025-12-10' },
  { id: 't4', name: 'Onboard new team member', assignee: 'Diana Prince', status: 'Pending', dueDate: '2026-01-05' },
];

function Management() {
  const [tasks, setTasks] = useState(mockTasks);
  const [filterStatus, setFilterStatus] = useState('All');
  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  const availableStatuses = ['All', ...new Set(mockTasks.map(task => task.status))];

  const filteredTasks = tasks.filter(task => {
    return filterStatus === 'All' || task.status === filterStatus;
  });

  const handleScheduleTask = async (taskId) => {
    await showAlert(`Scheduling task: ${taskId}`);
    // In a real app, this would open a form to schedule a new task or modify an existing one
  };

  const handleCancelTask = async (taskId) => {
    const confirmed = await showConfirm(`Are you sure you want to cancel task ${taskId}?`);
    if (confirmed) {
      setTasks(tasks.map(task =>
        task.id === taskId ? { ...task, status: 'Cancelled' } : task
      ));
      await showAlert(`Task ${taskId} cancelled.`);
    }
  };

  const handleViewTaskLifecycle = async (taskId) => {
    await showAlert(`Viewing lifecycle for task: ${taskId}`);
    // In a real app, this would open a modal with task details and history
  };

  return (
    <div className="page-content management-page">
      <h1>Task Management (HQ/Command Center)</h1>

      {/* Task Creation/Scheduling Section */}
      <div className="qft-card" style={{ marginBottom: '20px', padding: '15px' }}>
        <h2>Quick Actions</h2>
        <button className="qft-button" onClick={() => handleScheduleTask('new')} style={{ marginRight: '10px' }}>
          + Schedule New Task
        </button>
        {/* Placeholder for bulk actions or advanced scheduling */}
        {/* <button className="qft-button">Automate Workflow</button> */}
      </div>

      {/* Task List and Filters */}
      <div className="qft-card" style={{ marginBottom: '20px', padding: '15px' }}>
        <h2>Current Tasks</h2>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="status-filter" className="qft-label" style={{ marginRight: '10px' }}>Filter by Status:</label>
          <select
            id="status-filter"
            className="qft-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '8px', borderRadius: '5px', border: '1px solid var(--border-color)' }}
          >
            {availableStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="qft-card">No tasks found for the selected status.</div>
        ) : (
          <div className="task-grid">
            {filteredTasks.map(task => (
              <div key={task.id} className="qft-card task-card" style={{ marginBottom: '15px', padding: '15px' }}>
                <h3>{task.name}</h3>
                <p><strong>Assignee:</strong> {task.assignee}</p>
                <p><strong>Status:</strong> <span className={`task-status-${task.status.toLowerCase().replace(/\s/g, '-')}`}>{task.status}</span></p>
                <p><strong>Due Date:</strong> {task.dueDate}</p>
                <div className="task-actions" style={{ marginTop: '10px' }}>
                  <button className="qft-button" onClick={() => handleViewTaskLifecycle(task.id)} style={{ marginRight: '10px' }}>
                    View Lifecycle
                  </button>
                  {task.status !== 'Completed' && task.status !== 'Cancelled' && (
                    <button className="qft-button secondary" onClick={() => handleCancelTask(task.id)}>
                      Cancel Task
                    </button>
                  )}
                  {/* Placeholder for editing or reassigning task */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Future Automation & Stateful Task Flows */}
      <div className="qft-card" style={{ marginTop: '30px', padding: '15px' }}>
        <h2>Future Enhancements:</h2>
        <ul>
          <li><strong>Automated Workflows:</strong> Integrate with external services for automated task creation and execution based on triggers.</li>
          <li><strong>Gantt Chart/Timeline View:</strong> Visualize task dependencies and project timelines.</li>
          <li><strong>Resource Allocation:</strong> Advanced tools for assigning resources and managing workload.</li>
          <li><strong>Notifications:</strong> Real-time alerts for task status changes, due dates, and assignments.</li>
          <li><strong>Integration with QFT Agent:</strong> Direct command execution and status updates via the QFT Agent.</li>
        </ul>
      </div>
      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
      />
    </div>
  );
}

export default Management;