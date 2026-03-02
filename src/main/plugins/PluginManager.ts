import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { PluginManifest } from '../../shared/types';

export interface PluginInstance {
  manifest: PluginManifest;
  module: any;
  isLoaded: boolean;
}

/**
 * PluginManager – loads, manages, and executes plugins.
 * Plugins are folders in the plugins directory containing a manifest.json
 * and a main JS/TS file.
 */
export class PluginManager extends EventEmitter {
  private plugins: Map<string, PluginInstance> = new Map();
  private pluginDir: string;

  constructor() {
    super();
    this.pluginDir = path.join(app.getPath('userData'), 'plugins');
    this.ensureDir(this.pluginDir);
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Discover and load all plugins.
   */
  async loadAll(): Promise<PluginManifest[]> {
    const entries = fs.readdirSync(this.pluginDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const manifestPath = path.join(this.pluginDir, entry.name, 'manifest.json');
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const manifest: PluginManifest = JSON.parse(
          fs.readFileSync(manifestPath, 'utf-8')
        );

        const mainPath = path.join(this.pluginDir, entry.name, manifest.main);
        let module = null;

        if (fs.existsSync(mainPath)) {
          module = require(mainPath);
          if (typeof module.initialize === 'function') {
            await module.initialize();
          }
        }

        this.plugins.set(manifest.id, {
          manifest,
          module,
          isLoaded: !!module,
        });

        console.log(`[PluginManager] Loaded plugin: ${manifest.name} v${manifest.version}`);
      } catch (err) {
        console.error(`[PluginManager] Failed to load plugin ${entry.name}:`, err);
      }
    }

    return this.getManifests();
  }

  /**
   * Execute a plugin action.
   */
  async executeAction(
    pluginId: string,
    actionId: string,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.isLoaded) {
      throw new Error(`Plugin ${pluginId} not found or not loaded`);
    }

    const actionDef = plugin.manifest.actions.find((a) => a.id === actionId);
    if (!actionDef) {
      throw new Error(`Action ${actionId} not found in plugin ${pluginId}`);
    }

    if (typeof plugin.module.executeAction === 'function') {
      return await plugin.module.executeAction(actionId, params);
    }

    // Try calling the action as a named function
    if (typeof plugin.module[actionId] === 'function') {
      return await plugin.module[actionId](params);
    }

    throw new Error(`Cannot execute action ${actionId}: no handler found`);
  }

  /**
   * Get all loaded plugin manifests.
   */
  getManifests(): PluginManifest[] {
    return Array.from(this.plugins.values()).map((p) => p.manifest);
  }

  /**
   * Get a specific plugin instance.
   */
  getPlugin(id: string): PluginInstance | undefined {
    return this.plugins.get(id);
  }

  /**
   * Unload a plugin.
   */
  async unloadPlugin(id: string): Promise<boolean> {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;

    if (plugin.module && typeof plugin.module.shutdown === 'function') {
      await plugin.module.shutdown();
    }

    this.plugins.delete(id);
    this.emit('plugin:unloaded', id);
    return true;
  }

  /**
   * Shutdown all plugins.
   */
  async shutdown(): Promise<void> {
    for (const [id, plugin] of this.plugins) {
      if (plugin.module && typeof plugin.module.shutdown === 'function') {
        try {
          await plugin.module.shutdown();
        } catch (err) {
          console.error(`[PluginManager] Error shutting down ${id}:`, err);
        }
      }
    }
    this.plugins.clear();
  }
}
