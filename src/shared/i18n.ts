/* ══════════════════════════════════════════════════════════════════════════════
 * StreamPad — Internationalization (i18n)
 * Supports: English (en), German (de)
 * ══════════════════════════════════════════════════════════════════════════════ */

export type Language = "en" | "de";

export interface Translations {
  calibration: {
    welcome: string;
    welcomeDesc: string;
    connected: string;
    noDevice: string;
    startCalibration: string;
    waitingForDevice: string;
    skip: string;
    detectingDevice: string;
    detectingDeviceDesc: string;
    testPads: string;
    testPadsDesc: string;
    lastNote: string;
    padsTested: string;
    looksGood: string;
    allSet: string;
    allSetDesc: string;
    startUsing: string;
  };
  deviceBar: {
    devices: string;
    noLaunchpad: string;
    io: string;
    input: string;
    output: string;
  };
  header: {
    appName: string;
    profile: string;
    profilePlaceholder: string;
    create: string;
    cancel: string;
    newProfile: string;
    deleteProfile: string;
    exportProfile: string;
    importProfile: string;
    streampadProfile: string;
    settings: string;
    minimize: string;
    maximize: string;
    close: string;
  };
  padGrid: {
    noActiveProfile: string;
    padTooltip: string;
    copy: string;
    paste: string;
    clearPad: string;
  };
  sidebar: {
    pressAPad: string;
    pad: string;
    note: string;
    label: string;
    labelPlaceholder: string;
    iconEmoji: string;
    iconPlaceholder: string;
    image: string;
    imagePlaceholder: string;
    browse: string;
    images: string;
    allFiles: string;
    preview: string;
    triggerType: string;
    momentary: string;
    toggle: string;
    hold: string;
    defaultColor: string;
    activeColor: string;
    none: string;
    pulse: string;
    flash: string;
    rainbow: string;
    brightness: string;
    triggersAndActions: string;
    addTrigger: string;
    addAction: string;
    press: string;
    release: string;
    doublePress: string;
    triplePress: string;
    velocity: string;
    aftertouch: string;
    keyboardShortcut: string;
    hotkeySequence: string;
    launchApp: string;
    systemCommand: string;
    httpRequest: string;
    websocketMessage: string;
    oscMessage: string;
    pluginAction: string;
    switchProfile: string;
    switchLayer: string;
    delay: string;
    multiAction: string;
    playAudio: string;
    mediaKey: string;
    openFolder: string;
    moveUp: string;
    moveDown: string;
    duplicate: string;
    keyComboPlaceholder: string;
    recording: string;
    record: string;
    delayLabel: string;
    ms: string;
    addStep: string;
    appPathPlaceholder: string;
    executables: string;
    commandPlaceholder: string;
    urlPlaceholder: string;
    bodyJsonPlaceholder: string;
    wsPlaceholder: string;
    messagePayloadPlaceholder: string;
    host: string;
    port: string;
    oscAddressPlaceholder: string;
    pluginIdPlaceholder: string;
    actionIdPlaceholder: string;
    selectProfile: string;
    selectLayer: string;
    delayMs: string;
    audioFilePlaceholder: string;
    audio: string;
    vol: string;
    volume: string;
    playPause: string;
    nextTrack: string;
    previousTrack: string;
    stop: string;
    volumeUp: string;
    volumeDown: string;
    mute: string;
    selectTargetLayer: string;
    padEnabled: string;
  };
  settings: {
    title: string;
    behavior: string;
    minimizeToTray: string;
    startMinimized: string;
    autoConnect: string;
    inputTiming: string;
    holdThreshold: string;
    multiPressWindow: string;
    appearance: string;
    dark: string;
    grey: string;
    light: string;
    calibration: string;
    recalibrate: string;
    recalibrateDesc: string;
    settingsSaved: string;
    language: string;
    languageDesc: string;
  };
  app: {
    layer: string;
  };
  common: {
    cancel: string;
    close: string;
    save: string;
  };
}

