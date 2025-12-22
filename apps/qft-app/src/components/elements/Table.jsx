import React from 'react';
import './Table.css';

export default function Table({ cols = [], rows = [], caption }) {
  return (
    <div className="qft-table-wrap">
      {caption && <div className="qft-table-caption">{caption}</div>}
      <table className="qft-table" role="table" aria-label={caption || 'table'}>
        <thead>
          <tr>
            {cols.map(c => <th key={c.key} scope="col">{c.title}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i}>
              {cols.map(c => <td key={c.key}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
