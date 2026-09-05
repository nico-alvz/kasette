// app.js — Sonora. Offline music player: all app logic (state, rendering,
// audio engine, import, playlists, themes) lives in this single module.

import { putAudio, getAudio, putArt, getArt, delTrack, storageEstimate } from "./store.js";
import { readMeta } from "./meta.js";

// ───────────────────────── themes ─────────────────────────
const ACCENTS = [
  { name: "Tape Orange", hex: "#ff5500" },
  { name: "Signal Green", hex: "#22c55e" },
  { name: "Ocean Blue", hex: "#3b82f6" },
  { name: "Neon Pink", hex: "#ec4899" },
  { name: "Purple", hex: "#a855f7" },
];
const BACKGROUNDS = [
  { name: "Indigo", a: "#332c66", b: "#1c1840" },
  { name: "Night", a: "#233467", b: "#161c34" },
  { name: "Charcoal", a: "#2b2b34", b: "#17171c" },
  { name: "Crimson", a: "#6b1030", b: "#2c0b17" },
];

// ───────────────────────── icons ─────────────────────────
const P = {
  home: '<path d="M3 10.6 12 3l9 7.6"/><path d="M5.5 9.4V21h13V9.4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  library: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
  settings:
    '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>',
  play: '<path d="M6 4 20 12 6 20Z" style="fill:currentColor;stroke:none"/>',
  pause: '<path d="M7 4v16M17 4v16" style="stroke-width:3.4"/>',
  next: '<path d="M5 4 15 12 5 20Z" style="fill:currentColor;stroke:none"/><path d="M19 5v14"/>',
  prev: '<path d="M19 4 9 12 19 20Z" style="fill:currentColor;stroke:none"/><path d="M5 5v14"/>',
  shuffle:
    '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>',
  repeat:
    '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  heart:
    '<path d="M19 14c1.5-1.5 3-3.4 3-5.6A4.4 4.4 0 0 0 12 5 4.4 4.4 0 0 0 2 8.4c0 2.2 1.5 4.1 3 5.6l7 7Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  more:
    '<circle cx="12" cy="5" r="1.6" style="fill:currentColor;stroke:none"/><circle cx="12" cy="12" r="1.6" style="fill:currentColor;stroke:none"/><circle cx="12" cy="19" r="1.6" style="fill:currentColor;stroke:none"/>',
  folder:
    '<path d="M21 18V9a2 2 0 0 0-2-2h-7l-2-3H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Z"/><path d="M12 11v6M9 14h6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
};
const ic = (n, cls = "") =>
  `<svg class="svg ${cls}" viewBox="0 0 24 24">${P[n] || ""}</svg>`;

// ───────────────────────── state ─────────────────────────
const SYS = "system:imported";
const LS_LIB = "sonora:lib";
const LS_SET = "sonora:settings";
const LS_PB = "sonora:pb";

let lib = { tracks: {}, playlists: [] };
let settings = { accentIdx: 0, bgIdx: 0, mode: "light" };
let pb = { current: null, queue: [], qi: -1, shuffle: false, repeat: "off", playing: false };

const artURLs = {}; // id -> cover art objectURL (in-memory, per session)
let curURL = null; // objectURL of the audio currently loaded
let seeking = false;
let miniSwiped = false; // ignore the synthetic click after a mini-player swipe

let view = "home"; // home | search | library | settings
let plOpen = null; // id of the open playlist (detail view)
let searchQ = "";

const $ = (s, r = document) => r.querySelector(s);
const audio = $("#audio");
const elView = $("#view");
const elNav = $("#nav");
const elMini = $("#mini");
const elPlayer = $("#player");
const elModal = $("#modal");
const elToast = $("#toast");

