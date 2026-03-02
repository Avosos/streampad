import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Profile, Layer, PadConfig, LedState } from '../../shared/types';
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
        this.profiles.set(profile.id, profile);
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

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const note = (7 - row) * 10 + col + 11;
        pads.push({
          id: uuid(),
          row,
          col,
          midiNote: note,
          label: '',
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
