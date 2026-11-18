// Looping exercise video player (rendered offline from tools/blender). Same API the tracker used for the SVG figure.
export function mount(el) {
  el.innerHTML = '<video class="exvid" muted loop playsinline autoplay preload="auto"></video>';
  const v = el.querySelector('video');
  let speed = 1;
  return {
    set(k) { v.src = `vid/${k}.mp4`; v.playbackRate = speed; v.play().catch(() => {}); },
    togglePause() { if (v.paused) { v.play().catch(() => {}); return false; } v.pause(); return true; },
    setSpeed(x) { speed = x; v.playbackRate = x; },
    stop() { v.pause(); },
  };
}
