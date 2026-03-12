import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MidiMessage, MidiDeviceInfo } from '../../shared/types';
import { useLanguage } from '../hooks/useLanguage';
import '../styles/calibration.css';

const api = window.streampad;

interface CalibrationWizardProps {
  onComplete: () => void;
  devices: MidiDeviceInfo[];
}

/** Convert a MIDI note to 10x10 grid position (simple lookup). */
function noteToGridPos(note: number): { row: number; col: number } | null {
  // Top row: notes 91-98 → row 0, cols 1-8
  if (note >= 91 && note <= 98) return { row: 0, col: note - 90 };
  // Bottom row: notes 1-8 → row 9, cols 1-8
  if (note >= 1 && note <= 8) return { row: 9, col: note };
  // Main rows: note = row*10+col, rows 10-89
  if (note >= 10 && note <= 89) {
    const launchpadRow = Math.floor(note / 10);
    const col = note % 10;
    if (col >= 0 && col <= 9) {
      const displayRow = 9 - launchpadRow;
      return { row: displayRow, col };
    }
  }
  return null;
}

/**
 * CalibrationWizard – Shown on first launch to verify pad mapping.
 * Lights up the corresponding grid cell when the user presses a pad
 * on their physical Launchpad.
 */
export default function CalibrationWizard({ onComplete, devices }: CalibrationWizardProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<'welcome' | 'detect' | 'test' | 'done'>('welcome');
  const [pressedPads, setPressedPads] = useState<Set<number>>(new Set());
  const [lastNote, setLastNote] = useState<number | null>(null);
  const [lastPos, setLastPos] = useState<{ row: number; col: number } | null>(null);
  const totalPads = useRef(0);
  const connectedDevices = devices.filter((d) => d.isConnected);

  // Listen for MIDI messages during calibration
  useEffect(() => {
    if (step !== 'test' && step !== 'detect') return;

    const unsub = api.midi.onMessage((_deviceId: string, msg: MidiMessage) => {
      if (msg.type === 'noteon' && msg.velocity > 0) {
        setLastNote(msg.note);
        const pos = noteToGridPos(msg.note);
        if (pos) {
          setLastPos(pos);
          setPressedPads((prev) => {
            const next = new Set(prev);
            next.add(msg.note);
            return next;
          });
          totalPads.current += 1;
        }

        // In detect mode, any pad press means device is working
        if (step === 'detect') {
          setStep('test');
        }
      }
    });

    return () => { unsub(); };
  }, [step]);

  const handleSkip = useCallback(() => {
    api.settings.set({ calibrated: true });
    onComplete();
  }, [onComplete]);

  const handleFinish = useCallback(() => {
    api.settings.set({ calibrated: true });
    onComplete();
  }, [onComplete]);

  // Build 10x10 visual grid
  const renderGrid = () => {
    const rows = [];
    for (let r = 0; r < 10; r++) {
      const cells = [];
      for (let c = 0; c < 10; c++) {
        const isCorner = (r === 0 || r === 9) && (c === 0 || c === 9);
        const isRound = !isCorner && (r === 0 || r === 9 || c === 0 || c === 9);

        // Find the note for this position
        let note = -1;
        if (!isCorner) {
          if (r === 0) note = 91 + (c - 1);
          else if (r === 9) note = c;
          else {
            const launchpadRow = 9 - r;
            note = launchpadRow * 10 + c;
          }
        }

        const isPressed = note >= 0 && pressedPads.has(note);
        const isLast = note >= 0 && lastNote === note;

        if (isCorner) {
          cells.push(<div key={c} className="cal-cell cal-corner" />);
        } else {
          cells.push(
            <div
              key={c}
              className={[
                'cal-cell',
                isRound ? 'cal-round' : '',
                isPressed ? 'cal-pressed' : '',
                isLast ? 'cal-last' : '',
              ].filter(Boolean).join(' ')}
            >
              {isLast && <span className="cal-note">{note}</span>}
            </div>
          );
        }
      }
      rows.push(
        <div key={r} className="cal-row">
          {cells}
        </div>
      );
    }
    return <div className="cal-grid">{rows}</div>;
  };

  return (
    <div className="calibration-overlay">
      <div className="calibration-card">
        {step === 'welcome' && (
          <>
            <div className="cal-icon">🎹</div>
            <h2>{t.calibration.welcome}</h2>
            <p className="cal-desc">
              {t.calibration.welcomeDesc}
            </p>
            {connectedDevices.length > 0 ? (
              <div className="cal-device-info">
                <span className="cal-device-dot connected" />
                {connectedDevices[0].name} {t.calibration.connected}
              </div>
            ) : (
              <div className="cal-device-info">
                <span className="cal-device-dot" />
                {t.calibration.noDevice}
              </div>
            )}
            <div className="cal-actions">
              <button className="btn btn-accent" onClick={() => setStep(connectedDevices.length > 0 ? 'test' : 'detect')}>
                {connectedDevices.length > 0 ? t.calibration.startCalibration : t.calibration.waitingForDevice}
              </button>
              <button className="btn btn-ghost" onClick={handleSkip}>
                {t.calibration.skip}
              </button>
            </div>
          </>
        )}

        {step === 'detect' && (
          <>
            <div className="cal-icon">🔍</div>
            <h2>{t.calibration.detectingDevice}</h2>
            <p className="cal-desc">
              {t.calibration.detectingDeviceDesc}
            </p>
            <div className="cal-pulse" />
            <div className="cal-actions">
              <button className="btn btn-ghost" onClick={handleSkip}>
                {t.calibration.skip}
              </button>
            </div>
          </>
        )}

        {step === 'test' && (
          <>
            <h2>{t.calibration.testPads}</h2>
            <p className="cal-desc">
              {t.calibration.testPadsDesc}
              {lastPos && (
                <span className="cal-last-info">
                  {' '}{t.calibration.lastNote.replace('{note}', String(lastNote)).replace('{row}', String(lastPos.row)).replace('{col}', String(lastPos.col))}
                </span>
              )}
            </p>
            {renderGrid()}
            <div className="cal-stats">
              {t.calibration.padsTested.replace('{n}', String(pressedPads.size))}
            </div>
            <div className="cal-actions">
              <button
                className="btn btn-accent"
                onClick={() => setStep('done')}
                disabled={pressedPads.size < 3}
              >
                {t.calibration.looksGood}
              </button>
              <button className="btn btn-ghost" onClick={handleSkip}>
                {t.calibration.skip}
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <div className="cal-icon">✅</div>
            <h2>{t.calibration.allSet}</h2>
            <p className="cal-desc">
              {t.calibration.allSetDesc.replace('{n}', String(pressedPads.size))}
            </p>
            <div className="cal-actions">
              <button className="btn btn-accent" onClick={handleFinish}>
                {t.calibration.startUsing}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
