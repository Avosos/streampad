import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { AppSettings, DEFAULT_SETTINGS } from '../../shared/types';

/**
 * SettingsManager – persists app settings to a JSON file
 * in the user's app data folder.
 */
export class SettingsManager {
  private settings: AppSettings;
  private filePath: string;

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'settings.json');
    this.settings = { ...DEFAULT_SETTINGS };
  }

  load(): AppSettings {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (err) {
      console.error('[SettingsManager] Failed to load settings:', err);
      this.settings = { ...DEFAULT_SETTINGS };
    }
    return this.settings;
  }

  save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (err) {
      console.error('[SettingsManager] Failed to save settings:', err);
    }
  }

  get(): AppSettings {
    return { ...this.settings };
  }

  set(updates: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...updates };
    this.save();
    return this.settings;
  }

  getField<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.settings[key];
  }
}