// ───────────────────────── utils ─────────────────────────
function esc(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]),
  );
}
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}
function fmt(ms) {
  if (!ms || ms <= 0) return "0:00";
  const s = Math.floor(ms / 1000),
    h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    ss = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(ss)}` : `${m}:${p(ss)}`;
}
let toastT;
function toast(msg) {
  elToast.textContent = msg;
  elToast.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => elToast.classList.remove("show"), 1900);
}
const accent = () => ACCENTS[settings.accentIdx] || ACCENTS[0];

// ───────────────────────── persistence ─────────────────────────
function loadAll() {
  try {
    const l = JSON.parse(localStorage.getItem(LS_LIB) || "null");
    if (l && l.tracks) lib = l;
  } catch {}
  if (!lib.playlists || !lib.playlists.length)
    lib.playlists = [{ id: SYS, name: "Imported songs", system: true, trackIds: [], createdAt: Date.now() }];
  if (!lib.playlists.find((p) => p.id === SYS))
    lib.playlists.unshift({ id: SYS, name: "Imported songs", system: true, trackIds: [], createdAt: Date.now() });
  // the system playlist always keeps a fixed name (migrates old installs)
  const _imp = lib.playlists.find((p) => p.id === SYS);
  if (_imp) _imp.name = "Imported songs";
  try {
    const s = JSON.parse(localStorage.getItem(LS_SET) || "null");
    if (s) settings = { ...settings, ...s };
  } catch {}
  try {
    const p = JSON.parse(localStorage.getItem(LS_PB) || "null");
    if (p) {
      pb.shuffle = !!p.shuffle;
      pb.repeat = p.repeat || "off";
      pb.queue = (p.queueIds || []).map((id) => lib.tracks[id]).filter(Boolean);
      pb.qi = p.qi != null ? p.qi : -1;
      pb.current = p.currentId ? lib.tracks[p.currentId] || null : null;
    }
  } catch {}
}
const saveLib = () => localStorage.setItem(LS_LIB, JSON.stringify(lib));
const saveSet = () => localStorage.setItem(LS_SET, JSON.stringify(settings));
const savePB = () =>
  localStorage.setItem(
    LS_PB,
    JSON.stringify({
      currentId: pb.current ? pb.current.id : null,
      queueIds: pb.queue.map((t) => t.id),
      qi: pb.qi,
      shuffle: pb.shuffle,
      repeat: pb.repeat,
    }),
  );

function applyTheme() {
  const r = document.documentElement.style;
  r.setProperty("--accent", accent().hex);
  document.documentElement.dataset.theme = settings.mode;
  // Dark mode picks its background from BACKGROUNDS; light mode uses the
  // fixed light palette from [data-theme="light"] in index.html, so any
  // inline --bg0/--bg1 override must be cleared or it'd win over that rule.
  if (settings.mode === "dark") {
    const bg = BACKGROUNDS[settings.bgIdx] || BACKGROUNDS[0];
    r.setProperty("--bg0", bg.a);
    r.setProperty("--bg1", bg.b);
  } else {
    r.removeProperty("--bg0");
    r.removeProperty("--bg1");
  }
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute("content", settings.mode === "dark" ? "#131120" : "#ffffff");
  syncStatusBar();
}

// In the Android app, the native status bar sits outside the WebView and
// doesn't pick up CSS — without this its icons stay white-on-white on the
// light theme. Uses the runtime plugin bridge (no bundler needed): it's a
// no-op when running as a plain web page, where Capacitor isn't present.
function syncStatusBar() {
  const StatusBar = window.Capacitor?.Plugins?.StatusBar;
  if (!StatusBar) return;
  const light = settings.mode !== "dark";
  StatusBar.setStyle({ style: light ? "DARK" : "LIGHT" }).catch(() => {});
  StatusBar.setBackgroundColor({ color: light ? "#ffffff" : "#131120" }).catch(() => {});
}

// ───────────────────────── accessors ─────────────────────────
const imported = () => lib.playlists.find((p) => p.id === SYS) || { trackIds: [] };
const allTracks = () => imported().trackIds.map((id) => lib.tracks[id]).filter(Boolean);
const recentTracks = (n = 20) =>
  Object.values(lib.tracks)
    .filter((t) => t.lastPlayedAt > 0)
    .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
    .slice(0, n);
const playlist = (id) => lib.playlists.find((p) => p.id === id);
const playlistTracks = (id) => {
  const p = playlist(id);
  return p ? p.trackIds.map((i) => lib.tracks[i]).filter(Boolean) : [];
};
function searchResults() {
  const q = searchQ.trim().toLowerCase();
  if (!q) return [];
  return allTracks().filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.album || "").toLowerCase().includes(q),
  );
}
function queueFor(ctx) {
  if (ctx === "all") return allTracks();
  if (ctx === "recent") return recentTracks();
  if (ctx === "search") return searchResults();
  if (ctx && ctx.startsWith("pl:")) return playlistTracks(ctx.slice(3));
  return null;
}

// ───────────────────────── audio engine ─────────────────────────
async function play(track, queue, index) {
  if (!track) return;
  const blob = await getAudio(track.id);
  if (!blob) {
    toast("Audio not available");
    return;
  }
  if (curURL) URL.revokeObjectURL(curURL);
  curURL = URL.createObjectURL(blob);
  audio.src = curURL;
  pb.current = track;
  if (queue) {
    pb.queue = queue;
    pb.qi = index != null ? index : 0;
  }
  markPlayed(track.id);
  try {
    await audio.play();
  } catch (e) {
    console.warn("play():", e);
  }
  updateMediaSession(track);
  savePB();
  renderMini();
  renderPlayer();
  refreshActive();
}

function togglePlay() {
  if (!pb.current) return;
  if (!audio.src) {
    // restored session: no source loaded yet → start playback
    play(pb.current, pb.queue.length ? pb.queue : [pb.current], pb.qi >= 0 ? pb.qi : 0);
    return;
  }
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
}
function resume() {
  if (audio.src) audio.play().catch(() => {});
  else togglePlay();
}
function pause() {
  audio.pause();
}
function nextIndex() {
  const { queue, qi, repeat, shuffle } = pb;
  if (!queue.length) return -1;
  if (repeat === "one") return qi;
  if (shuffle) return queue.length > 1 ? randOther(qi, queue.length) : qi;
  const n = qi + 1;
  if (n >= queue.length) return repeat === "all" ? 0 : -1;
  return n;
}
function randOther(cur, len) {
  let n = cur;
  while (n === cur) n = Math.floor(Math.random() * len);
  return n;
}
function next() {
  const i = nextIndex();
  if (i >= 0 && pb.queue[i]) play(pb.queue[i], pb.queue, i);
}
function prev() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  const i = pb.qi - 1;
  if (i >= 0 && pb.queue[i]) play(pb.queue[i], pb.queue, i);
  else audio.currentTime = 0;
}
function seekTo(sec) {
  if (isFinite(sec)) audio.currentTime = Math.max(0, sec);
}
function onEnded() {
  const i = nextIndex();
  if (i >= 0 && pb.queue[i]) play(pb.queue[i], pb.queue, i);
}
function markPlayed(id) {
  if (lib.tracks[id]) {
    lib.tracks[id].lastPlayedAt = Date.now();
    saveLib();
  }
}

// Fallback cover art: a canvas-rendered PNG (a tile with the initial over an
// accent gradient). Android needs a real BITMAP for the media notification;
// an SVG isn't always accepted. Cached by initial+accent.
const _fbArt = {};
function fallbackArtURL(track) {
  const letter = (track.title && track.title[0] ? track.title[0] : "♪").toUpperCase();
  const key = letter + "|" + accent().hex;
  if (_fbArt[key]) return _fbArt[key];
  try {
    const s = 512;
    const c = document.createElement("canvas");
    c.width = s;
    c.height = s;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, accent().hex);
    g.addColorStop(1, "#0f0f18");
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    x.fillStyle = "rgba(255,255,255,.92)";
    x.font = "900 268px system-ui, -apple-system, Roboto, sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(letter, s / 2, s / 2 + 24);
    const url = c.toDataURL("image/png");
    _fbArt[key] = url;
    return url;
  } catch {
    return null;
  }
}

// Set the action handlers ONCE (always present so the notification stays
// interactive even if the first setMetadata call fails).
let _handlersSet = false;
function ensureHandlers() {
  if (_handlersSet || !("mediaSession" in navigator)) return;
  const ms = navigator.mediaSession;
  const h = (a, f) => {
    try {
      ms.setActionHandler(a, f);
    } catch {}
  };
  h("play", resume);
  h("pause", pause);
  h("previoustrack", prev);
  h("nexttrack", next);
  h("stop", pause);
  h("seekto", (d) => {
    if (d.seekTime != null) seekTo(d.seekTime);
  });
  h("seekbackward", (d) => seekTo(audio.currentTime - (d.seekOffset || 10)));
  h("seekforward", (d) => seekTo(audio.currentTime + (d.seekOffset || 10)));
  _handlersSet = true;
}

function updateMediaSession(track) {
  if (!("mediaSession" in navigator)) return;
  const ms = navigator.mediaSession;
  ensureHandlers();
  // src: real cover art (blob) or raster fallback. No `type` (optional): a
  // type that doesn't match the blob can make Chrome discard the image.
  const artUrl = artURLs[track.id] || fallbackArtURL(track);
  const artwork = artUrl
    ? [
        { src: artUrl, sizes: "512x512" },
        { src: artUrl, sizes: "256x256" },
        { src: artUrl, sizes: "96x96" },
      ]
    : [];
  let meta = null;
  try {
    meta = new MediaMetadata({
      title: track.title || "Untitled",
      artist: track.artist || "Unknown",
      album: track.album || "",
      artwork,
    });
  } catch (e) {
    // retry without artwork in case the image upsets the constructor
    try {
      meta = new MediaMetadata({
        title: track.title || "Untitled",
        artist: track.artist || "Unknown",
        album: track.album || "",
      });
    } catch {}
  }
  if (meta) ms.metadata = meta;
  ms.playbackState = audio.paused ? "paused" : "playing";
}

// <audio> events
audio.addEventListener("play", () => {
  pb.playing = true;
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
  updatePlayUI();
});
audio.addEventListener("pause", () => {
  pb.playing = false;
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
  updatePlayUI();
});
audio.addEventListener("ended", onEnded);
audio.addEventListener("timeupdate", () => {
  if ("mediaSession" in navigator && audio.duration && isFinite(audio.duration)) {
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(audio.currentTime, audio.duration),
      });
    } catch {}
  }
  updateProgressUI();
});
audio.addEventListener("loadedmetadata", () => {
  // capture the real duration if the track didn't have one yet
  if (pb.current && (!pb.current.duration || pb.current.duration === 0) && isFinite(audio.duration)) {
    pb.current.duration = Math.round(audio.duration * 1000);
    saveLib();
  }
  updateProgressUI();
});

// ───────────────────────── import ─────────────────────────
async function importFiles(files) {
  if (!files || !files.length) return;
  toast("Importing…");
  let added = 0;
  for (const file of files) {
    const id = "imp-" + hash(file.name + "|" + file.size + "|" + (file.lastModified || 0));
    if (lib.tracks[id]) continue;
    let meta = {};
    try {
      meta = await readMeta(file);
    } catch {}
    try {
      await putAudio(id, file);
    } catch (e) {
      console.warn("putAudio:", e);
      toast("Not enough storage space");
      continue;
    }
    let hasArt = false;
    if (meta.artBlob) {
      try {
        await putArt(id, meta.artBlob);
        artURLs[id] = URL.createObjectURL(meta.artBlob);
        hasArt = true;
      } catch {}
    }
    const fname = file.name.replace(/\.[^.]+$/, "").replace(/_/g, " ").trim();
    lib.tracks[id] = {
      id,
      title: meta.title || fname || "Audio",
      artist: meta.artist || "Unknown",
      album: meta.album || "",
      duration: 0,
      hasArt,
      lastPlayedAt: 0,
    };
    if (!imported().trackIds.includes(id)) imported().trackIds.push(id);
    added++;
  }
  saveLib();
  render();
  toast(added ? `${added} song${added > 1 ? "s" : ""} added` : "Already imported");
  computeDurations();
}

async function computeDurations() {
  const pending = Object.values(lib.tracks).filter((t) => !t.duration);
  for (const t of pending) {
    try {
      const blob = await getAudio(t.id);
      if (!blob) continue;
      const url = URL.createObjectURL(blob);
      const d = await durationOf(url);
      URL.revokeObjectURL(url);
      if (d > 0) t.duration = Math.round(d * 1000);
    } catch {}
  }
  saveLib();
  render();
}
function durationOf(url) {
  return new Promise((res) => {
    const a = new Audio();
    a.preload = "metadata";
    let done = false;
    const fin = (v) => {
      if (done) return;
      done = true;
      a.src = "";
      res(v);
    };
    a.addEventListener("loadedmetadata", () => fin(isFinite(a.duration) ? a.duration : 0));
    a.addEventListener("error", () => fin(0));
    a.src = url;
    setTimeout(() => fin(isFinite(a.duration) ? a.duration : 0), 8000);
  });
}

async function warmArt() {
  const ids = Object.keys(lib.tracks).filter((id) => lib.tracks[id].hasArt && !artURLs[id]);
  if (!ids.length) return;
  for (const id of ids) {
    try {
      const b = await getArt(id);
      if (b) artURLs[id] = URL.createObjectURL(b);
    } catch {}
  }
  render();
}

// ───────────────────────── backup / restore ─────────────────────────
// A single portable ".snora" file: a JSON header (library + an index of the
// embedded blobs) followed by the audio/art bytes back-to-back. This avoids
// pulling in a zip library while still producing one file the OS "Save As"
// dialog can put anywhere a document provider can reach — including a
// USB-C drive, if the device/file manager exposes it as one.
const BACKUP_MAGIC = "SNRA1";

async function exportBackup() {
  const trackIds = Object.keys(lib.tracks);
  if (!trackIds.length) {
    toast("No songs to back up");
    return;
  }
  toast("Preparing backup…");
  const entries = [];
  const parts = [];
  let offset = 0;
  for (const id of trackIds) {
    const blob = await getAudio(id);
    if (!blob) continue;
    entries.push({ id, kind: "audio", mime: blob.type || "application/octet-stream", offset, length: blob.size });
    parts.push(blob);
    offset += blob.size;
    if (lib.tracks[id].hasArt) {
      const art = await getArt(id);
      if (art) {
        entries.push({ id, kind: "art", mime: art.type || "image/jpeg", offset, length: art.size });
        parts.push(art);
        offset += art.size;
      }
    }
  }
  const header = { createdAt: Date.now(), tracks: lib.tracks, playlists: lib.playlists, entries };
  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const lenBuf = new Uint8Array(4);
  new DataView(lenBuf.buffer).setUint32(0, headerBytes.byteLength, true);
  const magicBytes = new TextEncoder().encode(BACKUP_MAGIC);
  const backupBlob = new Blob([magicBytes, lenBuf, headerBytes, ...parts], { type: "application/octet-stream" });
  const filename = `sonora-backup-${new Date().toISOString().slice(0, 10)}.snora`;

  // File System Access API opens the native "Save As" dialog, letting the
  // user pick any destination a document provider exposes — a USB-C drive
  // included. Falls back to a plain download where it isn't supported.
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "Sonora backup", accept: { "application/octet-stream": [".snora"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(backupBlob);
      await writable.close();
      toast("Backup saved");
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
      console.warn("showSaveFilePicker:", e);
    }
  }
  const url = URL.createObjectURL(backupBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast("Backup downloaded");
}

async function pickRestoreFile() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: "Sonora backup", accept: { "application/octet-stream": [".snora"] } }],
      });
      restoreBackupFile(await handle.getFile());
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
      console.warn("showOpenFilePicker:", e);
    }
  }
  $("#backupPick").click();
}

async function restoreBackupFile(file) {
  if (!file) return;
  toast("Restoring…");
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const magicLen = BACKUP_MAGIC.length;
    if (new TextDecoder().decode(buf.subarray(0, magicLen)) !== BACKUP_MAGIC) {
      toast("Not a Sonora backup file");
      return;
    }
    let p = magicLen;
    const headerLen = new DataView(buf.buffer, buf.byteOffset + p, 4).getUint32(0, true);
    p += 4;
    const header = JSON.parse(new TextDecoder().decode(buf.subarray(p, p + headerLen)));
    const dataStart = p + headerLen;

    for (const e of header.entries || []) {
      const bytes = buf.subarray(dataStart + e.offset, dataStart + e.offset + e.length);
      const blob = new Blob([bytes], { type: e.mime });
      if (e.kind === "audio") await putAudio(e.id, blob);
      else if (e.kind === "art") await putArt(e.id, blob);
    }

    let added = 0;
    for (const [id, t] of Object.entries(header.tracks || {})) {
      if (!lib.tracks[id]) {
        lib.tracks[id] = t;
        added++;
      }
    }
    for (const p2 of header.playlists || []) {
      if (p2.system) continue; // never duplicate the built-in "Imported songs" playlist
      if (!lib.playlists.find((x) => x.id === p2.id)) lib.playlists.push(p2);
    }
    const sys = imported();
    for (const id of Object.keys(header.tracks || {})) {
      if (!sys.trackIds.includes(id)) sys.trackIds.push(id);
    }

    saveLib();
    render();
    warmArt();
    toast(added ? `${added} song(s) restored` : "Backup already up to date");
  } catch (e) {
    console.warn("restoreBackupFile:", e);
    toast("Couldn't read that backup file");
  }
}

function removeTrack(id) {
  delete lib.tracks[id];
  for (const p of lib.playlists) p.trackIds = p.trackIds.filter((t) => t !== id);
  if (artURLs[id]) {
    URL.revokeObjectURL(artURLs[id]);
    delete artURLs[id];
  }
  delTrack(id).catch(() => {});
  if (pb.current && pb.current.id === id) {
    audio.pause();
    pb.current = null;
    if (curURL) {
      URL.revokeObjectURL(curURL);
      curURL = null;
    }
    audio.removeAttribute("src");
    audio.load();
  }
  saveLib();
  savePB();
  render();
}

// ───────────────────────── render: UI helpers ─────────────────────────
function artHTML(track, cls = "") {
  const u = artURLs[track.id];
  return `<div class="art ${cls}">${u ? `<img src="${u}" alt="">` : ic("music")}</div>`;
}
function rowHTML(track, ctx, idx, opts = {}) {
  const active = pb.current && pb.current.id === track.id;
  const num = opts.showIndex ? `<span class="row-idx">${idx + 1}</span>` : "";
  // ⋮ opens the menu (add to playlist / remove from this playlist / delete).
  const more = `<button class="row-btn" data-act="rowmore" data-id="${track.id}"${
    opts.plId ? ` data-pl="${opts.plId}"` : ""
  }>${ic("more")}</button>`;
  return `<div class="row">
    <button class="row" style="padding:0;flex:1;gap:12px" data-act="play" data-id="${track.id}" data-ctx="${ctx}">
      ${num}${artHTML(track)}
      <span class="row-main">
        <span class="row-t ${active ? "active" : ""}">${esc(track.title)}</span>
        <span class="row-a">${esc(track.artist)}</span>
      </span>
    </button>
    ${more}
  </div>`;
}

// ───────────────────────── render: views ─────────────────────────
function greet() {
  const h = new Date().getHours();
  if (h < 6) return "Good night";
  if (h < 13) return "Good morning";
  if (h < 20) return "Good afternoon";
  return "Good night";
}

function viewHome() {
  const tracks = allTracks();
  let html = `<h1 class="h-greet">${greet()}</h1>`;

  if (!tracks.length) {
    html += `<section class="sec"><div class="sec-head">${ic("music")}<span class="sec-title">Music</span></div>
      <button class="card-cta" data-act="import">
        <span class="cta-ic">${ic("folder")}</span>
        <span><span class="cta-t">Import your first song</span>
        <span class="cta-d">MP3, FLAC, WAV, M4A, OGG…</span></span></button>
      </section><div class="pad-bottom"></div>`;
    return html;
  }

  // Quick access: playlists as glass tiles in a 2-column grid.
  html += `<div class="quick-grid">`;
  html += lib.playlists
    .map(
      (p) => `<button class="quick-tile" data-act="openpl" data-id="${p.id}">
        <span class="quick-ic ${p.system ? "sys" : ""}">${ic(p.system ? "music" : "list")}</span>
        <span class="quick-t">${esc(p.name)}</span>
      </button>`,
    )
    .join("");
  html += `</div>`;

  // Horizontal carousel: "Recently played" (or all your music if nothing has
  // been played yet), with square glass cards.
  const recent = recentTracks(12);
  const cx = recent.length ? recent : allTracks().slice(0, 12);
  const cxCtx = recent.length ? "recent" : "all";
  html += `<h2 class="sec-title2">${recent.length ? "Recently played" : "Your music"}</h2>`;
  html += `<div class="carousel">`;
  html += cx
    .map((t) => {
      const u = artURLs[t.id];
      return `<button class="cx-card" data-act="play" data-id="${t.id}" data-ctx="${cxCtx}">
        <span class="cx-art">${u ? `<img src="${u}" alt="">` : ic("music")}</span>
        <span class="cx-t">${esc(t.title)}</span>
        <span class="cx-a">${esc(t.artist)}</span>
      </button>`;
    })
    .join("");
  html += `</div>`;

  html += `<button class="btn-wide" data-act="goto" data-view="library">See your whole library · ${tracks.length} song${tracks.length === 1 ? "" : "s"}</button>`;
  html += `<button class="btn-wide" data-act="import">Import more songs</button>`;
  html += `<div class="pad-bottom"></div>`;
  return html;
}

function searchResultsHTML() {
  const res = searchResults();
  if (!searchQ.trim())
    return `<p class="dim" style="padding-top:6px">Search your library by title, artist, or album.</p>`;
  if (!res.length) return `<div class="empty-mid">No results for “${esc(searchQ)}”.</div>`;
  return res.map((t) => rowHTML(t, "search")).join("");
}
function viewSearch() {
  // The sticky search bar keeps its own results container so it can update
  // without rebuilding the input (this preserves focus and cursor position).
  return `<h1 class="h-greet">Search</h1>
    <div class="search-wrap"><input id="searchIn" class="search-in" placeholder="What do you want to listen to?" value="${esc(searchQ)}"></div>
    <div id="searchResults">${searchResultsHTML()}</div>
    <div class="pad-bottom"></div>`;
}

function viewLibrary() {
  if (plOpen) return viewPlaylistDetail(plOpen);
  // The library is just the list of playlists; "Imported songs" (the system
  // playlist) comes first and groups everything imported. Tapping a playlist
  // opens its detail view. The header has a "+" button that opens the menu
  // (Import songs / New playlist).
  let html = `<div class="lib-head">
    <h1 class="h-greet">Your library</h1>
    <button class="icon-btn" data-act="libadd" aria-label="Add">${ic("plus")}</button>
  </div>`;
  html += `<div class="chips"><span class="chip on">Playlists</span></div>`;
  html += lib.playlists
    .map((p) => {
      const n = p.trackIds.length;
      return `<button class="pl-row" data-act="openpl" data-id="${p.id}">
        <span class="pl-ic ${p.system ? "sys" : ""}">${ic(p.system ? "music" : "list")}</span>
        <span class="row-main">
          <span class="pl-t">${esc(p.name)}</span>
          <span class="pl-c">Playlist · ${n} song${n === 1 ? "" : "s"}</span>
        </span>
      </button>`;
    })
    .join("");
  html += `<div class="pad-bottom"></div>`;
  return html;
}

function viewPlaylistDetail(id) {
  const p = playlist(id);
  if (!p) {
    plOpen = null;
    return viewLibrary();
  }
  const tracks = playlistTracks(id);
  const n = tracks.length;
  // Compact header: no cover art, just back / title / count, with the
  // controls (shuffle + accent play) on the right.
  let html = `<div class="detail-hero">
    <button class="icon-btn detail-back" data-act="backlib" aria-label="Back">${ic("back")}</button>
    <h1 class="detail-title">${esc(p.name)}</h1>
    <p class="detail-sub">${n} song${n === 1 ? "" : "s"}</p>
  </div>`;
  if (n) {
    html += `<div class="detail-actions">
      <button class="det-shuffle ${pb.shuffle ? "on-accent" : ""}" data-act="shuffle" aria-label="Shuffle">${ic("shuffle")}</button>
      <button class="fab-play" data-act="playall" data-id="${id}" aria-label="Play">${ic("play")}</button>
    </div>`;
  }
  // "Add to this playlist" row. In the system playlist, "add" means importing
  // files; in your own playlists, it means picking from the library.
  html += `<button class="add-row" data-act="${p.system ? "import" : "addto"}" data-id="${id}">
    <span class="add-row-ic">${ic("plus")}</span>
    <span class="pl-t">${p.system ? "Add songs" : "Add to this playlist"}</span>
  </button>`;
  if (n) {
    html += tracks.map((t, i) => rowHTML(t, "pl:" + id, i, { inPlaylist: !p.system, plId: id })).join("");
  } else {
    html += `<div class="empty-mid">Empty playlist.<br>Use “Add to this playlist”.</div>`;
  }
  if (!p.system) {
    html += `<button class="btn-wide danger" data-act="delpl" data-id="${id}" style="margin-top:20px">Delete playlist</button>`;
  }
  html += `<div class="pad-bottom"></div>`;
  return html;
}

function viewSettings() {
  const est = window.__est || { usage: 0, quota: 0 };
  const mb = (b) => (b / 1048576).toFixed(b > 1073741824 ? 0 : 1);
  let html = `<h1 class="h-greet">Settings</h1>`;

  html += `<div class="set-grp"><p class="sub">Theme</p><div class="chips">
    <button class="chip ${settings.mode === "light" ? "on" : ""}" data-act="mode" data-m="light">Light</button>
    <button class="chip ${settings.mode === "dark" ? "on" : ""}" data-act="mode" data-m="dark">Dark</button>
  </div></div>`;

  html += `<div class="set-grp"><p class="sub">Accent color</p><div class="swatches">`;
  html += ACCENTS.map(
    (a, i) => `<button class="sw ${i === settings.accentIdx ? "on" : ""}" data-act="accent" data-i="${i}" style="background:${a.hex}"></button>`,
  ).join("");
  html += `</div></div>`;

  if (settings.mode === "dark") {
    html += `<div class="set-grp"><p class="sub">Background</p><div class="swatches">`;
    html += BACKGROUNDS.map(
      (b, i) =>
        `<button class="sw ${i === settings.bgIdx ? "on" : ""}" data-act="bg" data-i="${i}" style="background:linear-gradient(135deg,${b.a},${b.b})"></button>`,
    ).join("");
    html += `</div></div>`;
  }

  html += `<div class="set-grp"><p class="sub">Library</p>
    <div class="set-line"><span class="lbl">Songs</span><span class="val">${allTracks().length}</span></div>
    <div class="set-line"><span class="lbl">Playlists</span><span class="val">${lib.playlists.length}</span></div>
    <div class="set-line"><span class="lbl">Storage used</span><span class="val">${est.usage ? mb(est.usage) + " MB" : "—"}</span></div>
    <button class="btn-wide" data-act="import" style="margin-top:14px">+ Import songs</button>
  </div>`;

  html += `<div class="set-grp"><p class="sub">Backup</p>
    <p class="dim" style="line-height:1.5">Save your whole library — songs, cover art, and
    playlists — as one file. Pick a USB-C drive as the destination if your browser's save
    dialog offers it, to keep an offline copy off the device.</p>
    <button class="btn-wide" data-act="export-backup" style="margin-top:10px">Export library backup</button>
    <button class="btn-wide" data-act="restore-backup" style="margin-top:10px">Restore from backup</button>
  </div>`;

  html += `<div class="set-grp"><p class="sub">Background playback</p>
    <p class="dim" style="line-height:1.5">Audio keeps playing with the screen off or the browser in the background,
    with controls on the lock screen. Install Sonora (browser menu → “Add to Home screen”)
    for the best experience.</p></div>`;

  html += `<div class="set-grp"><p class="sub">About</p>
    <p class="dim">Sonora · offline player · everything stays on your device. No accounts, no servers.</p></div>`;
  html += `<div class="pad-bottom"></div>`;
  return html;
}

function renderView() {
  let html = "";
  if (view === "home") html = viewHome();
  else if (view === "search") html = viewSearch();
  else if (view === "library") html = viewLibrary();
  else if (view === "settings") html = viewSettings();
  elView.innerHTML = html;
  if (view === "search") {
    const inp = $("#searchIn");
    if (inp) {
      // Only updates the results container → the input never gets rebuilt,
      // so it keeps focus and cursor position.
      inp.addEventListener("input", (e) => {
        searchQ = e.target.value;
        const rc = $("#searchResults");
        if (rc) rc.innerHTML = searchResultsHTML();
      });
    }
  }
}

function renderNav() {
  const items = [
    ["home", "Home"],
    ["search", "Search"],
    ["library", "Library"],
    ["settings", "Settings"],
  ];
  elNav.innerHTML = items
    .map(
      ([v, label]) =>
        `<button data-act="nav" data-view="${v}" class="${view === v ? "on" : ""}">${ic(v)}<span>${label}</span></button>`,
    )
    .join("");
}

function renderMini() {
  if (!pb.current) {
    elMini.classList.remove("show");
    elMini.innerHTML = "";
    return;
  }
  const t = pb.current;
  const u = artURLs[t.id];
  const prog = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
  elMini.classList.add("show");
  elMini.innerHTML = `
    <div class="mini-row">
      <button class="mini-art" data-act="openplayer">${u ? `<img src="${u}">` : ic("music")}</button>
      <button class="mini-info" data-act="openplayer" style="text-align:left">
        <div class="mini-t">${esc(t.title)}</div>
        <div class="mini-a">${esc(t.artist)}</div>
      </button>
      <button class="mini-btn" data-act="toggle">${ic(pb.playing ? "pause" : "play")}</button>
      <button class="mini-btn" data-act="next">${ic("next")}</button>
    </div>
    <div class="mini-prog"><i style="width:${prog}%"></i></div>`;
}

function renderPlayer() {
  const t = pb.current;
  if (!t) {
    elPlayer.innerHTML = "";
    return;
  }
  const u = artURLs[t.id];
  const repeatOn = pb.repeat !== "off";
  elPlayer.innerHTML = `
    <div class="pl-head">
      <button data-act="closeplayer" class="row-btn">${ic("down")}</button>
      <div class="lbl">NOW PLAYING<b>${esc(t.album || "Library")}</b></div>
      <button data-act="moreplayer" class="row-btn">${ic("more")}</button>
    </div>
    <div class="pl-art-wrap"><div class="pl-art">${
      u ? `<img src="${u}">` : `<span class="big">${esc((t.title[0] || "♪").toUpperCase())}</span>`
    }</div></div>
    <div class="pl-meta">
      <div class="m"><div class="pl-song">${esc(t.title)}</div><div class="pl-artist">${esc(t.artist)}</div></div>
      <button class="row-btn on-accent" data-act="add" data-id="${t.id}">${ic("plus")}</button>
    </div>
    <input id="seek" class="pl-seek" type="range" min="0" max="1000" value="0">
    <div class="pl-time"><span id="tCur">0:00</span><span id="tDur">${fmt(t.duration)}</span></div>
    <div class="pl-ctrls">
      <button data-act="shuffle" class="${pb.shuffle ? "on-accent" : "sm"}">${ic("shuffle")}</button>
      <button data-act="prev" class="sm">${ic("prev")}</button>
      <button data-act="toggle" class="pl-play" id="bigPlay">${ic(pb.playing ? "pause" : "play")}</button>
      <button data-act="next" class="sm">${ic("next")}</button>
      <button data-act="repeat" class="${repeatOn ? "on-accent" : "sm"}" style="position:relative">${ic("repeat")}${
        pb.repeat === "one" ? '<span style="position:absolute;top:-2px;right:-2px;font-size:9px;font-weight:900">1</span>' : ""
      }</button>
    </div>
    <div class="pl-foot">
      <button class="pl-foot-btn" data-act="queue">${ic("list")}<span>Queue</span></button>
    </div>`;
  const seek = $("#seek");
  if (seek) {
    // initial fill (played portion) based on the current position
    const dur0 = audio.duration || (t.duration ? t.duration / 1000 : 0);
    const r0 = dur0 ? Math.max(0, Math.min(1, audio.currentTime / dur0)) : 0;
    seek.value = String(Math.round(r0 * 1000));
    seek.style.setProperty("--seek", (r0 * 100).toFixed(2) + "%");
    seek.addEventListener("input", () => {
      seeking = true;
      const dur = audio.duration || (t.duration ? t.duration / 1000 : 0);
      $("#tCur").textContent = fmt((seek.value / 1000) * dur * 1000);
      seek.style.setProperty("--seek", (seek.value / 10).toFixed(2) + "%"); // 0..1000 → %
    });
    const commit = () => {
      const dur = audio.duration || (t.duration ? t.duration / 1000 : 0);
      seekTo((seek.value / 1000) * dur);
      setTimeout(() => (seeking = false), 180);
    };
    seek.addEventListener("change", commit);
    seek.addEventListener("pointerup", commit);
  }
  updateProgressUI();
}

// lightweight per-tick updates (no full re-render)
function updateProgressUI() {
  const mini = elMini.querySelector(".mini-prog > i");
  const dur = audio.duration && isFinite(audio.duration) ? audio.duration : pb.current ? pb.current.duration / 1000 : 0;
  const ratio = dur ? audio.currentTime / dur : 0;
  if (mini) mini.style.width = ratio * 100 + "%";
  if (elPlayer.classList.contains("open") && !seeking) {
    const seek = $("#seek");
    if (seek) {
      seek.value = String(Math.round(ratio * 1000));
      seek.style.setProperty("--seek", (ratio * 100).toFixed(2) + "%");
    }
    const c = $("#tCur");
    if (c) c.textContent = fmt(audio.currentTime * 1000);
    const d = $("#tDur");
    if (d && dur) d.textContent = fmt(dur * 1000);
  }
}
function updatePlayUI() {
  const mb = elMini.querySelector('[data-act="toggle"]');
  if (mb) mb.innerHTML = ic(pb.playing ? "pause" : "play");
  const bp = $("#bigPlay");
  if (bp) bp.innerHTML = ic(pb.playing ? "pause" : "play");
}
function refreshActive() {
  // re-render the view to mark the active track, preserving scroll position.
  const st = elView.scrollTop;
  renderView();
  renderNav();
  elView.scrollTop = st;
}

function render() {
  applyTheme();
  renderNav();
  renderView();
  renderMini();
  renderPlayer();
}

// ───────────────────────── player open/close + back button ─────────────────────────
function openPlayer() {
  if (!pb.current) return;
  renderPlayer();
  elPlayer.classList.add("open");
}
function closePlayer() {
  elPlayer.classList.remove("open");
}
function openModal(html) {
  elModal.innerHTML = `<div class="sheet"><div class="grab"></div>${html}</div>`;
  elModal.classList.add("show");
}
function closeModal() {
  elModal.classList.remove("show");
  elModal.innerHTML = "";
}
// dismiss the sheet via a user action (readable alias)
const dismissModal = closeModal;

// Android back button: must NEVER close the PWA by accident. We always keep
// a history "guard"; each Back press closes whatever is on top, in order
// (modal → player → playlist detail → back to Home) and re-arms the guard.
// On Home, Back does nothing (avoids the accidental exit users hit); the app
// is exited via the system Home button/gesture instead.
function handleBack() {
  if (elModal.classList.contains("show")) return closeModal();
  if (elPlayer.classList.contains("open")) return closePlayer();
  if (plOpen) {
    plOpen = null;
    return renderView();
  }
  if (view !== "home") {
    view = "home";
    plOpen = null;
    renderNav();
    renderView();
  }
}
window.addEventListener("popstate", () => {
  handleBack();
  history.pushState(null, ""); // re-arm the guard for the next Back press
});

// add-to-playlist sheet
function openAddSheet(trackId) {
  const t = lib.tracks[trackId];
  if (!t) return;
  const pls = lib.playlists.filter((p) => !p.system);
  let html = `<h3>Add to playlist</h3>
    <div class="mk-pl"><input id="newPlName" placeholder="New playlist…"><button data-act="mkpl" data-id="${trackId}">Create</button></div>`;
  if (!pls.length) html += `<p class="dim">You don't have any playlists yet.</p>`;
  else
    html += pls
      .map((p) => {
        const has = p.trackIds.includes(trackId);
        return `<button class="opt" data-act="togglepl" data-pl="${p.id}" data-id="${trackId}">
          <span class="pl-ic" style="width:38px;height:38px">${ic("list")}</span>
          <span class="pl-t">${esc(p.name)}</span>
          <span class="chk">${has ? ic("check") : ""}</span></button>`;
      })
      .join("");
  openModal(html);
  const inp = $("#newPlName");
  if (inp) inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doCreatePlaylist(inp.value, trackId);
    }
  });
}
function libAddSheet() {
  // The library "+" button menu: import songs or create a new playlist.
  openModal(`<h3>Add to your library</h3>
    <button class="opt" data-act="import">${ic("music")}<span class="pl-t">Import songs</span></button>
    <button class="opt" data-act="newpl">${ic("list")}<span class="pl-t">New playlist</span></button>`);
}
function trackMoreSheet(id, plId) {
  const t = lib.tracks[id];
  if (!t) return;
  const p = plId ? playlist(plId) : null;
  const removeOpt =
    p && !p.system
      ? `<button class="opt" data-act="rmfrom" data-id="${id}" data-pl="${plId}">${ic("x")}<span class="pl-t">Remove from this playlist</span></button>`
      : "";
  openModal(`<h3>${esc(t.title)}</h3>
    <button class="opt" data-act="add" data-id="${id}">${ic("plus")}<span class="pl-t">Add to playlist</span></button>
    ${removeOpt}
    <button class="opt danger" data-act="del" data-id="${id}">${ic("trash")}<span class="pl-t" style="color:#ff6b6b">Delete from library</span></button>`);
}
// Playback queue sheet (up-next): actual data from pb.queue.
function openQueueSheet() {
  if (!pb.queue.length) {
    toast("Queue is empty");
    return;
  }
  let html = `<h3>Playback queue</h3>`;
  html += pb.queue
    .map((t, i) => {
      const cur = i === pb.qi;
      return `<button class="opt" data-act="jump" data-i="${i}">
        ${artHTML(t)}
        <span class="row-main"><span class="pl-t" style="${cur ? "color:var(--accent)" : ""}">${esc(t.title)}</span><span class="pl-c">${esc(t.artist)}</span></span>
        ${cur ? `<span class="chk">${ic("play")}</span>` : ""}</button>`;
    })
    .join("");
  openModal(html);
}
// "Add to this playlist" sheet: lists your library with checkmarks.
function openAddTracksSheet(plId) {
  const p = playlist(plId);
  if (!p) return;
  const all = allTracks();
  let html = `<h3>Add to ${esc(p.name)}</h3>`;
  if (!all.length) html += `<p class="dim">You haven't imported any songs yet.</p>`;
  else
    html += all
      .map((t) => {
        const has = p.trackIds.includes(t.id);
        return `<button class="opt" data-act="toggletrackpl" data-pl="${plId}" data-id="${t.id}">
          ${artHTML(t)}
          <span class="row-main"><span class="pl-t">${esc(t.title)}</span><span class="pl-c">${esc(t.artist)}</span></span>
          <span class="chk">${has ? ic("check") : ""}</span></button>`;
      })
      .join("");
  openModal(html);
}

