import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Profile, Layer, PadConfig, LedState, PadShape } from '../../shared/types';
import { padShapeAt, PRO_MK2_BUTTON_LABELS } from '../../shared/devices';
import { v4 as uuid } from 'uuid';

const DEFAULT_LED: LedState = {
  color: { r: 0, g: 0, b: 40 },
  brightness: 0.5,
  animation: 'none',
};

const ACTIVE_LED: LedState = {
  color: { r: 0, g: 200, b: 100 },
  brightness: 1.0,
  animation: 'none',
};

/**
 * ProfileManager – handles loading, saving, creating, and switching profiles.
 * Profiles are stored as JSON files in the user data directory.
 */
export class ProfileManager extends EventEmitter {
  private profiles: Map<string, Profile> = new Map();
  private activeProfileId: string | null = null;
  private profileDir: string;

  constructor() {
    super();
    this.profileDir = path.join(app.getPath('userData'), 'profiles');
    this.ensureDir(this.profileDir);
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Load all profiles from disk.
   */
  async loadAll(): Promise<Profile[]> {
    const files = fs.readdirSync(this.profileDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.profileDir, file), 'utf-8');
        const profile: Profile = JSON.parse(content);
        const migrated = this.migrateProfile(profile);
        this.profiles.set(migrated.id, migrated);
        if (migrated !== profile) {
          this.saveProfile(migrated);
          console.log(`[ProfileManager] Migrated profile "${migrated.name}" to 10×10 layout`);
        }
      } catch (err) {
        console.error(`[ProfileManager] Failed to load profile ${file}:`, err);
      }
    }

    // Create default profile if none exist
    if (this.profiles.size === 0) {
      const defaultProfile = this.createDefaultProfile();
      this.profiles.set(defaultProfile.id, defaultProfile);
      this.saveProfile(defaultProfile);
    }

    // Activate first profile
    if (!this.activeProfileId) {
      const first = Array.from(this.profiles.values())[0];
      if (first) {
        this.activeProfileId = first.id;
      }
    }

    return this.getAll();
  }

  /**
   * Create a new empty profile.
   */
  createProfile(name: string, description?: string): Profile {
    const profile: Profile = {
      id: uuid(),
      name,
      description,
      layers: [this.createDefaultLayer()],
      activeLayerId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    profile.activeLayerId = profile.layers[0].id;
    this.profiles.set(profile.id, profile);
    this.saveProfile(profile);
    this.emit('profile:created', profile);
    return profile;
  }

  /**
   * Update an existing profile.
   */
  updateProfile(profile: Profile): void {
    profile.updatedAt = new Date().toISOString();
    this.profiles.set(profile.id, profile);
    this.saveProfile(profile);
    this.emit('profile:updated', profile);
  }

  /**
   * Delete a profile.
   */
  deleteProfile(id: string): boolean {
    const profile = this.profiles.get(id);
    if (!profile) return false;

    this.profiles.delete(id);
    const filePath = path.join(this.profileDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (this.activeProfileId === id) {
      const next = Array.from(this.profiles.values())[0];
      this.activeProfileId = next?.id || null;
    }

    this.emit('profile:deleted', id);
    return true;
  }

  /**
   * Set the active profile.
   */
  activateProfile(id: string): Profile | null {
    const profile = this.profiles.get(id);
    if (!profile) return null;

    this.activeProfileId = id;
    this.emit('profile:activated', profile);
    return profile;
  }

  getActiveProfile(): Profile | null {
    if (!this.activeProfileId) return null;
    return this.profiles.get(this.activeProfileId) || null;
  }

  getProfile(id: string): Profile | undefined {
    return this.profiles.get(id);
  }

  getAll(): Profile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get the active layer of the active profile.
   */
  getActiveLayer(): Layer | null {
    const profile = this.getActiveProfile();
    if (!profile) return null;
    return profile.layers.find((l) => l.id === profile.activeLayerId) || profile.layers[0] || null;
  }

  /**
   * Switch active layer within the active profile.
   */
  switchLayer(layerId: string): Layer | null {
    const profile = this.getActiveProfile();
    if (!profile) return null;

    const layer = profile.layers.find((l) => l.id === layerId);
    if (!layer) return null;

    profile.activeLayerId = layerId;
    this.updateProfile(profile);
    this.emit('layer:switched', layer);
    return layer;
  }

  /**
   * Add a new layer to the active profile.
   */
  addLayer(name: string): Layer | null {
    const profile = this.getActiveProfile();
    if (!profile) return null;

    const layer = this.createDefaultLayer(name);
    profile.layers.push(layer);
    this.updateProfile(profile);
    this.emit('layer:created', layer);
    return layer;
  }

  /**
   * Delete a layer from the active profile.
   */
  deleteLayer(layerId: string): boolean {
    const profile = this.getActiveProfile();
    if (!profile) return false;
    if (profile.layers.length <= 1) return false; // keep at least one

    profile.layers = profile.layers.filter((l) => l.id !== layerId);
    if (profile.activeLayerId === layerId) {
      profile.activeLayerId = profile.layers[0].id;
    }
    this.updateProfile(profile);
    this.emit('layer:deleted', layerId);
    return true;
  }

  /**
   * Update a specific pad in the active layer.
   */
  updatePad(padConfig: PadConfig): void {
    const layer = this.getActiveLayer();
    if (!layer) return;

    const idx = layer.pads.findIndex((p) => p.id === padConfig.id);
    if (idx >= 0) {
      layer.pads[idx] = padConfig;
    } else {
      layer.pads.push(padConfig);
    }

    const profile = this.getActiveProfile();
    if (profile) {
      this.updateProfile(profile);
    }
    this.emit('pad:updated', padConfig);
  }

  /**
   * Export a profile as a JSON string.
   */
  exportProfile(id: string): string | null {
    const profile = this.profiles.get(id);
    if (!profile) return null;
    return JSON.stringify(profile, null, 2);
  }

  /**
   * Import a profile from a JSON string.
   */
  importProfile(json: string): Profile | null {
    try {
      const profile: Profile = JSON.parse(json);
      profile.id = uuid(); // assign new ID
      profile.createdAt = new Date().toISOString();
      profile.updatedAt = new Date().toISOString();
      this.profiles.set(profile.id, profile);
      this.saveProfile(profile);
      this.emit('profile:created', profile);
      return profile;
    } catch (err) {
      console.error('[ProfileManager] Import failed:', err);
      return null;
    }
  }

  private saveProfile(profile: Profile): void {
    const filePath = path.join(this.profileDir, `${profile.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf-8');
  }

  /**
   * Migrate an old 8×8 profile to the new 10×10 layout.
   * Old profiles have pads with rows 0-7 / cols 0-7 and no padShape field.
   * We remap them:  old (row, col) → new (row+1, col+1)  to fit inside
   * the main 8×8 region of the 10×10 grid, then add missing side buttons.
   */
  private migrateProfile(profile: Profile): Profile {
    let migrated = false;

    for (const layer of profile.layers) {
      // Detect old format: any pad with row < 10 that has no padShape AND
      // no pads with row 0 col 0 being a side button (i.e., max row is 7)
      const maxRow = Math.max(...layer.pads.map(p => p.row));
      const maxCol = Math.max(...layer.pads.map(p => p.col));
      const hasPadShape = layer.pads.some(p => p.padShape !== undefined);

      if (maxRow <= 7 && maxCol <= 7 && !hasPadShape) {
        // Remap: shift existing pads into the inner 8×8 region (rows 1-8, cols 1-8)
        for (const pad of layer.pads) {
          pad.row += 1;
          pad.col += 1;
          pad.padShape = 'square';
        }

        // Create a lookup of which positions already have pads
        const existing = new Set(layer.pads.map(p => `${p.row}:${p.col}`));

        // Add missing side / top / bottom round buttons
        for (let row = 0; row < 10; row++) {
          for (let col = 0; col < 10; col++) {
            const shape = padShapeAt(row, col);
            if (!shape || shape !== 'round') continue;
            if (existing.has(`${row}:${col}`)) continue;

            let note: number;
            if (row === 0) note = 90 + col;
            else if (row === 9) note = col;
            else {
              const launchpadRow = 9 - row;
              note = launchpadRow * 10 + col;
            }

            const defaultLabel = PRO_MK2_BUTTON_LABELS[note] || '';

            layer.pads.push({
              id: uuid(),
              row,
              col,
              midiNote: note,
              label: defaultLabel,
              padShape: 'round',
              triggerType: 'momentary',
              triggers: [],
              ledDefault: { ...DEFAULT_LED },
              ledActive: { ...ACTIVE_LED },
              enabled: true,
            });
          }
        }

        migrated = true;
      }
    }

    return migrated ? { ...profile, updatedAt: new Date().toISOString() } : profile;
  }

  private createDefaultProfile(): Profile {
    const layer = this.createDefaultLayer();
    return {
      id: uuid(),
      name: 'Default',
      description: 'Default profile',
      layers: [layer],
      activeLayerId: layer.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private createDefaultLayer(name = 'Layer 1'): Layer {
    const pads: PadConfig[] = [];

    /**
     * Build a full 10×10 grid matching the Launchpad Pro MK2 programmer-mode layout.
     * Row 0 = top round buttons (notes 91-98, corner cols 0 & 9 empty)
     * Rows 1-8 = left-round + 8 main pads + right-round  (note = launchpadRow*10+col)
     * Row 9 = bottom round buttons (notes 1-8, corner cols 0 & 9 empty)
     */
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const shape = padShapeAt(row, col);
        if (!shape) continue; // skip corners

        let note: number;
        if (row === 0) {
          note = 90 + col; // 91-98
        } else if (row === 9) {
          note = col;       // 1-8
        } else {
          const launchpadRow = 9 - row;
          note = launchpadRow * 10 + col;
        }

        const defaultLabel = PRO_MK2_BUTTON_LABELS[note] || '';

        pads.push({
          id: uuid(),
          row,
          col,
          midiNote: note,
          label: shape === 'round' ? defaultLabel : '',
          padShape: shape,
          triggerType: 'momentary',
          triggers: [],
          ledDefault: { ...DEFAULT_LED },
          ledActive: { ...ACTIVE_LED },
          enabled: true,
        });
      }
    }

    return {
      id: uuid(),
      name,
      pads,
      isDefault: true,
    };
  }
}
