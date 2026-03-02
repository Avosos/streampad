import React from 'react';
import { Layer, PadConfig, PadColor } from '../../shared/types';
import '../styles/padgrid.css';

interface PadGridProps {
  layer: Layer | null;
  activePads: Set<number>;
  selectedPad: PadConfig | null;
  onPadSelect: (pad: PadConfig) => void;
}

function padColorToCSS(color: PadColor, brightness: number = 1): string {
  const r = Math.round(color.r * brightness);
  const g = Math.round(color.g * brightness);
  const b = Math.round(color.b * brightness);
  return `rgb(${r}, ${g}, ${b})`;
}

function padColorToGlow(color: PadColor): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, 0.4)`;
}

export default function PadGrid({ layer, activePads, selectedPad, onPadSelect }: PadGridProps) {
  if (!layer) {
    return (
      <div className="padgrid-empty">
        <p>No active profile. Create one to get started.</p>
      </div>
    );
  }

  // Build 8x8 grid
  const grid: (PadConfig | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (const pad of layer.pads) {
    if (pad.row >= 0 && pad.row < 8 && pad.col >= 0 && pad.col < 8) {
      grid[pad.row][pad.col] = pad;
    }
  }

  return (
    <div className="padgrid">
      {grid.map((row, rowIdx) => (
        <div key={rowIdx} className="padgrid-row">
          {row.map((pad, colIdx) => {
            if (!pad) {
              return <div key={colIdx} className="pad pad-empty" />;
            }

            const isActive = activePads.has(pad.midiNote);
            const isSelected = selectedPad?.id === pad.id;
            const ledState = isActive ? pad.ledActive : pad.ledDefault;
            const bgColor = padColorToCSS(ledState.color, ledState.brightness);
            const glowColor = padColorToGlow(ledState.color);
            const hasAction = pad.triggers.length > 0;

            return (
              <button
                key={colIdx}
                className={`pad ${isActive ? 'pad-active' : ''} ${isSelected ? 'pad-selected' : ''} ${hasAction ? 'pad-configured' : ''}`}
                style={{
                  '--pad-color': bgColor,
                  '--pad-glow': glowColor,
                } as React.CSSProperties}
                onClick={() => onPadSelect(pad)}
                title={pad.label || `Pad ${pad.row + 1}×${pad.col + 1} (Note ${pad.midiNote})`}
              >
                {pad.label && <span className="pad-label">{pad.label}</span>}
                {pad.icon && <span className="pad-icon">{pad.icon}</span>}
                {!pad.label && !pad.icon && hasAction && (
                  <span className="pad-dot" />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
