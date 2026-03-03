import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import PadGrid from './components/PadGrid';
import Sidebar from './components/Sidebar';
import DeviceBar from './components/DeviceBar';
import Settings from './components/Settings';
import CalibrationWizard from './components/CalibrationWizard';
import { Profile, PadConfig, MidiDeviceInfo, Layer, MidiMessage, InputEvent } from '../shared/types';
import './styles/app.css';

const api = window.streampad;

interface PadTriggerEvent {
  deviceId: string;
  note: number;
  event: InputEvent;
  value: number;
  timestamp: number;
}

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [activeLayer, setActiveLayer] = useState<Layer | null>(null);
  const [selectedPad, setSelectedPad] = useState<PadConfig | null>(null);
  const [devices, setDevices] = useState<MidiDeviceInfo[]>([]);
  const [activePads, setActivePads] = useState<Set<number>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);

  // ─── Apply theme from settings ─────────────────────────
  const applyTheme = useCallback((theme: string) => {
    document.documentElement.setAttribute('data-theme', theme);
    // Update background color for the title bar area
    const bgMap: Record<string, string> = {
      dark: '#0a0a10',
      light: '#f5f5f8',
      grey: '#2b2d31',
    };
    document.documentElement.style.setProperty('--bg-primary', bgMap[theme] || bgMap.dark);
  }, []);

  // ─── Load initial state ────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        // Load theme first to avoid flash
        const settings = await api.settings.get();
        if (settings?.theme) {
          applyTheme(settings.theme);
        }

        // Check if calibration has been completed
        if (!settings?.calibrated) {
          setShowCalibration(true);
        }

        const state = await api.app.getState();
        setDevices(state.devices || []);
        setProfiles(state.profiles || []);

        if (state.activeProfileId) {
          const profile = state.profiles?.find((p: Profile) => p.id === state.activeProfileId);
          if (profile) {
            setActiveProfile(profile);
            const layer = profile.layers.find((l: Layer) => l.id === profile.activeLayerId) || profile.layers[0];
            setActiveLayer(layer || null);
          }
        }
      } catch (err) {
        console.error('Failed to load initial state:', err);
      }
    }
    init();
  }, []);

  // ─── Listen for MIDI events (visual feedback in GUI) ───
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(
      api.midi.onMessage((_deviceId: string, msg: MidiMessage) => {
        if (msg.type === 'noteon' && msg.velocity > 0) {
          setActivePads((prev) => new Set(prev).add(msg.note));
        } else if (msg.type === 'noteoff' || (msg.type === 'noteon' && msg.velocity === 0)) {
          setActivePads((prev) => {
            const next = new Set(prev);
            next.delete(msg.note);
            return next;
          });
        }
      })
    );

    unsubs.push(
      api.midi.onDeviceConnected((device: MidiDeviceInfo) => {
        setDevices((prev) => [...prev.filter((d) => d.id !== device.id), device]);
      })
    );

    unsubs.push(
      api.midi.onDeviceDisconnected((device: MidiDeviceInfo) => {
        setDevices((prev) => prev.map((d) => (d.id === device.id ? { ...d, isConnected: false } : d)));
      })
    );

    unsubs.push(
      api.pads.onTrigger((_event: PadTriggerEvent) => {
        // Could be used for additional GUI feedback
      })
    );

    return () => unsubs.forEach((fn) => fn());
  }, []);

  // ─── Profile management ────────────────────────────────
  const handleProfileSelect = useCallback(async (profileId: string) => {
    const profile = await api.profiles.activate(profileId);
    if (profile) {
      setActiveProfile(profile);
      const layer = profile.layers.find((l: Layer) => l.id === profile.activeLayerId) || profile.layers[0];
      setActiveLayer(layer || null);
      setSelectedPad(null);
    }
  }, []);

  const handleCreateProfile = useCallback(async (name: string) => {
    const profile = await api.profiles.create(name);
    if (profile) {
      setProfiles((prev) => [...prev, profile]);
      handleProfileSelect(profile.id);
    }
  }, [handleProfileSelect]);

  const handleDeleteProfile = useCallback(async (id: string) => {
    await api.profiles.delete(id);
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    if (activeProfile?.id === id) {
      const remaining = profiles.filter((p) => p.id !== id);
      if (remaining.length > 0) {
        handleProfileSelect(remaining[0].id);
      } else {
        setActiveProfile(null);
        setActiveLayer(null);
      }
    }
  }, [activeProfile, profiles, handleProfileSelect]);

  const handleImportProfile = useCallback(async (filePath: string) => {
    try {
      // Read file via IPC and import
      const profile = await api.profiles.import(filePath);
      if (profile) {
        setProfiles((prev) => [...prev, profile]);
        handleProfileSelect(profile.id);
      }
    } catch (err) {
      console.error('Import failed:', err);
    }
  }, [handleProfileSelect]);

  // ─── Layer management ──────────────────────────────────
  const handleLayerSwitch = useCallback(async (layerId: string) => {
    const layer = await api.layers.switch(layerId);
    if (layer) {
      setActiveLayer(layer);
      setSelectedPad(null);
    }
  }, []);

  const handleCreateLayer = useCallback(async (name: string) => {
    const layer = await api.layers.create(name);
    if (layer && activeProfile) {
      const updated = await api.profiles.get(activeProfile.id);
      if (updated) {
        setActiveProfile(updated);
      }
    }
  }, [activeProfile]);

  // ─── Pad management ────────────────────────────────────
  const handlePadSelect = useCallback((pad: PadConfig) => {
    setSelectedPad(pad);
  }, []);

  const handlePadUpdate = useCallback(async (pad: PadConfig) => {
    await api.pads.update(pad);
    setSelectedPad(pad);

    // Update local layer state
    if (activeLayer) {
      const updatedPads = activeLayer.pads.map((p) => (p.id === pad.id ? pad : p));
      setActiveLayer({ ...activeLayer, pads: updatedPads });
    }
  }, [activeLayer]);

  return (
    <div className="app">
      {showCalibration && (
        <CalibrationWizard
          devices={devices}
          onComplete={() => setShowCalibration(false)}
        />
      )}
      <Header
        profiles={profiles}
        activeProfile={activeProfile}
        onProfileSelect={handleProfileSelect}
        onCreateProfile={handleCreateProfile}
        onDeleteProfile={handleDeleteProfile}
        onImportProfile={handleImportProfile}
        onOpenSettings={() => setShowSettings((s) => !s)}
      />
      <div className="app-body">
        {showSettings ? (
          <Settings onClose={() => setShowSettings(false)} />
        ) : (
          <>
            <div className="app-main">
              <DeviceBar devices={devices} />
              <div className="grid-container">
                <PadGrid
                  layer={activeLayer}
                  activePads={activePads}
                  selectedPad={selectedPad}
                  onPadSelect={handlePadSelect}
                  onPadUpdate={handlePadUpdate}
                />
              </div>
              {activeProfile && activeProfile.layers.length > 1 && (
                <div className="layer-bar">
                  {activeProfile.layers.map((layer) => (
                    <button
                      key={layer.id}
                      className={`layer-btn ${layer.id === activeLayer?.id ? 'active' : ''}`}
                      onClick={() => handleLayerSwitch(layer.id)}
                    >
                      {layer.name}
                    </button>
                  ))}
                  <button
                    className="layer-btn add"
                    onClick={() => handleCreateLayer(`Layer ${activeProfile.layers.length + 1}`)}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
            <Sidebar
              selectedPad={selectedPad}
              onPadUpdate={handlePadUpdate}
              onClose={() => setSelectedPad(null)}
              profiles={profiles}
              activeProfile={activeProfile}
            />
          </>
        )}
      </div>
    </div>
  );
}