function doCreatePlaylist(name, addId) {
  const nm = (name || "").trim();
  const p = {
    id: "pl_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: nm || "New playlist",
    system: false,
    trackIds: addId ? [addId] : [],
    createdAt: Date.now(),
  };
  lib.playlists.push(p);
  saveLib();
  render();
  dismissModal();
  if (addId) toast("Added to " + p.name);
}

// ───────────────────────── events (delegation) ─────────────────────────
document.addEventListener("click", (e) => {
  if (miniSwiped) return; // was a swipe on the mini-player, not a tap
  const el = e.target.closest("[data-act]");
  if (!el) {
    if (e.target === elModal) dismissModal();
    return;
  }
  const a = el.dataset.act;
  const id = el.dataset.id;
  switch (a) {
    case "nav":
      navTo(el.dataset.view);
      break;
    case "goto":
      navTo(el.dataset.view);
      break;
    case "libadd":
      libAddSheet();
      break;
    case "import":
      $("#filepick").click();
      // if opened from the library "+" menu, close the sheet
      if (elModal.classList.contains("show")) dismissModal();
      break;
    case "play": {
      const q = queueFor(el.dataset.ctx);
      const t = lib.tracks[id];
      if (t) {
        const idx = q ? q.findIndex((x) => x.id === id) : 0;
        play(t, q || [t], idx < 0 ? 0 : idx);
      }
      break;
    }
    case "playall": {
      const q = playlistTracks(id);
      if (q.length) {
        const start = pb.shuffle ? Math.floor(Math.random() * q.length) : 0;
        play(q[start], q, start);
      }
      break;
    }
    case "toggle":
      togglePlay();
      break;
    case "next":
      next();
      break;
    case "prev":
      prev();
      break;
    case "shuffle":
      pb.shuffle = !pb.shuffle;
      savePB();
      renderPlayer();
      if (view === "library" && plOpen) renderView(); // refresh the button in detail view
      break;
    case "repeat":
      pb.repeat = pb.repeat === "off" ? "all" : pb.repeat === "all" ? "one" : "off";
      savePB();
      renderPlayer();
      break;
    case "openplayer":
      openPlayer();
      break;
    case "closeplayer":
      closePlayer();
      break;
    case "moreplayer":
      if (pb.current) trackMoreSheet(pb.current.id);
      break;
    case "openpl":
      plOpen = id;
      view = "library";
      renderNav();
      renderView();
      break;
    case "backlib":
      plOpen = null;
      renderView();
      break;
    case "newpl":
      openModal(`<h3>New playlist</h3><div class="mk-pl"><input id="newPlName" placeholder="Name…"><button data-act="mkpl">Create</button></div>`);
      {
        const inp = $("#newPlName");
        if (inp) {
          inp.focus();
          inp.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              doCreatePlaylist(inp.value);
            }
          });
        }
      }
      break;
    case "mkpl": {
      const inp = $("#newPlName");
      doCreatePlaylist(inp ? inp.value : "", id);
      break;
    }
    case "delpl":
      lib.playlists = lib.playlists.filter((p) => p.id !== id || p.system);
      saveLib();
      plOpen = null;
      renderView();
      toast("Playlist deleted");
      break;
    case "rowmore":
      trackMoreSheet(id, el.dataset.pl);
      break;
    case "queue":
      openQueueSheet();
      break;
    case "jump": {
      const i = +el.dataset.i;
      if (pb.queue[i]) {
        play(pb.queue[i], pb.queue, i);
        dismissModal();
      }
      break;
    }
    case "addto":
      openAddTracksSheet(id);
      break;
    case "add":
      // openModal swaps content if a sheet is already open (without a new
      // history entry), so it's enough to just open it.
      openAddSheet(id);
      break;
    case "togglepl": {
      const p = playlist(el.dataset.pl);
      if (p) {
        if (p.trackIds.includes(id)) p.trackIds = p.trackIds.filter((t) => t !== id);
        else p.trackIds.push(id);
        saveLib();
        openAddSheet(id); // refresh checkmarks
      }
      break;
    }
    case "toggletrackpl": {
      const p = playlist(el.dataset.pl);
      if (p) {
        if (p.trackIds.includes(id)) p.trackIds = p.trackIds.filter((t) => t !== id);
        else p.trackIds.push(id);
        saveLib();
        openAddTracksSheet(el.dataset.pl); // refresh checkmarks
        renderView(); // update the detail view behind the sheet
      }
      break;
    }
    case "rmfrom": {
      const p = playlist(el.dataset.pl);
      if (p) {
        p.trackIds = p.trackIds.filter((t) => t !== id);
        saveLib();
        renderView();
      }
      dismissModal(); // rmfrom now comes from the ⋮ menu
      toast("Removed from playlist");
      break;
    }
    case "del":
      removeTrack(id);
      dismissModal();
      toast("Deleted");
      break;
    case "accent":
      settings.accentIdx = +el.dataset.i;
      saveSet();
      applyTheme();
      render();
      break;
    case "bg":
      settings.bgIdx = +el.dataset.i;
      saveSet();
      applyTheme();
      render();
      break;
    case "mode":
      settings.mode = el.dataset.m;
      saveSet();
      applyTheme();
      render();
      break;
    case "export-backup":
      exportBackup();
      break;
    case "restore-backup":
      pickRestoreFile();
      break;
  }
});

