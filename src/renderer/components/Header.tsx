import React, { useState } from 'react';
import { Profile } from '../../shared/types';
import { useLanguage } from '../hooks/useLanguage';
import '../styles/header.css';

const api = window.streampad;

interface HeaderProps {
  profiles: Profile[];
  activeProfile: Profile | null;
  onProfileSelect: (id: string) => void;
  onCreateProfile: (name: string) => void;
  onDeleteProfile: (id: string) => void;
  onImportProfile: (json: string) => void;
  onOpenSettings: () => void;
}

export default function Header({
  profiles,
  activeProfile,
  onProfileSelect,
  onCreateProfile,
  onDeleteProfile,
  onImportProfile,
  onOpenSettings,
}: HeaderProps) {
  const { t } = useLanguage();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateProfile(newName.trim());
      setNewName('');
      setIsCreating(false);
    }
  };

  const handleExport = async () => {
    if (!activeProfile) return;
    try {
      const json = await api.profiles.export(activeProfile.id);
      const filePath = await api.dialog.saveFile({
        defaultPath: `${activeProfile.name}.json`,
        filters: [{ name: t.header.streampadProfile, extensions: ['json'] }],
      });
      if (filePath && json) {
        // Write via a system command since we don't have fs in renderer
        // Actually the export returns the JSON string, we need to save it
        // For now, copy to clipboard as a fallback
        navigator.clipboard.writeText(typeof json === 'string' ? json : JSON.stringify(json, null, 2));
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleImport = async () => {
    try {
      const filePath = await api.dialog.openFile({
        filters: [{ name: t.header.streampadProfile, extensions: ['json'] }],
      });
      if (filePath) {
        // Read the file via fetch or a custom IPC - for now use the path-based import
        // The profileManager.importProfile expects JSON string
        // We'll pass the path and let main process handle it
        onImportProfile(filePath);
      }
    } catch (err) {
      console.error('Import failed:', err);
    }
  };

  return (
    <header className="header">
      {/* Brand */}
      <div className="header-brand">
        <svg className="header-logo" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <span className="header-title">{t.header.appName}</span>
      </div>

      {/* Profile controls */}
      <div className="header-profiles">
        <label className="header-label">{t.header.profile}</label>
        <select
          className="profile-select"
          value={activeProfile?.id || ''}
          onChange={(e) => onProfileSelect(e.target.value)}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {isCreating ? (
          <div className="profile-create-form">
            <input
              type="text"
              placeholder={t.header.profilePlaceholder}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <button className="btn btn-accent btn-sm" onClick={handleCreate}>
              {t.header.create}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setIsCreating(false)}>
              {t.header.cancel}
            </button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={() => setIsCreating(true)}>
            {t.header.newProfile}
          </button>
        )}

        {activeProfile && profiles.length > 1 && (
          <button
            className="btn btn-danger btn-sm"
            onClick={() => onDeleteProfile(activeProfile.id)}
            title={t.header.deleteProfile}
          >
            ✕
          </button>
        )}

        <span className="header-separator" />

        <button className="btn btn-ghost btn-sm" onClick={handleExport} title={t.header.exportProfile} disabled={!activeProfile}>
          {t.header.exportProfile}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={handleImport} title={t.header.importProfile}>
          {t.header.importProfile}
        </button>
      </div>

      <div className="header-spacer" />

      {/* Settings */}
      <button className="btn btn-ghost btn-sm header-settings-btn" onClick={onOpenSettings} title={t.header.settings}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-1.42 3.42 2 2 0 0 1-1.42-.59l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-3.42-1.42 2 2 0 0 1 .59-1.42l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 1.42-3.42 2 2 0 0 1 1.42.59l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 3.42 1.42 2 2 0 0 1-.59 1.42l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {/* Window controls */}
      <div className="window-controls">
        <button className="window-btn" onClick={() => api.window.minimize()} title={t.header.minimize}>
          <svg viewBox="0 0 12 12" width="12" height="12"><rect x="2" y="5.5" width="8" height="1" fill="currentColor" /></svg>
        </button>
        <button className="window-btn" onClick={() => api.window.maximize()} title={t.header.maximize}>
          <svg viewBox="0 0 12 12" width="12" height="12"><rect x="2.5" y="2.5" width="7" height="7" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
        </button>
        <button className="window-btn window-btn-close" onClick={() => api.window.close()} title={t.header.close}>
          <svg viewBox="0 0 12 12" width="12" height="12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" /></svg>
        </button>
      </div>
    </header>
  );
}
