import { DeviceDescriptor, LaunchpadModel, PadShape } from './types';

/**
 * ── Note layout for Launchpad Pro MK2 in Programmer mode ──
 * Full 10×10 grid (side / top / bottom round buttons included).
 *
 *              [91] [92] [93] [94] [95] [96] [97] [98]        ← top row (notes)
 *  [80] │ [81] [82] [83] [84] [85] [86] [87] [88] │ [89]     ← main row 8
 *  [70] │ [71] [72] [73] [74] [75] [76] [77] [78] │ [79]
 *  [60] │ [61] [62] [63] [64] [65] [66] [67] [68] │ [69]
 *  [50] │ [51] [52] [53] [54] [55] [56] [57] [58] │ [59]
 *  [40] │ [41] [42] [43] [44] [45] [46] [47] [48] │ [49]
 *  [30] │ [31] [32] [33] [34] [35] [36] [37] [38] │ [39]
 *  [20] │ [21] [22] [23] [24] [25] [26] [27] [28] │ [29]
 *  [10] │ [11] [12] [13] [14] [15] [16] [17] [18] │ [19]     ← main row 1
 *              [ 1] [ 2] [ 3] [ 4] [ 5] [ 6] [ 7] [ 8]      ← bottom row (notes)
 *
 * Grid coordinate mapping (display top-to-bottom):
 *   row 0 = top round  (notes 91-98, corners empty)
 *   rows 1-8 = main rows (left round + 8 pads + right round)
 *   row 9 = bottom round (notes 1-8, corners empty)
 *
 * Corners (row 0 col 0, row 0 col 9, row 9 col 0, row 9 col 9) = -1 (empty)
 */
function buildFullNoteMap(): number[][] {
  const map: number[][] = [];

  // Row 0: top round buttons (notes 91-98), corners empty
  map[0] = [-1, 91, 92, 93, 94, 95, 96, 97, 98, -1];

  // Rows 1-8: left-round + 8 main pads + right-round
  for (let displayRow = 1; displayRow <= 8; displayRow++) {
    const launchpadRow = 9 - displayRow; // row 1 (display) = launchpad row 8 (notes 8x)
    map[displayRow] = [];
    for (let col = 0; col < 10; col++) {
      map[displayRow][col] = launchpadRow * 10 + col;
    }
  }

  // Row 9: bottom round buttons (notes 1-8), corners empty
  map[9] = [-1, 1, 2, 3, 4, 5, 6, 7, 8, -1];

  return map;
}

/**
 * Determine the visual shape of a pad at given grid position.
 * Corners are empty (-1), border pads are round, inner 8×8 are square.
 */
export function padShapeAt(row: number, col: number): PadShape | null {
  // Corners
  if ((row === 0 || row === 9) && (col === 0 || col === 9)) return null;
  // Top / bottom rows
  if (row === 0 || row === 9) return 'round';
  // Left / right columns
  if (col === 0 || col === 9) return 'round';
  // Main grid
  return 'square';
}

/**
 * Labels for the round side/top/bottom buttons on the Launchpad Pro MK2.
 */
export const PRO_MK2_BUTTON_LABELS: Record<number, string> = {
  // Top row
  91: 'Up', 92: 'Down', 93: 'Left', 94: 'Right',
  95: 'Session', 96: 'User 1', 97: 'User 2', 98: 'Mixer',
  // Right column (top→bottom)
  89: 'Record Arm', 79: 'Track Select', 69: 'Mute', 59: 'Solo',
  49: 'Volume', 39: 'Pan', 29: 'Sends', 19: 'Stop Clip',
  // Left column (top→bottom)
  80: 'Shift', 70: 'Click', 60: 'Undo', 50: 'Delete',
  40: 'Quantise', 30: 'Duplicate', 20: 'Double', 10: 'Record',
  // Bottom row
  1: '▲', 2: '▼', 3: '◀', 4: '▶',
  5: 'Note', 6: 'Device', 7: 'User', 8: 'Setup',
};

const FULL_NOTE_MAP = buildFullNoteMap();

export const DEVICE_DESCRIPTORS: Record<LaunchpadModel, DeviceDescriptor> = {
  launchpad_pro_mk2: {
    model: 'launchpad_pro_mk2',
    name: 'Launchpad Pro MK2',
    gridRows: 10,
    gridCols: 10,
    hasVelocity: true,
    hasAftertouch: true,
    hasPressure: true,
    noteMap: FULL_NOTE_MAP,
    sysexHeader: [0x00, 0x20, 0x29, 0x02, 0x10],
  },

  launchpad_pro_mk3: {
    model: 'launchpad_pro_mk3',
    name: 'Launchpad Pro MK3',
    gridRows: 10,
    gridCols: 10,
    hasVelocity: true,
    hasAftertouch: true,
    hasPressure: true,
    noteMap: FULL_NOTE_MAP,
    sysexHeader: [0x00, 0x20, 0x29, 0x02, 0x0E],
  },

  launchpad_x: {
    model: 'launchpad_x',
    name: 'Launchpad X',
    gridRows: 10,
    gridCols: 10,
    hasVelocity: true,
    hasAftertouch: false,
    hasPressure: true,
    noteMap: FULL_NOTE_MAP,
    sysexHeader: [0x00, 0x20, 0x29, 0x02, 0x0C],
  },

  launchpad_mini_mk3: {
    model: 'launchpad_mini_mk3',
    name: 'Launchpad Mini MK3',
    gridRows: 10,
    gridCols: 10,
    hasVelocity: false,
    hasAftertouch: false,
    hasPressure: false,
    noteMap: FULL_NOTE_MAP,
    sysexHeader: [0x00, 0x20, 0x29, 0x02, 0x0D],
  },

  launchpad_mk2: {
    model: 'launchpad_mk2',
    name: 'Launchpad MK2',
    gridRows: 10,
    gridCols: 10,
    hasVelocity: false,
    hasAftertouch: false,
    hasPressure: false,
    noteMap: FULL_NOTE_MAP,
    sysexHeader: [0x00, 0x20, 0x29, 0x02, 0x18],
  },

  unknown: {
    model: 'unknown',
    name: 'Unknown Launchpad',
    gridRows: 10,
    gridCols: 10,
    hasVelocity: false,
    hasAftertouch: false,
    hasPressure: false,
    noteMap: FULL_NOTE_MAP,
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
 * Returns null for empty corners (-1) or out-of-range positions.
 */
export function gridToNote(
  descriptor: DeviceDescriptor,
  row: number,
  col: number
): number | null {
  if (row < 0 || row >= descriptor.gridRows || col < 0 || col >= descriptor.gridCols) {
    return null;
  }
  const note = descriptor.noteMap[row][col];
  return note >= 0 ? note : null;
}
