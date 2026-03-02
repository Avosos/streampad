import React, { useState, useEffect } from 'react';
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
  LaunchAppAction,
  SystemCommandAction,
  HttpRequestAction,
  ProfileSwitchAction,
  LayerSwitchAction,
  DelayAction,
} from '../../shared/types';
import { v4 as uuid } from 'uuid';
import '../styles/sidebar.css';

interface SidebarProps {
  selectedPad: PadConfig | null;
  onPadUpdate: (pad: PadConfig) => void;
  onClose: () => void;
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
    case 'launch_app':
      return { ...base, type: 'launch_app', path: '' } as LaunchAppAction;
    case 'system_command':
      return { ...base, type: 'system_command', command: '' } as SystemCommandAction;
    case 'http_request':
      return { ...base, type: 'http_request', method: 'GET', url: '' } as HttpRequestAction;
    case 'profile_switch':
      return { ...base, type: 'profile_switch', profileId: '' } as ProfileSwitchAction;
    case 'layer_switch':
      return { ...base, type: 'layer_switch', layerId: '' } as LayerSwitchAction;
    case 'delay':
      return { ...base, type: 'delay', delayMs: 100 } as DelayAction;
    default:
      return { ...base, type: 'keyboard_shortcut', keys: [] } as KeyboardShortcutAction;
  }
}

export default function Sidebar({ selectedPad, onPadUpdate, onClose }: SidebarProps) {
  const [pad, setPad] = useState<PadConfig | null>(null);

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
    onPadUpdate(updated);
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
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removeActionFromTrigger(tIdx, aIdx)}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Action-specific editor */}
                  {action.type === 'keyboard_shortcut' && (
                    <input
                      type="text"
                      placeholder="e.g. ctrl+shift+a"
                      value={(action as any).keys?.join('+') || ''}
                      onChange={(e) =>
                        updateAction(tIdx, aIdx, {
                          keys: e.target.value.split('+').map((k: string) => k.trim()),
                        })
                      }
                    />
                  )}

                  {action.type === 'launch_app' && (
                    <input
                      type="text"
                      placeholder="Application path..."
                      value={(action as any).path || ''}
                      onChange={(e) => updateAction(tIdx, aIdx, { path: e.target.value } as any)}
                    />
                  )}

                  {action.type === 'system_command' && (
                    <input
                      type="text"
                      placeholder="Command..."
                      value={(action as any).command || ''}
                      onChange={(e) => updateAction(tIdx, aIdx, { command: e.target.value } as any)}
                    />
                  )}

                  {action.type === 'http_request' && (
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
                  )}

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
