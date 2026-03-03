import { exec } from 'child_process';
import { Action, MediaKeyType } from '../../shared/types';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import WebSocket from 'ws';

/**
 * ActionExecutor – executes mapped actions in response to pad input.
 * Supports keyboard shortcuts, app launching, system commands,
 * HTTP requests, WebSocket messages, audio playback, media keys, and multi-actions.
 */
export class ActionExecutor {
  private pluginExecutor?: (pluginId: string, actionId: string, params?: Record<string, unknown>) => Promise<void>;
  private profileSwitcher?: (profileId: string) => void;
  private layerSwitcher?: (layerId: string) => void;
  private audioElements: Map<string, { process: ReturnType<typeof exec> }> = new Map();

  setPluginExecutor(fn: (pluginId: string, actionId: string, params?: Record<string, unknown>) => Promise<void>): void {
    this.pluginExecutor = fn;
  }

  setProfileSwitcher(fn: (profileId: string) => void): void {
    this.profileSwitcher = fn;
  }

  setLayerSwitcher(fn: (layerId: string) => void): void {
    this.layerSwitcher = fn;
  }

  /**
   * Execute a single action or a chain of actions.
   */
  async execute(action: Action): Promise<void> {
    try {
      switch (action.type) {
        case 'keyboard_shortcut':
          await this.executeKeyboardShortcut(action.keys);
          break;

        case 'hotkey_sequence':
          for (const step of action.sequence) {
            await this.executeKeyboardShortcut(step.keys);
            if (step.delayMs > 0) {
              await this.delay(step.delayMs);
            }
          }
          break;

        case 'launch_app':
          await this.launchApp(action.path, action.args);
          break;

        case 'system_command':
          await this.executeSystemCommand(action.command);
          break;

        case 'http_request':
          await this.executeHttpRequest(action.method, action.url, action.headers, action.body);
          break;

        case 'websocket_message':
          await this.executeWebSocketMessage(action.url, action.message);
          break;

        case 'osc_message':
          console.log(`[ActionExecutor] OSC: ${action.address} → ${action.host}:${action.port}`);
          // OSC implementation requires additional library
          break;

        case 'plugin_action':
          if (this.pluginExecutor) {
            await this.pluginExecutor(action.pluginId, action.actionId, action.params);
          }
          break;

        case 'profile_switch':
          if (this.profileSwitcher) {
            this.profileSwitcher(action.profileId);
          }
          break;

        case 'layer_switch':
          if (this.layerSwitcher) {
            this.layerSwitcher(action.layerId);
          }
          break;

        case 'delay':
          await this.delay(action.delayMs);
          break;

        case 'multi_action':
          for (const subAction of action.actions) {
            await this.execute(subAction);
          }
          break;

        case 'play_audio':
          await this.playAudio(action.filePath, action.volume);
          break;

        case 'media_key':
          await this.executeMediaKey(action.key);
          break;

        case 'open_folder':
          if (this.layerSwitcher) {
            this.layerSwitcher(action.targetLayerId);
          }
          break;
      }
    } catch (err) {
      console.error(`[ActionExecutor] Error executing ${action.type}:`, err);
    }
  }

