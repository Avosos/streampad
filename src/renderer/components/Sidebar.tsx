import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PadConfig,
  TriggerType,
  Action,
  ActionType,
  PadTriggerConfig,
  InputEvent,
  LedState,
  PadColor,
  KeyboardShortcutAction,
  HotkeySequenceAction,
  LaunchAppAction,
  SystemCommandAction,
  HttpRequestAction,
  WebSocketMessageAction,
  OscMessageAction,
  PluginActionDef,
  ProfileSwitchAction,
  LayerSwitchAction,
  DelayAction,
  PlayAudioAction,
  MediaKeyAction,
  MediaKeyType,
  OpenFolderAction,
  Profile,
  Layer,
} from '../../shared/types';
import { v4 as uuid } from 'uuid';
import '../styles/sidebar.css';

const api = window.streampad;

interface SidebarProps {
  selectedPad: PadConfig | null;
  onPadUpdate: (pad: PadConfig) => void;
  onClose: () => void;
  profiles?: Profile[];
  activeProfile?: Profile | null;
}

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: 'keyboard_shortcut', label: 'Keyboard Shortcut' },
  { value: 'hotkey_sequence', label: 'Hotkey Sequence' },
  { value: 'launch_app', label: 'Launch Application' },
  { value: 'system_command', label: 'System Command' },
  { value: 'http_request', label: 'HTTP Request' },
  { value: 'websocket_message', label: 'WebSocket Message' },
  { value: 'osc_message', label: 'OSC Message' },
  { value: 'plugin_action', label: 'Plugin Action' },
  { value: 'profile_switch', label: 'Switch Profile' },
  { value: 'layer_switch', label: 'Switch Layer' },
  { value: 'delay', label: 'Delay' },
  { value: 'multi_action', label: 'Multi-Action' },
  { value: 'play_audio', label: 'Play Audio' },
  { value: 'media_key', label: 'Media Key' },
  { value: 'open_folder', label: 'Open Folder (Layer)' },
];

const INPUT_EVENTS: { value: InputEvent; label: string }[] = [
  { value: 'press', label: 'Press' },
  { value: 'release', label: 'Release' },
  { value: 'hold', label: 'Hold' },
  { value: 'double_press', label: 'Double Press' },
  { value: 'triple_press', label: 'Triple Press' },
  { value: 'velocity', label: 'Velocity' },
  { value: 'aftertouch', label: 'Aftertouch' },
];

