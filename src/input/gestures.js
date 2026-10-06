/* Gestes unifiés souris + tactile via Pointer Events (un seul code pour les deux, contrairement à
 * l'ancienne approche touchstart/mousedown séparée). Émet des événements logiques :
 *  - onTap(x,y)            : construire (poser ou surélever une cellule)
 *  - onLongPress(x,y)      : action secondaire (démolir un étage)
 *  - onDragOrbit(dx,dy)    : un doigt / clic gauche qui glisse → orbite la caméra
 *  - onPan(dx,dy)          : deux doigts qui glissent ensemble → déplace la cible de la caméra
 *  - onZoom(factor)        : pincement ou molette → zoom (facteur >1 = s'éloigne, <1 = se rapproche)
 * Navigateur uniquement (DOM), vérifié par simulation de PointerEvent dans tools/smoke.js. */
(function (global) {
  const TAP_MAX_MOVE = 10;
  const TAP_MAX_MS = 350;
  const LONG_PRESS_MS = 480;

  function attach(el, handlers) {
    const pointers = new Map();
    let mode = null; // 'single' | 'dual'
    let longPressTimer = null;
    let pinchStartDist = 0;
    let lastMid = null;

    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const clearLongPress = () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } };

    el.addEventListener('pointerdown', (e) => {
      if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, {
        x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY,
        x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false, consumed: false,
      });
      if (pointers.size === 1) {
        mode = 'single';
        const p = pointers.get(e.pointerId);
        clearLongPress();
        longPressTimer = setTimeout(() => {
          if (p.moved) return;
          p.consumed = true;
          handlers.onLongPress && handlers.onLongPress(p.x, p.y);
        }, LONG_PRESS_MS);
      } else if (pointers.size === 2) {
        clearLongPress();
        mode = 'dual';
        const [a, b] = [...pointers.values()];
        pinchStartDist = dist(a, b);
        lastMid = mid(a, b);
      }
    });

    el.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.lastX, dy = e.clientY - p.lastY;
      p.x = e.clientX; p.y = e.clientY; p.lastX = e.clientX; p.lastY = e.clientY;
      if (Math.hypot(p.x - p.x0, p.y - p.y0) > TAP_MAX_MOVE) p.moved = true;

      if (mode === 'single' && pointers.size === 1) {
        if (p.moved) { clearLongPress(); handlers.onDragOrbit && handlers.onDragOrbit(dx, dy); }
      } else if (mode === 'dual' && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = dist(a, b);
        if (pinchStartDist > 0 && Math.abs(d - pinchStartDist) > 0.5) {
          handlers.onZoom && handlers.onZoom(pinchStartDist / d);
          pinchStartDist = d;
        }
        const m = mid(a, b);
        if (lastMid) handlers.onPan && handlers.onPan(m.x - lastMid.x, m.y - lastMid.y);
        lastMid = m;
      }
    });

    function release(e) {
      const p = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      clearLongPress();
      if (p && !p.moved && !p.consumed && mode === 'single' && pointers.size === 0) {
        if (performance.now() - p.t0 < TAP_MAX_MS) handlers.onTap && handlers.onTap(p.x, p.y);
      }
      if (pointers.size === 0) mode = null;
      else if (pointers.size === 1) { mode = 'single'; pinchStartDist = 0; lastMid = null; }
    }
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      handlers.onZoom && handlers.onZoom(e.deltaY > 0 ? 1.1 : 0.9);
    }, { passive: false });

    el.style.touchAction = 'none';
  }

  const ns = (global.DW = global.DW || {});
  ns.Gestures = { attach };
})(window);
