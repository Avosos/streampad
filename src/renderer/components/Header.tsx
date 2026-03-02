import React, { useState } from 'react';
import { Profile } from '../../shared/types';
import '../styles/header.css';

interface HeaderProps {
  profiles: Profile[];
  activeProfile: Profile | null;
  onProfileSelect: (id: string) => void;
  onCreateProfile: (name: string) => void;
  onDeleteProfile: (id: string) => void;
}

export default function Header({
  profiles,
  activeProfile,
  onProfileSelect,
  onCreateProfile,
  onDeleteProfile,
}: HeaderProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateProfile(newName.trim());
      setNewName('');
      setIsCreating(false);
    }
  };

  return (
    <header className="header">
      <div className="header-brand">
        <svg className="header-logo" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <span className="header-title">StreamPad</span>
      </div>

      <div className="header-profiles">
        <label className="header-label">Profile:</label>
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
              placeholder="Profile name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <button className="btn btn-accent btn-sm" onClick={handleCreate}>
              Create
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setIsCreating(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={() => setIsCreating(true)}>
            + New
          </button>
        )}

        {activeProfile && profiles.length > 1 && (
          <button
            className="btn btn-danger btn-sm"
            onClick={() => onDeleteProfile(activeProfile.id)}
            title="Delete profile"
          >
            ✕
          </button>
        )}
      </div>

      <div className="header-spacer" />
    </header>
  );
}