function navTo(v) {
  if (!v) return;
  if (v === "library" && view === "library") plOpen = null;
  view = v;
  if (v !== "library") plOpen = null;
  renderNav();
  renderView();
  if (v === "settings") refreshEstimate();
}

async function refreshEstimate() {
  window.__est = await storageEstimate();
  if (view === "settings") renderView();
}

$("#filepick").addEventListener("change", (e) => {
  const files = Array.from(e.target.files || []);
  e.target.value = "";
  importFiles(files);
});

$("#backupPick").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  restoreBackupFile(file);
});

// Don't pause on page hide: background playback depends on the <audio>
// element staying active. (No visibilitychange handler, on purpose.)

// ───────────────────── mini-player: swipe to dismiss ─────────────────────
// Swipe down or to the left on the mini-player → stops playback and hides it.
function dismissMini() {
  audio.pause();
  if (curURL) {
    URL.revokeObjectURL(curURL);
    curURL = null;
  }
  audio.removeAttribute("src");
  audio.load();
  pb.current = null;
  pb.queue = [];
  pb.qi = -1;
  savePB();
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    } catch {}
  }
  renderMini();
  refreshActive(); // clear the active-track highlight
}
let _mTouch = null;
elMini.addEventListener(
  "touchstart",
  (e) => {
    const t = e.touches[0];
    _mTouch = { x: t.clientX, y: t.clientY };
  },
  { passive: true },
);
elMini.addEventListener(
  "touchend",
  (e) => {
    if (!_mTouch) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - _mTouch.x;
    const dy = t.clientY - _mTouch.y;
    _mTouch = null;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const down = ady > 46 && ady > adx && dy > 0;
    const left = adx > 60 && adx > ady && dx < 0;
    if (down || left) {
      miniSwiped = true;
      setTimeout(() => (miniSwiped = false), 350);
      dismissMini();
    }
  },
  { passive: true },
);

// ───────────────────────── startup ─────────────────────────
loadAll();
applyTheme();
render();
history.pushState(null, ""); // initial guard to catch the Back button
warmArt();
refreshEstimate();
ensureHandlers();
if (pb.current) updateMediaSession(pb.current);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
