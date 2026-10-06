/* Vibration légère (Android/Chrome : API Vibration ; iPhone/Safari : ignorée silencieusement,
 * aucune API équivalente — voir le même constat déjà fait pour Cold Impact dans ce Bureau). */
(function (global) {
  let enabled = true;
  function setEnabled(v) { enabled = v; }
  function tick(kind) {
    if (!enabled || !navigator.vibrate) return;
    navigator.vibrate(kind === 'demolish' ? 18 : 12);
  }
  const ns = (global.DW = global.DW || {});
  ns.Haptics = { setEnabled, tick };
})(window);
