import React from 'react';
import { MidiDeviceInfo } from '../../shared/types';
import { useLanguage } from '../hooks/useLanguage';
import '../styles/devicebar.css';

interface DeviceBarProps {
  devices: MidiDeviceInfo[];
}

export default function DeviceBar({ devices }: DeviceBarProps) {
  const { t } = useLanguage();
  const connected = devices.filter((d) => d.isConnected);

  return (
    <div className="device-bar">
      <span className="device-bar-label">{t.deviceBar.devices}</span>
      {connected.length === 0 ? (
        <span className="device-bar-none">{t.deviceBar.noLaunchpad}</span>
      ) : (
        connected.map((device) => (
          <div key={device.id} className="device-chip">
            <span className="device-chip-dot" />
            <span className="device-chip-name">{device.name}</span>
            <span className="device-chip-info">
              {device.isInput && device.isOutput ? t.deviceBar.io : device.isInput ? t.deviceBar.input : t.deviceBar.output}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
