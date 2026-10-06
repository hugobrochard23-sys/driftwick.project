/* Interface minimale : indice de premier lancement (disparaît après la première interaction ou
 * définitivement après la première partie), bouton réglages (son, vibration, recommencer), bouton
 * mode photo (câblé en P8). Pur DOM, pas de framework — cohérent avec "aucun menu inutile". */
(function (global) {
  const STORAGE_KEY = 'driftwick.settings';

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign({ sound: true, vibration: true, seenHint: false }, JSON.parse(raw));
    } catch (e) { /* localStorage indisponible (navigation privée, etc.) : réglages par défaut */ }
    return { sound: true, vibration: true, seenHint: false };
  }

  function saveSettings(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { /* tant pis, pas bloquant */ }
  }

  function init({ onReset, onPhotoToggle, onNewWorld, onSwitchWorld, onExport, onImport }) {
    const settings = loadSettings();
    const hint = document.getElementById('hud-hint');
    const panel = document.getElementById('hud-panel');
    const settingsBtn = document.getElementById('hud-settings');
    const photoBtn = document.getElementById('hud-photo');
    const soundBox = document.getElementById('hud-sound');
    const vibrationBox = document.getElementById('hud-vibration');
    const worldSelect = document.getElementById('hud-world-select');
    const importFile = document.getElementById('hud-import-file');

    soundBox.checked = settings.sound;
    vibrationBox.checked = settings.vibration;

    function dismissHint() {
      if (settings.seenHint) return;
      settings.seenHint = true;
      saveSettings(settings);
      hint.classList.add('hud-hidden');
    }
    if (settings.seenHint) hint.classList.add('hud-hidden');

    // Rafraîchit la liste déroulante des mondes (appelé par game.js après chaque changement).
    function refreshWorldList(current, names) {
      worldSelect.innerHTML = '';
      for (const name of names) {
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = name;
        if (name === current) opt.selected = true;
        worldSelect.appendChild(opt);
      }
    }

    settingsBtn.addEventListener('click', () => { panel.hidden = !panel.hidden; });
    document.getElementById('hud-close').addEventListener('click', () => { panel.hidden = true; });
    soundBox.addEventListener('change', () => { settings.sound = soundBox.checked; saveSettings(settings); });
    vibrationBox.addEventListener('change', () => { settings.vibration = vibrationBox.checked; saveSettings(settings); });
    document.getElementById('hud-reset').addEventListener('click', () => {
      panel.hidden = true;
      if (onReset) onReset();
    });
    photoBtn.addEventListener('click', () => { if (onPhotoToggle) onPhotoToggle(); });
    worldSelect.addEventListener('change', () => { if (onSwitchWorld) onSwitchWorld(worldSelect.value); });
    document.getElementById('hud-world-new').addEventListener('click', () => { if (onNewWorld) onNewWorld(); });
    document.getElementById('hud-export').addEventListener('click', () => { if (onExport) onExport(); });
    document.getElementById('hud-import').addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', () => {
      const file = importFile.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { if (onImport) onImport(String(reader.result)); };
      reader.readAsText(file);
      importFile.value = '';
    });

    return { settings, dismissHint, refreshWorldList };
  }

  const ns = (global.DW = global.DW || {});
  ns.HUD = { init };
})(window);
