const SEEN_KEY = "rovik_seen_order_ids";
const NEW_KEY = "rovik_new_order_ids";
const SOUND_KEY = "rovik_sound_on";

function readIds(key: string) {
  try {
    const raw = sessionStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(parsed);
  } catch {
    return new Set<string>();
  }
}

function writeIds(key: string, ids: Set<string>) {
  sessionStorage.setItem(key, JSON.stringify([...ids]));
}

export function loadSeenOrderIds() {
  return readIds(SEEN_KEY);
}

export function saveSeenOrderIds(ids: Set<string>) {
  writeIds(SEEN_KEY, ids);
}

export function loadNewOrderIds() {
  return readIds(NEW_KEY);
}

export function saveNewOrderIds(ids: Set<string>) {
  writeIds(NEW_KEY, ids);
}

export function clearNewOrder(id: string) {
  const next = loadNewOrderIds();
  next.delete(id);
  saveNewOrderIds(next);
  return next;
}

export function isSoundEnabled() {
  return localStorage.getItem(SOUND_KEY) === "1";
}

export function setSoundEnabled(on: boolean) {
  localStorage.setItem(SOUND_KEY, on ? "1" : "0");
}

let audioEl: HTMLAudioElement | null = null;

export function getAlertAudio() {
  if (typeof window === "undefined") return null;
  if (!audioEl) {
    audioEl = new Audio("/sounds/new-order.wav");
    audioEl.preload = "auto";
    audioEl.volume = 1;
  }
  return audioEl;
}

export function unlockAlertSound() {
  const el = getAlertAudio();
  if (!el) return;
  el.muted = true;
  const play = el.play();
  if (play) {
    void play
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.muted = false;
        setSoundEnabled(true);
      })
      .catch(() => {
        el.muted = false;
      });
  }
}

export async function playNewOrderSound() {
  try {
    const el = getAlertAudio();
    if (!el) return false;
    el.muted = false;
    el.currentTime = 0;
    await el.play();
    setSoundEnabled(true);
    return true;
  } catch {
    return false;
  }
}
