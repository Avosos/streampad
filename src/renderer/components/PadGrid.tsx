import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Layer, PadConfig, PadColor } from '../../shared/types';
import '../styles/padgrid.css';

interface PadGridProps {
  layer: Layer | null;
  activePads: Set<number>;
  selectedPad: PadConfig | null;
  onPadSelect: (pad: PadConfig) => void;
  onPadUpdate?: (pad: PadConfig) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  pad: PadConfig;
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

// Clipboard for copy/paste
let clipboardPad: PadConfig | null = null;

/** Is this grid position an empty corner? */
function isCorner(row: number, col: number): boolean {
  return (row === 0 || row === 9) && (col === 0 || col === 9);
}

export default function PadGrid({ layer, activePads, selectedPad, onPadSelect, onPadUpdate }: PadGridProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent, pad: PadConfig) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, pad });
  }, []);

  const handleCopy = () => {
    if (contextMenu) {
      clipboardPad = JSON.parse(JSON.stringify(contextMenu.pad));
      setContextMenu(null);
    }
  };

  const handlePaste = () => {
    if (contextMenu && clipboardPad && onPadUpdate) {
      const updated: PadConfig = {
        ...contextMenu.pad,
        label: clipboardPad.label,
        icon: clipboardPad.icon,
        image: clipboardPad.image,
        triggers: JSON.parse(JSON.stringify(clipboardPad.triggers)),
        ledDefault: { ...clipboardPad.ledDefault },
        ledActive: { ...clipboardPad.ledActive },
      };
      onPadUpdate(updated);
      setContextMenu(null);
    }
  };

  const handleClear = () => {
    if (contextMenu && onPadUpdate) {
      const cleared: PadConfig = {
        ...contextMenu.pad,
        label: '',
        icon: '',
        image: '',
        triggers: [],
        ledDefault: { color: { r: 0, g: 0, b: 0 }, brightness: 0 },
        ledActive: { color: { r: 60, g: 60, b: 60 }, brightness: 0.5 },
      };
      onPadUpdate(cleared);
      setContextMenu(null);
    }
  };

  if (!layer) {
    return (
      <div className="padgrid-empty">
        <p>No active profile. Create one to get started.</p>
      </div>
    );
  }

  // Build 10×10 grid (includes side/top/bottom buttons)
  const grid: (PadConfig | null)[][] = Array.from({ length: 10 }, () => Array(10).fill(null));
  for (const pad of layer.pads) {
    if (pad.row >= 0 && pad.row < 10 && pad.col >= 0 && pad.col < 10) {
      grid[pad.row][pad.col] = pad;
    }
  }

  const renderPadContent = (pad: PadConfig) => {
    const hasAction = pad.triggers.length > 0;

    // Image takes priority
    if (pad.image) {
      return <img className="pad-image" src={pad.image} alt={pad.label || ''} draggable={false} />;
    }
    // Then icon (emoji or icon name)
    if (pad.icon) {
      return <span className="pad-icon">{pad.icon}</span>;
    }
    // Then text label
    if (pad.label) {
      return <span className="pad-label">{pad.label}</span>;
    }
    // Configured dot
    if (hasAction) {
      return <span className="pad-dot" />;
    }
    return null;
  };

  return (
    <div className="padgrid">
      {grid.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className="padgrid-row"
        >
          {row.map((pad, colIdx) => {
            // Empty corners
            if (isCorner(rowIdx, colIdx)) {
              return <div key={colIdx} className="pad-corner" />;
            }

            if (!pad) {
              return <div key={colIdx} className="pad pad-empty" />;
            }

            const isActive = activePads.has(pad.midiNote);
            const isSelected = selectedPad?.id === pad.id;
            const ledState = isActive ? pad.ledActive : pad.ledDefault;
            const bgColor = padColorToCSS(ledState.color, ledState.brightness);
            const glowColor = padColorToGlow(ledState.color);
            const hasAction = pad.triggers.length > 0;
            const isRound = pad.padShape === 'round'
              || (!pad.padShape && (pad.row === 0 || pad.row === 9 || pad.col === 0 || pad.col === 9));

            return (
              <button
                key={colIdx}
                className={[
                  'pad',
                  isRound ? 'pad-round' : '',
                  isActive ? 'pad-active' : '',
                  isSelected ? 'pad-selected' : '',
                  hasAction ? 'pad-configured' : '',
                ].filter(Boolean).join(' ')}
                style={{
                  '--pad-color': bgColor,
                  '--pad-glow': glowColor,
                } as React.CSSProperties}
                onClick={() => onPadSelect(pad)}
                onContextMenu={(e) => handleContextMenu(e, pad)}
                title={pad.label || `Pad ${pad.row}×${pad.col} (Note ${pad.midiNote})`}
              >
                {renderPadContent(pad)}
              </button>
            );
          })}
        </div>
      ))}

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="pad-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button className="context-menu-item" onClick={handleCopy}>
            Copy
          </button>
          <button
            className="context-menu-item"
            onClick={handlePaste}
            disabled={!clipboardPad}
          >
            Paste
          </button>
          <div className="context-menu-divider" />
          <button className="context-menu-item context-menu-danger" onClick={handleClear}>
            Clear Pad
          </button>
        </div>
      )}
    </div>
  );
}