function colorToHex(color: PadColor): string {
  const r = Math.min(255, Math.max(0, color.r)).toString(16).padStart(2, '0');
  const g = Math.min(255, Math.max(0, color.g)).toString(16).padStart(2, '0');
  const b = Math.min(255, Math.max(0, color.b)).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function hexToColor(hex: string): PadColor {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function createDefaultAction(type: ActionType): Action {
  const base = { id: uuid(), type, label: '' };
  switch (type) {
    case 'keyboard_shortcut':
      return { ...base, type: 'keyboard_shortcut', keys: [] } as KeyboardShortcutAction;
    case 'hotkey_sequence':
      return { ...base, type: 'hotkey_sequence', sequence: [{ keys: [], delayMs: 100 }] } as HotkeySequenceAction;
    case 'launch_app':
      return { ...base, type: 'launch_app', path: '' } as LaunchAppAction;
    case 'system_command':
      return { ...base, type: 'system_command', command: '' } as SystemCommandAction;
    case 'http_request':
      return { ...base, type: 'http_request', method: 'GET', url: '' } as HttpRequestAction;
    case 'websocket_message':
      return { ...base, type: 'websocket_message', url: '', message: '' } as WebSocketMessageAction;
    case 'osc_message':
      return { ...base, type: 'osc_message', host: '127.0.0.1', port: 8000, address: '/', args: [] } as OscMessageAction;
    case 'plugin_action':
      return { ...base, type: 'plugin_action', pluginId: '', actionId: '' } as PluginActionDef;
    case 'profile_switch':
      return { ...base, type: 'profile_switch', profileId: '' } as ProfileSwitchAction;
    case 'layer_switch':
      return { ...base, type: 'layer_switch', layerId: '' } as LayerSwitchAction;
    case 'delay':
      return { ...base, type: 'delay', delayMs: 100 } as DelayAction;
    case 'play_audio':
      return { ...base, type: 'play_audio', filePath: '', volume: 1 } as PlayAudioAction;
    case 'media_key':
      return { ...base, type: 'media_key', key: 'play_pause' } as MediaKeyAction;
    case 'open_folder':
      return { ...base, type: 'open_folder', targetLayerId: '' } as OpenFolderAction;
    default:
      return { ...base, type: 'keyboard_shortcut', keys: [] } as KeyboardShortcutAction;
  }
}

export default function Sidebar({ selectedPad, onPadUpdate, onClose, profiles, activeProfile }: SidebarProps) {
  const [pad, setPad] = useState<PadConfig | null>(null);
  const [isRecordingHotkey, setIsRecordingHotkey] = useState<{ triggerIndex: number; actionIndex: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPad(selectedPad ? { ...selectedPad } : null);
  }, [selectedPad]);

  if (!pad) {
    return (
      <div className="sidebar sidebar-empty">
        <div className="sidebar-placeholder">
          <p>Select a pad to configure</p>
        </div>
      </div>
    );
  }

  const updateField = <K extends keyof PadConfig>(key: K, value: PadConfig[K]) => {
    const updated = { ...pad, [key]: value };
    setPad(updated);
    // Debounce IPC updates to avoid per-keystroke disk writes
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onPadUpdate(updated);
    }, 300);
  };

  const flushUpdate = () => {
    if (debounceRef.current && pad) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      onPadUpdate(pad);
    }
  };

  const updateLedColor = (which: 'ledDefault' | 'ledActive', color: string) => {
    const ledState: LedState = { ...pad[which], color: hexToColor(color) };
    updateField(which, ledState);
  };

  const updateLedBrightness = (which: 'ledDefault' | 'ledActive', brightness: number) => {
    const ledState: LedState = { ...pad[which], brightness };
    updateField(which, ledState);
  };

  const updateLedAnimation = (which: 'ledDefault' | 'ledActive', animation: string) => {
    const ledState: LedState = { ...pad[which], animation: animation as LedState['animation'] };
    updateField(which, ledState);
  };

  const addTrigger = (event: InputEvent) => {
    const trigger: PadTriggerConfig = { event, actions: [] };
    updateField('triggers', [...pad.triggers, trigger]);
  };

  const removeTrigger = (index: number) => {
    const triggers = [...pad.triggers];
    triggers.splice(index, 1);
    updateField('triggers', triggers);
  };

  const addActionToTrigger = (triggerIndex: number, type: ActionType) => {
    const triggers = [...pad.triggers];
    triggers[triggerIndex] = {
      ...triggers[triggerIndex],
      actions: [...triggers[triggerIndex].actions, createDefaultAction(type)],
    };
    updateField('triggers', triggers);
  };

  const removeActionFromTrigger = (triggerIndex: number, actionIndex: number) => {
    const triggers = [...pad.triggers];
    const actions = [...triggers[triggerIndex].actions];
    actions.splice(actionIndex, 1);
    triggers[triggerIndex] = { ...triggers[triggerIndex], actions };
    updateField('triggers', triggers);
  };

  const updateAction = (triggerIndex: number, actionIndex: number, updates: Partial<Action>) => {
    const triggers = [...pad.triggers];
    const actions = [...triggers[triggerIndex].actions];
    actions[actionIndex] = { ...actions[actionIndex], ...updates } as Action;
    triggers[triggerIndex] = { ...triggers[triggerIndex], actions };
    updateField('triggers', triggers);
  };

  const moveAction = (triggerIndex: number, actionIndex: number, direction: 'up' | 'down') => {
    const triggers = [...pad.triggers];
    const actions = [...triggers[triggerIndex].actions];
    const newIndex = direction === 'up' ? actionIndex - 1 : actionIndex + 1;
    if (newIndex < 0 || newIndex >= actions.length) return;
    [actions[actionIndex], actions[newIndex]] = [actions[newIndex], actions[actionIndex]];
    triggers[triggerIndex] = { ...triggers[triggerIndex], actions };
    updateField('triggers', triggers);
  };

  const duplicateAction = (triggerIndex: number, actionIndex: number) => {
    const triggers = [...pad.triggers];
    const original = triggers[triggerIndex].actions[actionIndex];
    const copy = { ...original, id: uuid() };
    const actions = [...triggers[triggerIndex].actions];
    actions.splice(actionIndex + 1, 0, copy);
    triggers[triggerIndex] = { ...triggers[triggerIndex], actions };
    updateField('triggers', triggers);
  };

  const startHotkeyRecording = async (triggerIndex: number, actionIndex: number) => {
    setIsRecordingHotkey({ triggerIndex, actionIndex });
    await api.hotkey.startRecording();
    const unsub = api.hotkey.onRecorded((keys: string[]) => {
      unsub();
      setIsRecordingHotkey(null);
      if (keys.length > 0) {
        updateAction(triggerIndex, actionIndex, { keys } as any);
      }
    });
  };

  const browseFile = async (triggerIndex: number, actionIndex: number, field: string, filters?: any[]) => {
    const filePath = await api.dialog.openFile({
      filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    if (filePath) {
      updateAction(triggerIndex, actionIndex, { [field]: filePath } as any);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>
          Pad {pad.row + 1}×{pad.col + 1}
          <span className="sidebar-note">Note {pad.midiNote}</span>
        </h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      <div className="sidebar-content">
        {/* Label */}
        <div className="field">
          <label className="field-label">Label</label>
          <input
            type="text"
            value={pad.label}
            onChange={(e) => updateField('label', e.target.value)}
            placeholder="Button name..."
          />
        </div>

        {/* Trigger Type */}
        <div className="field">
          <label className="field-label">Trigger Type</label>
          <div className="btn-group">
            {(['momentary', 'toggle', 'hold'] as TriggerType[]).map((t) => (
              <button
                key={t}
                className={`btn btn-sm ${pad.triggerType === t ? 'btn-accent' : 'btn-ghost'}`}
                onClick={() => updateField('triggerType', t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* LED Colors */}
        <div className="field-group">
          <div className="field">
            <label className="field-label">Default Color</label>
            <div className="color-row">
              <input
                type="color"
                value={colorToHex(pad.ledDefault.color)}
                onChange={(e) => updateLedColor('ledDefault', e.target.value)}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(pad.ledDefault.brightness * 100)}
                onChange={(e) => updateLedBrightness('ledDefault', parseInt(e.target.value) / 100)}
                title={`Brightness: ${Math.round(pad.ledDefault.brightness * 100)}%`}
              />
              <select
                value={pad.ledDefault.animation || 'none'}
                onChange={(e) => updateLedAnimation('ledDefault', e.target.value)}
              >
                <option value="none">None</option>
                <option value="pulse">Pulse</option>
                <option value="flash">Flash</option>
                <option value="rainbow">Rainbow</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Active Color</label>
            <div className="color-row">
              <input
                type="color"
                value={colorToHex(pad.ledActive.color)}
                onChange={(e) => updateLedColor('ledActive', e.target.value)}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(pad.ledActive.brightness * 100)}
                onChange={(e) => updateLedBrightness('ledActive', parseInt(e.target.value) / 100)}
                title={`Brightness: ${Math.round(pad.ledActive.brightness * 100)}%`}
              />
              <select
                value={pad.ledActive.animation || 'none'}
                onChange={(e) => updateLedAnimation('ledActive', e.target.value)}
              >
                <option value="none">None</option>
                <option value="pulse">Pulse</option>
                <option value="flash">Flash</option>
                <option value="rainbow">Rainbow</option>
              </select>
            </div>
          </div>
        </div>

        {/* Triggers & Actions */}
        <div className="field">
          <div className="field-header">
            <label className="field-label">Triggers & Actions</label>
            <select
              className="add-trigger-select"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  addTrigger(e.target.value as InputEvent);
                  e.target.value = '';
                }
              }}
            >
              <option value="">+ Add Trigger...</option>
              {INPUT_EVENTS.map((ie) => (
                <option key={ie.value} value={ie.value}>
                  {ie.label}
                </option>
              ))}
            </select>
          </div>

          {pad.triggers.map((trigger, tIdx) => (
            <div key={tIdx} className="trigger-block">
              <div className="trigger-header">
                <span className="trigger-event">{trigger.event.replace('_', ' ')}</span>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => removeTrigger(tIdx)}
                >
                  ✕
                </button>
              </div>

              {trigger.actions.map((action, aIdx) => (
                <div key={aIdx} className="action-block">
                  <div className="action-header">
                    <span className="action-type">{ACTION_TYPES.find((a) => a.value === action.type)?.label}</span>
                    <div className="action-controls">
                      <button className="btn btn-ghost btn-sm" onClick={() => moveAction(tIdx, aIdx, 'up')} disabled={aIdx === 0} title="Move up">↑</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => moveAction(tIdx, aIdx, 'down')} disabled={aIdx === trigger.actions.length - 1} title="Move down">↓</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => duplicateAction(tIdx, aIdx)} title="Duplicate">⧉</button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removeActionFromTrigger(tIdx, aIdx)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* ── Keyboard Shortcut ── */}
                  {action.type === 'keyboard_shortcut' && (
                    <div className="action-fields">
                      <input
                        type="text"
                        placeholder="e.g. ctrl+shift+a"
                        value={(action as any).keys?.join('+') || ''}
                        onChange={(e) =>
                          updateAction(tIdx, aIdx, {
                            keys: e.target.value.split('+').map((k: string) => k.trim()),
                          })
                        }
                        readOnly={isRecordingHotkey?.triggerIndex === tIdx && isRecordingHotkey?.actionIndex === aIdx}
                      />
                      <button
                        className={`btn btn-sm ${isRecordingHotkey?.triggerIndex === tIdx && isRecordingHotkey?.actionIndex === aIdx ? 'btn-accent' : 'btn-ghost'}`}
                        onClick={() => startHotkeyRecording(tIdx, aIdx)}
                      >
                        {isRecordingHotkey?.triggerIndex === tIdx && isRecordingHotkey?.actionIndex === aIdx ? '⏺ Recording...' : '⌨ Record'}
                      </button>
                    </div>
                  )}

                  {/* ── Hotkey Sequence ── */}
                  {action.type === 'hotkey_sequence' && (
                    <div className="action-fields-vertical">
                      {((action as HotkeySequenceAction).sequence || []).map((step, sIdx) => (
                        <div key={sIdx} className="action-fields">
                          <input
                            type="text"
                            placeholder="e.g. ctrl+c"
                            value={step.keys.join('+')}
                            onChange={(e) => {
                              const seq = [...(action as HotkeySequenceAction).sequence];
                              seq[sIdx] = { ...seq[sIdx], keys: e.target.value.split('+').map(k => k.trim()) };
                              updateAction(tIdx, aIdx, { sequence: seq } as any);
                            }}
                          />
                          <input
                            type="number"
                            placeholder="Delay"
                            value={step.delayMs}
                            onChange={(e) => {
                              const seq = [...(action as HotkeySequenceAction).sequence];
                              seq[sIdx] = { ...seq[sIdx], delayMs: parseInt(e.target.value) || 0 };
                              updateAction(tIdx, aIdx, { sequence: seq } as any);
                            }}
                            style={{ width: 70 }}
                          />
                          <span className="field-unit">ms</span>
                          <button className="btn btn-danger btn-sm" onClick={() => {
                            const seq = (action as HotkeySequenceAction).sequence.filter((_, i) => i !== sIdx);
                            updateAction(tIdx, aIdx, { sequence: seq } as any);
                          }}>✕</button>
                        </div>
                      ))}
                      <button className="btn btn-ghost btn-sm" onClick={() => {
                        const seq = [...((action as HotkeySequenceAction).sequence || []), { keys: [], delayMs: 100 }];
                        updateAction(tIdx, aIdx, { sequence: seq } as any);
                      }}>+ Add Step</button>
                    </div>
                  )}

                  {/* ── Launch App ── */}
                  {action.type === 'launch_app' && (
                    <div className="action-fields">
                      <input
                        type="text"
                        placeholder="Application path..."
                        value={(action as any).path || ''}
                        onChange={(e) => updateAction(tIdx, aIdx, { path: e.target.value } as any)}
                      />
                      <button className="btn btn-ghost btn-sm" onClick={() => browseFile(tIdx, aIdx, 'path', [
                        { name: 'Executables', extensions: ['exe', 'app', 'sh', 'bat', 'cmd'] },
                        { name: 'All Files', extensions: ['*'] },
                      ])}>Browse</button>
                    </div>
                  )}

                  {/* ── System Command ── */}
                  {action.type === 'system_command' && (
                    <input
                      type="text"
                      placeholder="Command..."
                      value={(action as any).command || ''}
                      onChange={(e) => updateAction(tIdx, aIdx, { command: e.target.value } as any)}
                    />
                  )}

                  {/* ── HTTP Request ── */}
                  {action.type === 'http_request' && (
                    <div className="action-fields-vertical">
                      <div className="action-fields">
                        <select
                          value={(action as any).method || 'GET'}
                          onChange={(e) => updateAction(tIdx, aIdx, { method: e.target.value } as any)}
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                          <option value="PATCH">PATCH</option>
                        </select>
                        <input
                          type="text"
                          placeholder="URL..."
                          value={(action as any).url || ''}
                          onChange={(e) => updateAction(tIdx, aIdx, { url: e.target.value } as any)}
                        />
                      </div>
                      <input
                        type="text"
                        placeholder='Body (JSON)...'
                        value={(action as any).body || ''}
                        onChange={(e) => updateAction(tIdx, aIdx, { body: e.target.value } as any)}
                      />
                    </div>
                  )}

                  {/* ── WebSocket Message ── */}
                  {action.type === 'websocket_message' && (
                    <div className="action-fields-vertical">
                      <input
                        type="text"
                        placeholder="ws://host:port"
                        value={(action as WebSocketMessageAction).url || ''}
                        onChange={(e) => updateAction(tIdx, aIdx, { url: e.target.value } as any)}
                      />
                      <input
                        type="text"
                        placeholder="Message payload..."
                        value={(action as WebSocketMessageAction).message || ''}
                        onChange={(e) => updateAction(tIdx, aIdx, { message: e.target.value } as any)}
                      />
                    </div>
                  )}

                  {/* ── OSC Message ── */}
                  {action.type === 'osc_message' && (
                    <div className="action-fields-vertical">
                      <div className="action-fields">
                        <input
                          type="text"
                          placeholder="Host"
                          value={(action as OscMessageAction).host || '127.0.0.1'}
                          onChange={(e) => updateAction(tIdx, aIdx, { host: e.target.value } as any)}
                          style={{ flex: 2 }}
                        />
                        <input
                          type="number"
                          placeholder="Port"
                          value={(action as OscMessageAction).port || 8000}
                          onChange={(e) => updateAction(tIdx, aIdx, { port: parseInt(e.target.value) || 8000 } as any)}
                          style={{ width: 80 }}
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="/osc/address"
                        value={(action as OscMessageAction).address || ''}
                        onChange={(e) => updateAction(tIdx, aIdx, { address: e.target.value } as any)}
                      />
                    </div>
                  )}

                  {/* ── Plugin Action ── */}
                  {action.type === 'plugin_action' && (
                    <div className="action-fields-vertical">
                      <input
                        type="text"
                        placeholder="Plugin ID..."
                        value={(action as PluginActionDef).pluginId || ''}
                        onChange={(e) => updateAction(tIdx, aIdx, { pluginId: e.target.value } as any)}
                      />
                      <input
                        type="text"
                        placeholder="Action ID..."
                        value={(action as PluginActionDef).actionId || ''}
                        onChange={(e) => updateAction(tIdx, aIdx, { actionId: e.target.value } as any)}
                      />
                    </div>
                  )}

                  {/* ── Profile Switch ── */}
                  {action.type === 'profile_switch' && (
                    <select
                      value={(action as ProfileSwitchAction).profileId || ''}
                      onChange={(e) => updateAction(tIdx, aIdx, { profileId: e.target.value } as any)}
                    >
                      <option value="">Select profile...</option>
                      {(profiles || []).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}

                  {/* ── Layer Switch ── */}
                  {action.type === 'layer_switch' && (
                    <select
                      value={(action as LayerSwitchAction).layerId || ''}
                      onChange={(e) => updateAction(tIdx, aIdx, { layerId: e.target.value } as any)}
                    >
                      <option value="">Select layer...</option>
                      {(activeProfile?.layers || []).map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  )}

                  {/* ── Delay ── */}
                  {action.type === 'delay' && (
                    <div className="action-fields">
                      <input
                        type="number"
                        placeholder="Delay (ms)"
                        value={(action as any).delayMs || 100}
                        onChange={(e) =>
                          updateAction(tIdx, aIdx, { delayMs: parseInt(e.target.value) || 0 } as any)
                        }
                      />
                      <span className="field-unit">ms</span>
                    </div>
                  )}

                  {/* ── Play Audio ── */}
                  {action.type === 'play_audio' && (
                    <div className="action-fields-vertical">
                      <div className="action-fields">
                        <input
                          type="text"
                          placeholder="Audio file path..."
                          value={(action as PlayAudioAction).filePath || ''}
                          onChange={(e) => updateAction(tIdx, aIdx, { filePath: e.target.value } as any)}
                        />
                        <button className="btn btn-ghost btn-sm" onClick={() => browseFile(tIdx, aIdx, 'filePath', [
                          { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'] },
                          { name: 'All Files', extensions: ['*'] },
                        ])}>Browse</button>
                      </div>
                      <div className="action-fields">
                        <label className="field-label" style={{ minWidth: 'auto', fontSize: 11 }}>Vol</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(((action as PlayAudioAction).volume || 1) * 100)}
                          onChange={(e) => updateAction(tIdx, aIdx, { volume: parseInt(e.target.value) / 100 } as any)}
                          title={`Volume: ${Math.round(((action as PlayAudioAction).volume || 1) * 100)}%`}
                        />
                        <span className="field-unit">{Math.round(((action as PlayAudioAction).volume || 1) * 100)}%</span>
                      </div>
                    </div>
                  )}

                  {/* ── Media Key ── */}
                  {action.type === 'media_key' && (
                    <select
                      value={(action as MediaKeyAction).key || 'play_pause'}
                      onChange={(e) => updateAction(tIdx, aIdx, { key: e.target.value } as any)}
                    >
                      <option value="play_pause">Play / Pause</option>
                      <option value="next_track">Next Track</option>
                      <option value="prev_track">Previous Track</option>
                      <option value="stop">Stop</option>
                      <option value="volume_up">Volume Up</option>
                      <option value="volume_down">Volume Down</option>
                      <option value="mute">Mute</option>
                    </select>
                  )}

                  {/* ── Open Folder (Layer Nav) ── */}
                  {action.type === 'open_folder' && (
                    <select
                      value={(action as OpenFolderAction).targetLayerId || ''}
                      onChange={(e) => updateAction(tIdx, aIdx, { targetLayerId: e.target.value } as any)}
                    >
                      <option value="">Select target layer...</option>
                      {(activeProfile?.layers || []).map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}

              <select
                className="add-action-select"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    addActionToTrigger(tIdx, e.target.value as ActionType);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">+ Add Action...</option>
                {ACTION_TYPES.map((at) => (
                  <option key={at.value} value={at.value}>
                    {at.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Enable/Disable */}
        <div className="field">
          <label className="field-label-inline">
            <input
              type="checkbox"
              checked={pad.enabled}
              onChange={(e) => updateField('enabled', e.target.checked)}
            />
            <span>Pad enabled</span>
          </label>
        </div>
      </div>
    </div>
  );
}
