import React, { useState, useEffect } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '../../shared/types';
import '../styles/sidebar.css';

const api = window.streampad;

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.settings.get().then((s: AppSettings) => {
      if (s) setSettings(s);
    });
  }, []);

  const update = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await api.settings.set({ [key]: value });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Settings</h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      <div className="sidebar-content">
        {/* Behavior */}
        <div className="field">
          <label className="field-label">Behavior</label>
        </div>

        <div className="field">
          <label className="field-label-inline">
            <input
              type="checkbox"
              checked={settings.minimizeToTray}
              onChange={(e) => update('minimizeToTray', e.target.checked)}
            />
            <span>Minimize to system tray on close</span>
          </label>
        </div>

        <div className="field">
          <label className="field-label-inline">
            <input
              type="checkbox"
              checked={settings.startMinimized}
              onChange={(e) => update('startMinimized', e.target.checked)}
            />
            <span>Start minimized</span>
          </label>
        </div>

        <div className="field">
          <label className="field-label-inline">
            <input
              type="checkbox"
              checked={settings.autoConnect}
              onChange={(e) => update('autoConnect', e.target.checked)}
            />
            <span>Auto-connect to last device</span>
          </label>
        </div>

        {/* Timing */}
        <div className="field" style={{ marginTop: 10 }}>
          <label className="field-label">Input Timing</label>
        </div>

        <div className="field">
          <label className="field-label" style={{ textTransform: 'none', fontWeight: 400, fontSize: 12 }}>Hold threshold</label>
          <div className="action-fields">
            <input
              type="range"
              min="200"
              max="2000"
              step="50"
              value={settings.holdThresholdMs}
              onChange={(e) => update('holdThresholdMs', parseInt(e.target.value))}
            />
            <span className="field-unit">{settings.holdThresholdMs}ms</span>
          </div>
        </div>

        <div className="field">
          <label className="field-label" style={{ textTransform: 'none', fontWeight: 400, fontSize: 12 }}>Multi-press window</label>
          <div className="action-fields">
            <input
              type="range"
              min="100"
              max="1000"
              step="50"
              value={settings.multiPressWindowMs}
              onChange={(e) => update('multiPressWindowMs', parseInt(e.target.value))}
            />
            <span className="field-unit">{settings.multiPressWindowMs}ms</span>
          </div>
        </div>

        {/* Theme */}
        <div className="field" style={{ marginTop: 10 }}>
          <label className="field-label">Appearance</label>
          <div className="btn-group">
            <button
              className={`btn btn-sm ${settings.theme === 'dark' ? 'btn-accent' : 'btn-ghost'}`}
              onClick={() => update('theme', 'dark')}
            >
              Dark
            </button>
            <button
              className={`btn btn-sm ${settings.theme === 'light' ? 'btn-accent' : 'btn-ghost'}`}
              onClick={() => update('theme', 'light')}
            >
              Light
            </button>
          </div>
        </div>

        {saved && (
          <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 8 }}>
            Settings saved
          </div>
        )}
      </div>
    </div>
  );
}
