import React, { useState, useEffect } from 'react';
import Button from '../elements/Button';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import { listScheduledEmbeds, removeScheduledEmbed } from '../../services/admin';
import { useModal } from '../../hooks/useModal';
import ConfirmModal from '../elements/ConfirmModal';

export default function ScheduledEmbedsModule() {
  const { selectedGuildId } = useSelectedGuild();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(null);
  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  useEffect(() => {
    const load = async () => {
      if (!selectedGuildId) return;
      setLoading(true);
      const token = localStorage.getItem('qft-token');
      const res = await listScheduledEmbeds(selectedGuildId, token);
      setLoading(false);
      if (res.success) setJobs(res.data);
    };
    load();
  }, [selectedGuildId]);

  const handleRemove = async (jobId) => {
    const confirmed = await showConfirm(`Remove scheduled embed ${jobId}?`);
    if (!confirmed) return;
    setRemoving(jobId);
    const token = localStorage.getItem('qft-token');
    const res = await removeScheduledEmbed(selectedGuildId, jobId, token);
    setRemoving(null);
    await showAlert(res.message);
    if (res.success) {
      setJobs(jobs.filter(j => j.id !== jobId));
    }
  };

  return (
    <>
      <div className="qft-card">
        <h2>Scheduled Embeds</h2>
        {loading ? (
          <p>Loading…</p>
        ) : jobs.length === 0 ? (
          <p>No scheduled embeds for this guild.</p>
        ) : (
          <ul className="guild-list">
            {jobs.map(job => (
              <li key={job.id} className="guild-entry" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <strong>ID:</strong> {job.id}<br />
                  <strong>Channel:</strong> #{job.channelId}<br />
                  <strong>Next:</strong> {new Date(job.nextRun).toLocaleString()}<br />
                  {job.repeatSeconds > 0 && <><strong>Repeat:</strong> {job.repeatSeconds}s</>}
                </div>
                <Button onClick={() => handleRemove(job.id)} disabled={removing === job.id} variant="secondary">
                  {removing === job.id ? 'Removing…' : 'Remove'}
                </Button>
              </li>
            ))}
          </ul>
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
    </>
  );
}
