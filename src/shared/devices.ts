import { DeviceDescriptor, LaunchpadModel } from './types';

/**
 * Novation Launchpad Pro MK2 – 8×8 grid
 * Notes 36-99 in Programmer mode (row-major, bottom-left = 36)
 * SysEx: F0 00 20 29 02 10 ... F7
 */
function buildProMk2NoteMap(): number[][] {
  const map: number[][] = [];
  for (let row = 0; row < 8; row++) {
    map[row] = [];
    for (let col = 0; col < 8; col++) {
      // Programmer mode: note = (7 - row) * 10 + col + 11
      // Row 0 (top) = notes 81-88, Row 7 (bottom) = notes 11-18
      map[row][col] = (7 - row) * 10 + col + 11;
    }
  }
  return map;
}

function buildProMk3NoteMap(): number[][] {
  const map: number[][] = [];
  for (let row = 0; row < 8; row++) {
    map[row] = [];
    for (let col = 0; col < 8; col++) {
      map[row][col] = (7 - row) * 10 + col + 11;
    }
  }
  return map;
}

function buildLaunchpadXNoteMap(): number[][] {
  const map: number[][] = [];
  for (let row = 0; row < 8; row++) {
    map[row] = [];
    for (let col = 0; col < 8; col++) {
      map[row][col] = (7 - row) * 10 + col + 11;
    }
  }
  return map;
}

export const DEVICE_DESCRIPTORS: Record<LaunchpadModel, DeviceDescriptor> = {
  launchpad_pro_mk2: {
    model: 'launchpad_pro_mk2',
    name: 'Launchpad Pro MK2',
    gridRows: 8,
    gridCols: 8,
    hasVelocity: true,
    hasAftertouch: true,
    hasPressure: true,
    noteMap: buildProMk2NoteMap(),
    ccMap: [91, 92, 93, 94, 95, 96, 97, 98], // top row CCs
    sysexHeader: [0x00, 0x20, 0x29, 0x02, 0x10],
  },

  launchpad_pro_mk3: {
    model: 'launchpad_pro_mk3',
    name: 'Launchpad Pro MK3',
    gridRows: 8,
    gridCols: 8,
    hasVelocity: true,
    hasAftertouch: true,
    hasPressure: true,
    noteMap: buildProMk3NoteMap(),
    ccMap: [91, 92, 93, 94, 95, 96, 97, 98],
    sysexHeader: [0x00, 0x20, 0x29, 0x02, 0x0E],
  },

  launchpad_x: {
    model: 'launchpad_x',
    name: 'Launchpad X',
    gridRows: 8,
    gridCols: 8,
    hasVelocity: true,
    hasAftertouch: false,
    hasPressure: true,
    noteMap: buildLaunchpadXNoteMap(),
    ccMap: [91, 92, 93, 94, 95, 96, 97, 98],
    sysexHeader: [0x00, 0x20, 0x29, 0x02, 0x0C],
  },

  launchpad_mini_mk3: {
    model: 'launchpad_mini_mk3',
    name: 'Launchpad Mini MK3',
    gridRows: 8,
    gridCols: 8,
    hasVelocity: false,
    hasAftertouch: false,
    hasPressure: false,
    noteMap: buildLaunchpadXNoteMap(), // same layout
    sysexHeader: [0x00, 0x20, 0x29, 0x02, 0x0D],
  },

  launchpad_mk2: {
    model: 'launchpad_mk2',
    name: 'Launchpad MK2',
    gridRows: 8,
    gridCols: 8,
    hasVelocity: false,
    hasAftertouch: false,
    hasPressure: false,
    noteMap: buildLaunchpadXNoteMap(),
    sysexHeader: [0x00, 0x20, 0x29, 0x02, 0x18],
  },

  unknown: {
    model: 'unknown',
    name: 'Unknown Launchpad',
    gridRows: 8,
    gridCols: 8,
    hasVelocity: false,
    hasAftertouch: false,
    hasPressure: false,
    noteMap: buildLaunchpadXNoteMap(),
    sysexHeader: [],
  },
};

/**
 * Detect Launchpad model from MIDI device name string.
 * Windows may wrap the name in "MIDIINx (...)" or append a number,
 * so we strip those before matching.
 */
export function detectModel(deviceName: string): LaunchpadModel {
  let name = deviceName.toLowerCase();

  // Strip Windows "MIDIINx (...)" / "MIDIOUTx (...)" wrapper
  const wrapped = name.match(/^midi(?:in|out)\d*\s*\((.+)\)$/);
  if (wrapped) name = wrapped[1].trim();

  // Strip trailing Windows port numbers, e.g. "launchpad pro 2" → "launchpad pro"
  name = name.replace(/\s+\d+$/, '');

  if (name.includes('launchpad pro') && name.includes('mk3')) return 'launchpad_pro_mk3';
  if (name.includes('launchpad pro')) return 'launchpad_pro_mk2';
  if (name.includes('launchpad x')) return 'launchpad_x';
  if (name.includes('launchpad mini') && name.includes('mk3')) return 'launchpad_mini_mk3';
  if (name.includes('launchpad') && name.includes('mk2')) return 'launchpad_mk2';
  if (name.includes('launchpad')) return 'unknown';
  return 'unknown';
}

/**
 * Convert a MIDI note number to grid position for a given device.
 */
export function noteToGrid(
  descriptor: DeviceDescriptor,
  note: number
): { row: number; col: number } | null {
  for (let row = 0; row < descriptor.gridRows; row++) {
    for (let col = 0; col < descriptor.gridCols; col++) {
      if (descriptor.noteMap[row][col] === note) {
        return { row, col };
      }
    }
  }
  return null;
}

/**
 * Convert grid position to MIDI note number.
 */
export function gridToNote(
  descriptor: DeviceDescriptor,
  row: number,
  col: number
): number | null {
  if (row < 0 || row >= descriptor.gridRows || col < 0 || col >= descriptor.gridCols) {
    return null;
  }
  return descriptor.noteMap[row][col];
}
