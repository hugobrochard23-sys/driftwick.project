/* Sons synthétisés (Web Audio), aucun fichier audio — même esprit que les autres jeux du Bureau
 * (cold-impact). Le contexte audio ne démarre qu'après un premier geste utilisateur (politique des
 * navigateurs) : `init()` doit être appelé depuis un gestionnaire d'événement réel (tap, clic). */
(function (global) {
  let ctx = null, master = null, ambienceNode = null;
  let enabled = true;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return; // navigateur sans Web Audio : le jeu reste jouable, juste silencieux
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = enabled ? 1 : 0;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; master = null; } // contexte refusé (politique du navigateur) : silencieux, pas bloquant
  }

  function setEnabled(v) {
    enabled = v;
    if (master) master.gain.setTargetAtTime(enabled ? 1 : 0, ctx.currentTime, 0.05);
  }

  // Bip court et montant : construction. `freqStart`→`freqEnd` en quelques dizaines de ms.
  function blip(freqStart, freqEnd, duration, type) {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freqStart, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + duration);
    gain.gain.setValueAtTime(0.18, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain); gain.connect(master);
    osc.start(t0); osc.stop(t0 + duration + 0.02);
  }

  function playBuild() { blip(420, 720, 0.12, 'triangle'); }
  function playDemolish() { blip(260, 110, 0.16, 'sine'); }

  // Ambiance : bruit filtré en boucle, très bas volume — vent/eau lointains, jamais de mélodie.
  function startAmbience() {
    if (!ctx || ambienceNode) return;
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer; noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 500; filter.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.value = 0.025;
    noise.connect(filter); filter.connect(gain); gain.connect(master);
    noise.start();
    ambienceNode = noise;
  }

  const ns = (global.DW = global.DW || {});
  ns.Audio = { init, setEnabled, playBuild, playDemolish, startAmbience };
})(window);
