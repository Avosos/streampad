import React from 'react';
import { MidiDeviceInfo } from '../../shared/types';
import '../styles/devicebar.css';

interface DeviceBarProps {
  devices: MidiDeviceInfo[];
}

export default function DeviceBar({ devices }: DeviceBarProps) {
  const connected = devices.filter((d) => d.isConnected);

  return (
    <div className="device-bar">
      <span className="device-bar-label">Devices:</span>
      {connected.length === 0 ? (
        <span className="device-bar-none">No Launchpad connected</span>
      ) : (
        connected.map((device) => (
          <div key={device.id} className="device-chip">
            <span className="device-chip-dot" />
            <span className="device-chip-name">{device.name}</span>
            <span className="device-chip-info">
              {device.isInput && device.isOutput ? 'I/O' : device.isInput ? 'IN' : 'OUT'}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