  /**
   * Simulate keyboard shortcut using platform-native tools.
   */
  private async executeKeyboardShortcut(keys: string[]): Promise<void> {
    const platform = process.platform;
    const keyCombo = keys.join('+');

    if (platform === 'win32') {
      // Use PowerShell SendKeys or nircmd
      const psKeys = this.toPowerShellKeys(keys);
      return new Promise((resolve, reject) => {
        exec(
          `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${psKeys}')"`,
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    } else if (platform === 'darwin') {
      // Use osascript
      const asKeys = this.toAppleScriptKeys(keys);
      return new Promise((resolve, reject) => {
        exec(`osascript -e 'tell application "System Events" to ${asKeys}'`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else {
      // Linux: xdotool
      const xdoKeys = keys.join('+');
      return new Promise((resolve, reject) => {
        exec(`xdotool key ${xdoKeys}`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  private toPowerShellKeys(keys: string[]): string {
    const map: Record<string, string> = {
      ctrl: '^',
      alt: '%',
      shift: '+',
      enter: '{ENTER}',
      tab: '{TAB}',
      escape: '{ESC}',
      esc: '{ESC}',
      backspace: '{BACKSPACE}',
      delete: '{DELETE}',
      up: '{UP}',
      down: '{DOWN}',
      left: '{LEFT}',
      right: '{RIGHT}',
      home: '{HOME}',
      end: '{END}',
      pageup: '{PGUP}',
      pagedown: '{PGDN}',
      space: ' ',
      f1: '{F1}', f2: '{F2}', f3: '{F3}', f4: '{F4}',
      f5: '{F5}', f6: '{F6}', f7: '{F7}', f8: '{F8}',
      f9: '{F9}', f10: '{F10}', f11: '{F11}', f12: '{F12}',
    };

    let modifiers = '';
    let mainKey = '';

    for (const key of keys) {
      const lower = key.toLowerCase();
      if (lower === 'ctrl' || lower === 'alt' || lower === 'shift') {
        modifiers += map[lower] || '';
      } else {
        mainKey = map[lower] || key;
      }
    }

    return mainKey ? `${modifiers}(${mainKey})` : modifiers;
  }

  private toAppleScriptKeys(keys: string[]): string {
    const modifiers: string[] = [];
    let mainKey = '';

    for (const key of keys) {
      const lower = key.toLowerCase();
      switch (lower) {
        case 'ctrl':
        case 'control':
          modifiers.push('control down');
          break;
        case 'alt':
        case 'option':
          modifiers.push('option down');
          break;
        case 'shift':
          modifiers.push('shift down');
          break;
        case 'cmd':
        case 'command':
        case 'meta':
          modifiers.push('command down');
          break;
        default:
          mainKey = lower;
      }
    }

    const modStr = modifiers.length > 0 ? ` using {${modifiers.join(', ')}}` : '';
    return `keystroke "${mainKey}"${modStr}`;
  }

  private async launchApp(appPath: string, args?: string[]): Promise<void> {
    const command = args ? `"${appPath}" ${args.join(' ')}` : `"${appPath}"`;
    return new Promise((resolve, reject) => {
      exec(command, { windowsHide: false }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async executeSystemCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(command, (err, stdout) => {
        if (err) reject(err);
        else {
          console.log(`[ActionExecutor] Command output: ${stdout.substring(0, 200)}`);
          resolve();
        }
      });
    });
  }

  private async executeHttpRequest(
    method: string,
    url: string,
    headers?: Record<string, string>,
    body?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const lib = isHttps ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          console.log(`[ActionExecutor] HTTP ${method} ${url} → ${res.statusCode}`);
          resolve();
        });
      });

      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }

  private async executeWebSocketMessage(url: string, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(url);
        ws.on('open', () => {
          ws.send(message);
          ws.close();
          resolve();
        });
        ws.on('error', (err) => {
          console.warn('[ActionExecutor] WebSocket error:', err.message);
          resolve(); // Don't reject, just warn
        });
      } catch (err: any) {
        console.warn('[ActionExecutor] WebSocket failed:', err.message);
        resolve();
      }
    });
  }

  /**
   * Play an audio file using platform-native tools.
   */
  private async playAudio(filePath: string, volume: number = 1): Promise<void> {
    const platform = process.platform;
    const vol = Math.round(volume * 100);

    if (platform === 'win32') {
      // Use PowerShell MediaPlayer
      const ps = `
        Add-Type -AssemblyName presentationCore;
        $player = New-Object System.Windows.Media.MediaPlayer;
        $player.Open([System.Uri]"${filePath.replace(/\\/g, '\\\\')}");
        $player.Volume = ${volume};
        $player.Play();
        Start-Sleep -Seconds 10;
      `;
      exec(`powershell -Command "${ps.replace(/\n/g, ' ')}"`, { windowsHide: true });
    } else if (platform === 'darwin') {
      exec(`afplay "${filePath}" --volume ${volume}`);
    } else {
      exec(`paplay "${filePath}" --volume=${Math.round(volume * 65536)}`);
    }
  }

  /**
   * Simulate media key press using platform-native tools.
   */
  private async executeMediaKey(key: MediaKeyType): Promise<void> {
    const platform = process.platform;

    if (platform === 'win32') {
      // Use PowerShell to simulate media keys via Win32 API
      const keyMap: Record<MediaKeyType, string> = {
        play_pause: '0xB3',   // VK_MEDIA_PLAY_PAUSE
        next_track: '0xB0',   // VK_MEDIA_NEXT_TRACK
        prev_track: '0xB1',   // VK_MEDIA_PREV_TRACK
        stop: '0xB2',         // VK_MEDIA_STOP
        volume_up: '0xAF',    // VK_VOLUME_UP
        volume_down: '0xAE',  // VK_VOLUME_DOWN
        mute: '0xAD',         // VK_VOLUME_MUTE
      };
      const vk = keyMap[key];
      if (vk) {
        const ps = `
          $sig = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);';
          $type = Add-Type -MemberDefinition $sig -Name WinAPI -Namespace MediaKeys -PassThru;
          $type::keybd_event(${vk}, 0, 0, [UIntPtr]::Zero);
          $type::keybd_event(${vk}, 0, 2, [UIntPtr]::Zero);
        `;
        return new Promise((resolve) => {
          exec(`powershell -Command "${ps.replace(/\n/g, ' ')}"`, { windowsHide: true }, () => resolve());
        });
      }
    } else if (platform === 'darwin') {
      const asMap: Record<MediaKeyType, number> = {
        play_pause: 16,
        next_track: 17,
        prev_track: 18,
        stop: 16, // macOS uses play_pause to stop
        volume_up: 0,
        volume_down: 1,
        mute: 7,
      };
      // Using NX system-defined keys
      const keyCode = asMap[key];
      exec(`osascript -e 'tell application "System Events" to key code ${keyCode}'`);
    } else {
      const xdoMap: Record<MediaKeyType, string> = {
        play_pause: 'XF86AudioPlay',
        next_track: 'XF86AudioNext',
        prev_track: 'XF86AudioPrev',
        stop: 'XF86AudioStop',
        volume_up: 'XF86AudioRaiseVolume',
        volume_down: 'XF86AudioLowerVolume',
        mute: 'XF86AudioMute',
      };
      exec(`xdotool key ${xdoMap[key]}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
