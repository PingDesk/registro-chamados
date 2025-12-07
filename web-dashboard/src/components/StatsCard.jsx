import React from 'react';
import './StatsCard.css';

function StatsCard({ title, value, icon, color }) {
  return (
    <div className="stats-card" style={{ borderLeftColor: color }}>
      <div className="stats-icon" style={{ color }}>
        {icon}
      </div>
      <div className="stats-content">
        <p className="stats-title">{title}</p>
        <h2 className="stats-value">{value}</h2>
      </div>
    </div>
  );
}

export default StatsCard;