const en: Translations = {
  calibration: {
    welcome: "Welcome to StreamPad",
    welcomeDesc: "Let's make sure your Launchpad is connected and working correctly. This quick setup will verify the pad mapping.",
    connected: "connected",
    noDevice: "No device detected — connect your Launchpad",
    startCalibration: "Start Calibration",
    waitingForDevice: "Waiting for Device…",
    skip: "Skip",
    detectingDevice: "Detecting Device",
    detectingDeviceDesc: "Press any pad on your Launchpad to confirm it's connected.",
    testPads: "Test Your Pads",
    testPadsDesc: "Press pads on your Launchpad. The corresponding grid cell should light up below.",
    lastNote: "Last: Note {note} → Row {row}, Col {col}",
    padsTested: "{n} pad(s) tested",
    looksGood: "Looks Good!",
    allSet: "All Set!",
    allSetDesc: "Your Launchpad is calibrated and ready to go. You tested {n} pad(s) and everything looks correct.",
    startUsing: "Start Using StreamPad",
  },
  deviceBar: {
    devices: "Devices:",
    noLaunchpad: "No Launchpad connected",
    io: "I/O",
    input: "IN",
    output: "OUT",
  },
  header: {
    appName: "StreamPad",
    profile: "Profile:",
    profilePlaceholder: "Profile name...",
    create: "Create",
    cancel: "Cancel",
    newProfile: "+ New",
    deleteProfile: "Delete profile",
    exportProfile: "↑ Export",
    importProfile: "↓ Import",
    streampadProfile: "StreamPad Profile",
    settings: "Settings",
    minimize: "Minimize",
    maximize: "Maximize",
    close: "Close",
  },
  padGrid: {
    noActiveProfile: "No active profile. Create one to get started.",
    padTooltip: "Pad {row}×{col} (Note {note})",
    copy: "Copy",
    paste: "Paste",
    clearPad: "Clear Pad",
  },
  sidebar: {
    pressAPad: "Press a pad on your Launchpad or click one in the grid",
    pad: "Pad {row}×{col}",
    note: "Note {note}",
    label: "Label",
    labelPlaceholder: "Button name...",
    iconEmoji: "Icon (emoji)",
    iconPlaceholder: "e.g. 🎵 🔊 🌐 🎮 ...",
    image: "Image",
    imagePlaceholder: "Image path or URL...",
    browse: "Browse",
    images: "Images",
    allFiles: "All Files",
    preview: "Preview",
    triggerType: "Trigger Type",
    momentary: "Momentary",
    toggle: "Toggle",
    hold: "Hold",
    defaultColor: "Default Color",
    activeColor: "Active Color",
    none: "None",
    pulse: "Pulse",
    flash: "Flash",
    rainbow: "Rainbow",
    brightness: "Brightness: {n}%",
    triggersAndActions: "Triggers & Actions",
    addTrigger: "+ Add Trigger...",
    addAction: "+ Add Action...",
    press: "Press",
    release: "Release",
    doublePress: "Double Press",
    triplePress: "Triple Press",
    velocity: "Velocity",
    aftertouch: "Aftertouch",
    keyboardShortcut: "Keyboard Shortcut",
    hotkeySequence: "Hotkey Sequence",
    launchApp: "Launch Application",
    systemCommand: "System Command",
    httpRequest: "HTTP Request",
    websocketMessage: "WebSocket Message",
    oscMessage: "OSC Message",
    pluginAction: "Plugin Action",
    switchProfile: "Switch Profile",
    switchLayer: "Switch Layer",
    delay: "Delay",
    multiAction: "Multi-Action",
    playAudio: "🔊 Play Audio (Soundboard)",
    mediaKey: "Media Key",
    openFolder: "Open Folder (Layer)",
    moveUp: "Move up",
    moveDown: "Move down",
    duplicate: "Duplicate",
    keyComboPlaceholder: "e.g. ctrl+shift+a",
    recording: "⏺ Recording...",
    record: "⌨ Record",
    delayLabel: "Delay",
    ms: "ms",
    addStep: "+ Add Step",
    appPathPlaceholder: "Application path...",
    executables: "Executables",
    commandPlaceholder: "Command...",
    urlPlaceholder: "URL...",
    bodyJsonPlaceholder: "Body (JSON)...",
    wsPlaceholder: "ws://host:port",
    messagePayloadPlaceholder: "Message payload...",
    host: "Host",
    port: "Port",
    oscAddressPlaceholder: "/osc/address",
    pluginIdPlaceholder: "Plugin ID...",
    actionIdPlaceholder: "Action ID...",
    selectProfile: "Select profile...",
    selectLayer: "Select layer...",
    delayMs: "Delay (ms)",
    audioFilePlaceholder: "Audio file path...",
    audio: "Audio",
    vol: "Vol",
    volume: "Volume: {n}%",
    playPause: "Play / Pause",
    nextTrack: "Next Track",
    previousTrack: "Previous Track",
    stop: "Stop",
    volumeUp: "Volume Up",
    volumeDown: "Volume Down",
    mute: "Mute",
    selectTargetLayer: "Select target layer...",
    padEnabled: "Pad enabled",
  },
  settings: {
    title: "Settings",
    behavior: "Behavior",
    minimizeToTray: "Minimize to system tray on close",
    startMinimized: "Start minimized",
    autoConnect: "Auto-connect to last device",
    inputTiming: "Input Timing",
    holdThreshold: "Hold threshold",
    multiPressWindow: "Multi-press window",
    appearance: "Appearance",
    dark: "Dark",
    grey: "Grey",
    light: "Light",
    calibration: "Calibration",
    recalibrate: "🎹 Recalibrate Pads",
    recalibrateDesc: "Restarts the calibration wizard on next reload",
    settingsSaved: "Settings saved",
    language: "Language",
    languageDesc: "Choose the interface language",
  },
  app: {
    layer: "Layer {n}",
  },
  common: {
    cancel: "Cancel",
    close: "Close",
    save: "Save",
  },
};

