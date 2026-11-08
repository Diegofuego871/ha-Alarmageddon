// Ladeanzeige, 1:1 wie in Device Panel (docs/mockups/loader-v1, A): Der Inhalt bleibt gedimmt stehen, drei Punkte in der Farbe des Panels
// drehen sich frei um alle Achsen darüber. Der Zeitgeber endet, sobald keine Ladeanzeige mehr im Dokument steht.
// Regel: Reiter oder Filter wechseln sofort, danach lädt es; nie ein Text "Lädt …" oder ein Balken.

export function loaderHtml(label, color = "var(--ag-primary)", top = false) {
  return `<span class="ag-ld${top ? " top" : ""}" role="status" aria-label="${label}" style="--ld:${color}"><s></s><s></s><s></s></span>`;
}

// root: Shadow-Root des Panels; state: Objekt des Panels für Zeitgeber (_ldRaf, _ldIdle)
export function loaderStart(root, state) {
  if (state._ldRaf || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  state._ldIdle = 0;
  const K = { a: 1.7, b: 0.9, p: 0, c: 1.3, d: 1.3, q: 1.7, e: 0.9, f: 0.7, r: 3.1 };
  const SPEED = 2.1; // Umdrehungen schneller als die ersten Entwürfe (zu langsam)
  const R = 26;
  const rot = ([a, b, c], [x, y, z]) => {
    let u = b * Math.cos(x) - c * Math.sin(x);
    c = b * Math.sin(x) + c * Math.cos(x);
    b = u;
    u = a * Math.cos(y) + c * Math.sin(y);
    c = -a * Math.sin(y) + c * Math.cos(y);
    a = u;
    u = a * Math.cos(z) - b * Math.sin(z);
    b = a * Math.sin(z) + b * Math.cos(z);
    return [u, b, c];
  };
  const tick = (now) => {
    const boxes = root.querySelectorAll(".ag-ld");
    if (!boxes.length) {
      // Erst nach einer kurzen Pause enden (die nächste Ladeanzeige kann gleich folgen)
      if (++state._ldIdle > 30) {
        state._ldRaf = 0;
        return;
      }
      state._ldRaf = requestAnimationFrame(tick);
      return;
    }
    state._ldIdle = 0;
    const t = (now / 1000) * SPEED;
    const ang = [K.a * t + 0.9 * Math.sin(K.b * t + K.p), K.c * t + 0.8 * Math.sin(K.d * t + K.q), K.e * t + 0.7 * Math.sin(K.f * t + K.r)];
    const pos = [0, 1, 2].map((i) => {
      const a = (i * 2 * Math.PI) / 3;
      const p = rot([Math.cos(a) * R, Math.sin(a) * R, 0], ang);
      const s = 1 / (1 - p[2] / (R * 4.2));
      return { x: p[0] * s, y: p[1] * s, s, z: p[2] };
    });
    for (const box of boxes) {
      box.querySelectorAll("s").forEach((dot, i) => {
        const p = pos[i];
        const size = 14 * p.s;
        dot.style.cssText = `width:${size}px;height:${size}px;left:${36 + p.x - size / 2}px;top:${36 + p.y - size / 2}px;opacity:${0.55 + 0.45 * Math.min(1, Math.max(0, (p.z / R + 1) / 2))}`;
      });
    }
    state._ldRaf = requestAnimationFrame(tick);
  };
  state._ldRaf = requestAnimationFrame(tick);
}
