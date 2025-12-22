// TasksModule.jsx - Task Management & Projects
import React, { useState } from 'react';
import { useModal } from '../../hooks/useModal';
import ConfirmModal from '../elements/ConfirmModal';
import '../modules.css';

const mockTasks = [
  { id: 't1', name: 'Review QFT Agent Logs', assignee: 'Alice Smith', status: 'Pending', dueDate: '2025-12-20', priority: 'High' },
  { id: 't2', name: 'Update Discord Bot Configuration', assignee: 'Bob Johnson', status: 'In Progress', dueDate: '2025-12-25', priority: 'Medium' },
  { id: 't3', name: 'Deploy new API Gateway Feature', assignee: 'Charlie Brown', status: 'Completed', dueDate: '2025-12-10', priority: 'High' },
  { id: 't4', name: 'Onboard new team member', assignee: 'Diana Prince', status: 'Pending', dueDate: '2026-01-05', priority: 'Low' },
];

export default function TasksModule({ isPrivileged }) {
  const [tasks, setTasks] = useState(mockTasks);
  const [filterStatus, setFilterStatus] = useState('All');
  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  const availableStatuses = ['All', ...new Set(mockTasks.map(task => task.status))];

  const filteredTasks = tasks.filter(task => {
    return filterStatus === 'All' || task.status === filterStatus;
  });

  const handleCreateTask = async () => {
    await showAlert('Task creation form will open here');
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
    await showAlert(`Task status updated to ${newStatus}`);
  };

  const handleDeleteTask = async (taskId) => {
    const confirmed = await showConfirm('Are you sure you want to delete this task?');
    if (confirmed) {
      setTasks(tasks.filter(task => task.id !== taskId));
      await showAlert('Task deleted successfully');
    }
  };

  return (
    <div className="qft-module qft-card">
      <div className="module-header">
        <h2>Tasks & Projects</h2>
        {isPrivileged && (
          <button className="qft-button primary" onClick={handleCreateTask}>
            + New Task
          </button>
        )}
      </div>

      <div className="module-content">
        <div className="filter-row" style={{ marginBottom: '20px' }}>
          <label>Filter by Status:</label>
          <select
            className="qft-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {availableStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="tasks-grid" style={{ display: 'grid', gap: '15px' }}>
          {filteredTasks.map(task => (
            <div key={task.id} className="task-card qft-card" style={{ padding: '15px' }}>
              <div className="task-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3>{task.name}</h3>
                <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
                  {task.priority}
                </span>
              </div>
              <div className="task-details">
                <p><strong>Assignee:</strong> {task.assignee}</p>
                <p><strong>Status:</strong> <span className={`status-badge status-${task.status.toLowerCase().replace(/\s/g, '-')}`}>{task.status}</span></p>
                <p><strong>Due Date:</strong> {new Date(task.dueDate).toLocaleDateString()}</p>
              </div>
              <div className="task-actions" style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <button className="qft-button small" onClick={() => showAlert('Task details modal will open here')}>
                  View Details
                </button>
                {isPrivileged && (
                  <>
                    <button className="qft-button small secondary" onClick={() => showAlert('Edit task modal will open here')}>
                      Edit
                    </button>
                    <button className="qft-button small danger" onClick={() => handleDeleteTask(task.id)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <p className="empty-state">No tasks found for the selected status.</p>
        )}
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
