'use client';
import { useState, useEffect } from 'react';

/**
 * TestTimer Component - Displays countdown timer for test attempts
 * Auto-submits when time expires
 */
export default function TestTimer({ timeLimitMins, onTimeUp }) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimitMins * 60); // in seconds
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    if (timeRemaining <= 0) {
      setHasExpired(true);
      onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(t => {
        if (t <= 1) {
          setHasExpired(true);
          onTimeUp();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, onTimeUp]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isWarning = timeRemaining < 300; // Last 5 minutes
  const isCritical = timeRemaining < 60; // Last 1 minute

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 'var(--radius-md)',
        background: isCritical
          ? 'rgba(255, 68, 68, 0.15)'
          : isWarning
          ? 'rgba(250, 204, 21, 0.15)'
          : 'rgba(100, 150, 255, 0.1)',
        border: `2px solid ${
          isCritical ? 'var(--error)' : isWarning ? '#facc15' : 'var(--primary)'
        }`,
        fontWeight: 700,
        color: isCritical ? 'var(--error)' : isWarning ? '#ca8a04' : 'var(--primary)',
        fontSize: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}
    >
      <span>
        ⏱️ Time Remaining: {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
      {isWarning && (
        <span style={{ fontSize: 12, opacity: 0.8 }}>
          {isCritical ? '🔴 HURRY UP!' : '⚠️ Less than 5 minutes'}
        </span>
      )}
    </div>
  );
}
