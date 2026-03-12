import React, { useState, useEffect } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '../../shared/types';
import { useLanguage } from '../hooks/useLanguage';
import { LANGUAGES } from '@shared/i18n';
import '../styles/sidebar.css';

const api = window.streampad;

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const { t, language, setLanguage } = useLanguage();
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
    // Apply theme immediately
    if (key === 'theme') {
      document.documentElement.setAttribute('data-theme', value as string);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>{t.settings.title}</h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      <div className="sidebar-content">
        {/* Behavior */}
        <div className="field">
          <label className="field-label">{t.settings.behavior}</label>
        </div>

        <div className="field">
          <label className="field-label-inline">
            <input
              type="checkbox"
              checked={settings.minimizeToTray}
              onChange={(e) => update('minimizeToTray', e.target.checked)}
            />
            <span>{t.settings.minimizeToTray}</span>
          </label>
        </div>

        <div className="field">
          <label className="field-label-inline">
            <input
              type="checkbox"
              checked={settings.startMinimized}
              onChange={(e) => update('startMinimized', e.target.checked)}
            />
            <span>{t.settings.startMinimized}</span>
          </label>
        </div>

        <div className="field">
          <label className="field-label-inline">
            <input
              type="checkbox"
              checked={settings.autoConnect}
              onChange={(e) => update('autoConnect', e.target.checked)}
            />
            <span>{t.settings.autoConnect}</span>
          </label>
        </div>

        {/* Timing */}
        <div className="field" style={{ marginTop: 10 }}>
          <label className="field-label">{t.settings.inputTiming}</label>
        </div>

        <div className="field">
          <label className="field-label" style={{ textTransform: 'none', fontWeight: 400, fontSize: 12 }}>{t.settings.holdThreshold}</label>
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
          <label className="field-label" style={{ textTransform: 'none', fontWeight: 400, fontSize: 12 }}>{t.settings.multiPressWindow}</label>
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
          <label className="field-label">{t.settings.appearance}</label>
          <div className="btn-group">
            <button
              className={`btn btn-sm ${settings.theme === 'dark' ? 'btn-accent' : 'btn-ghost'}`}
              onClick={() => update('theme', 'dark')}
            >
              {t.settings.dark}
            </button>
            <button
              className={`btn btn-sm ${settings.theme === 'grey' ? 'btn-accent' : 'btn-ghost'}`}
              onClick={() => update('theme', 'grey')}
            >
              {t.settings.grey}
            </button>
            <button
              className={`btn btn-sm ${settings.theme === 'light' ? 'btn-accent' : 'btn-ghost'}`}
              onClick={() => update('theme', 'light')}
            >
              {t.settings.light}
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="field" style={{ marginTop: 10 }}>
          <label className="field-label">{t.settings.language}</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value as any)}>
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* Calibration */}
        <div className="field" style={{ marginTop: 10 }}>
          <label className="field-label">{t.settings.calibration}</label>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => update('calibrated', false)}
          >
            {t.settings.recalibrate}
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {t.settings.recalibrateDesc}
          </span>
        </div>

        {saved && (
          <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 8 }}>
            {t.settings.settingsSaved}
          </div>
        )}
      </div>
    </div>
  );
}
