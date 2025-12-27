import React, { useState } from 'react';
import Button from '../elements/Button';
import Input from '../elements/Input';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import { useModal } from '../../hooks/useModal';
import ConfirmModal from '../elements/ConfirmModal';

export default function AutomodRuleTesterModule() {
  const { selectedGuildId } = useSelectedGuild();
  const [testMessage, setTestMessage] = useState('');
  const [results, setResults] = useState(null);
  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  const testMessage_impl = async () => {
    if (!testMessage.trim()) return showAlert('Enter a test message.');
    
    // Fetch current automod config
    const token = localStorage.getItem('qft-token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const res = await fetch(`${API_URL}/api/v1/guilds/${selectedGuildId}/config`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json());

    if (!res.success) return showAlert('Failed to fetch automod config.');

    const config = res.data?.automod || { enabled: true, spamThreshold: 6, caps: true, links: true };
    const text = testMessage.toLowerCase();
    const words = text.split(/\s+/);

    let actions = [];

    // Spam check
    if (config.enabled && words.length >= config.spamThreshold) {
      actions.push({ rule: 'Spam', triggered: true, reason: `${words.length} words (threshold: ${config.spamThreshold})` });
    }

    // Caps check
    if (config.caps && config.enabled) {
      const capsCount = (testMessage.match(/[A-Z]/g) || []).length;
      const capsRatio = capsCount / testMessage.length;
      if (capsRatio > 0.5 && testMessage.length > 5) {
        actions.push({ rule: 'Excessive Caps', triggered: true, reason: `${Math.round(capsRatio * 100)}% caps` });
      }
    }

    // Links check
    if (config.links && config.enabled) {
      if (/https?:\/\/|www\./i.test(text)) {
        actions.push({ rule: 'Link Detection', triggered: true, reason: 'URL detected' });
      }
    }

    setResults({
      message: testMessage,
      config,
      actions: actions.length ? actions : [{ rule: 'All Clear', triggered: false }]
    });
  };

  return (
    <div className="qft-card">
      <h2>Automod Rule Tester</h2>
      <p style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>Test a message against active automod rules.</p>
      <div className="qft-field">
        <label className="qft-label">Test Message</label>
        <textarea
          value={testMessage}
          onChange={e => setTestMessage(e.target.value)}
          className="qft-input"
          rows={3}
          placeholder="Enter a message to test…"
          aria-label="Test message"
        />
        <Button onClick={testMessage_impl} variant="primary" style={{ marginTop: 10 }}>
          Test
        </Button>
      </div>

      {results && (
        <div style={{ marginTop: 15, padding: 10, backgroundColor: 'var(--bg-secondary)', borderRadius: 4 }}>
          <p><strong>Results for:</strong> "{results.message}"</p>
          <div style={{ marginTop: 10 }}>
            {results.actions.map((action, idx) => (
              <div key={idx} style={{ padding: 8, marginBottom: 6, backgroundColor: action.triggered ? '#ff6b6b33' : '#51cf6633', borderRadius: 4 }}>
                <strong>{action.rule}</strong>: {action.triggered ? '⚠️ TRIGGERED' : '✅ OK'} - {action.reason}
              </div>
            ))}
          </div>
        </div>
      )}
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
