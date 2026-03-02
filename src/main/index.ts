import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { AppController } from './core/AppController';
import { setupIpcBridge } from './ipc/IpcBridge';

let mainWindow: BrowserWindow | null = null;
let appController: AppController | null = null;

const isDev = !app.isPackaged;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'StreamPad',
    backgroundColor: '#0f0f14',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
    show: false,
    titleBarStyle: 'hiddenInset',
    frame: process.platform !== 'darwin',
  });

  // Remove default menu in production
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // Load renderer
  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function bootstrap(): Promise<void> {
  // Create the AppController
  appController = new AppController();

  await createWindow();

  if (mainWindow && appController) {
    // Setup IPC bridge
    setupIpcBridge(appController, mainWindow);

    // Initialize the controller (MIDI, profiles, plugins)
    await appController.initialize();
  }
}

// ─── App Lifecycle ──────────────────────────────────────────

app.whenReady().then(bootstrap).catch(console.error);

app.on('window-all-closed', async () => {
  if (appController) {
    await appController.shutdown();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    bootstrap().catch(console.error);
  }
});

app.on('before-quit', async () => {
  if (appController) {
    await appController.shutdown();
  }
});