const de: Translations = {
  calibration: {
    welcome: "Willkommen bei StreamPad",
    welcomeDesc: "Lass uns sicherstellen, dass dein Launchpad verbunden ist und korrekt funktioniert. Dieses schnelle Setup überprüft die Pad-Zuordnung.",
    connected: "verbunden",
    noDevice: "Kein Gerät erkannt — verbinde dein Launchpad",
    startCalibration: "Kalibrierung starten",
    waitingForDevice: "Warte auf Gerät…",
    skip: "Überspringen",
    detectingDevice: "Gerät erkennen",
    detectingDeviceDesc: "Drücke ein beliebiges Pad auf deinem Launchpad, um die Verbindung zu bestätigen.",
    testPads: "Pads testen",
    testPadsDesc: "Drücke Pads auf deinem Launchpad. Die entsprechende Rasterzelle sollte unten aufleuchten.",
    lastNote: "Zuletzt: Note {note} → Reihe {row}, Spalte {col}",
    padsTested: "{n} Pad(s) getestet",
    looksGood: "Sieht gut aus!",
    allSet: "Alles bereit!",
    allSetDesc: "Dein Launchpad ist kalibriert und einsatzbereit. Du hast {n} Pad(s) getestet und alles sieht korrekt aus.",
    startUsing: "StreamPad verwenden",
  },
  deviceBar: {
    devices: "Geräte:",
    noLaunchpad: "Kein Launchpad verbunden",
    io: "E/A",
    input: "EIN",
    output: "AUS",
  },
  header: {
    appName: "StreamPad",
    profile: "Profil:",
    profilePlaceholder: "Profilname...",
    create: "Erstellen",
    cancel: "Abbrechen",
    newProfile: "+ Neu",
    deleteProfile: "Profil löschen",
    exportProfile: "↑ Exportieren",
    importProfile: "↓ Importieren",
    streampadProfile: "StreamPad-Profil",
    settings: "Einstellungen",
    minimize: "Minimieren",
    maximize: "Maximieren",
    close: "Schließen",
  },
  padGrid: {
    noActiveProfile: "Kein aktives Profil. Erstelle eines, um loszulegen.",
    padTooltip: "Pad {row}×{col} (Note {note})",
    copy: "Kopieren",
    paste: "Einfügen",
    clearPad: "Pad leeren",
  },
  sidebar: {
    pressAPad: "Drücke ein Pad auf deinem Launchpad oder klicke eines im Raster",
    pad: "Pad {row}×{col}",
    note: "Note {note}",
    label: "Bezeichnung",
    labelPlaceholder: "Tastenname...",
    iconEmoji: "Symbol (Emoji)",
    iconPlaceholder: "z.B. 🎵 🔊 🌐 🎮 ...",
    image: "Bild",
    imagePlaceholder: "Bildpfad oder URL...",
    browse: "Durchsuchen",
    images: "Bilder",
    allFiles: "Alle Dateien",
    preview: "Vorschau",
    triggerType: "Auslösertyp",
    momentary: "Momentan",
    toggle: "Umschalten",
    hold: "Halten",
    defaultColor: "Standardfarbe",
    activeColor: "Aktive Farbe",
    none: "Keine",
    pulse: "Pulsieren",
    flash: "Blitzen",
    rainbow: "Regenbogen",
    brightness: "Helligkeit: {n}%",
    triggersAndActions: "Auslöser & Aktionen",
    addTrigger: "+ Auslöser hinzufügen...",
    addAction: "+ Aktion hinzufügen...",
    press: "Drücken",
    release: "Loslassen",
    doublePress: "Doppeldruck",
    triplePress: "Dreifachdruck",
    velocity: "Anschlagstärke",
    aftertouch: "Aftertouch",
    keyboardShortcut: "Tastenkombination",
    hotkeySequence: "Hotkey-Sequenz",
    launchApp: "Anwendung starten",
    systemCommand: "Systembefehl",
    httpRequest: "HTTP-Anfrage",
    websocketMessage: "WebSocket-Nachricht",
    oscMessage: "OSC-Nachricht",
    pluginAction: "Plugin-Aktion",
    switchProfile: "Profil wechseln",
    switchLayer: "Ebene wechseln",
    delay: "Verzögerung",
    multiAction: "Mehrfachaktion",
    playAudio: "🔊 Audio abspielen (Soundboard)",
    mediaKey: "Medientaste",
    openFolder: "Ordner öffnen (Ebene)",
    moveUp: "Nach oben",
    moveDown: "Nach unten",
    duplicate: "Duplizieren",
    keyComboPlaceholder: "z.B. strg+umschalt+a",
    recording: "⏺ Aufnahme...",
    record: "⌨ Aufnehmen",
    delayLabel: "Verzögerung",
    ms: "ms",
    addStep: "+ Schritt hinzufügen",
    appPathPlaceholder: "Anwendungspfad...",
    executables: "Ausführbare Dateien",
    commandPlaceholder: "Befehl...",
    urlPlaceholder: "URL...",
    bodyJsonPlaceholder: "Body (JSON)...",
    wsPlaceholder: "ws://host:port",
    messagePayloadPlaceholder: "Nachrichteninhalt...",
    host: "Host",
    port: "Port",
    oscAddressPlaceholder: "/osc/adresse",
    pluginIdPlaceholder: "Plugin-ID...",
    actionIdPlaceholder: "Aktions-ID...",
    selectProfile: "Profil auswählen...",
    selectLayer: "Ebene auswählen...",
    delayMs: "Verzögerung (ms)",
    audioFilePlaceholder: "Audiodateipfad...",
    audio: "Audio",
    vol: "Lautst.",
    volume: "Lautstärke: {n}%",
    playPause: "Abspielen / Pause",
    nextTrack: "Nächster Titel",
    previousTrack: "Vorheriger Titel",
    stop: "Stopp",
    volumeUp: "Lauter",
    volumeDown: "Leiser",
    mute: "Stumm",
    selectTargetLayer: "Zielebene auswählen...",
    padEnabled: "Pad aktiviert",
  },
  settings: {
    title: "Einstellungen",
    behavior: "Verhalten",
    minimizeToTray: "Beim Schließen in Systemleiste minimieren",
    startMinimized: "Minimiert starten",
    autoConnect: "Automatisch mit letztem Gerät verbinden",
    inputTiming: "Eingabe-Timing",
    holdThreshold: "Halte-Schwelle",
    multiPressWindow: "Mehrfachdruck-Fenster",
    appearance: "Darstellung",
    dark: "Dunkel",
    grey: "Grau",
    light: "Hell",
    calibration: "Kalibrierung",
    recalibrate: "🎹 Pads neu kalibrieren",
    recalibrateDesc: "Startet den Kalibrierungsassistenten beim nächsten Laden neu",
    settingsSaved: "Einstellungen gespeichert",
    language: "Sprache",
    languageDesc: "Wähle die Sprache der Benutzeroberfläche",
  },
  app: {
    layer: "Ebene {n}",
  },
  common: {
    cancel: "Abbrechen",
    close: "Schließen",
    save: "Speichern",
  },
};

const translations: Record<Language, Translations> = { en, de };

export function getTranslations(lang: Language): Translations {
  return translations[lang] || translations.en;
}

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
];
