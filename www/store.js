// store.js — Sonora offline storage.
//
// PHILOSOPHY: everything lives on the device. Imported audio is stored as a
// raw Blob in IndexedDB (not a volatile file:// URI), so it survives reloads,
// app restarts, and airplane mode. Playing = read the Blob, create an
// objectURL, hand it to the <audio> element. Cover art (ID3/FLAC) lives in
// its own store so it doesn't bloat every list read.
//
// Stores:
//   audio  (key = trackId) -> Blob   (the music file)
//   art    (key = trackId) -> Blob   (the cover art, if any)

const DB_NAME = "sonora";
const DB_VER = 1;

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("audio")) db.createObjectStore("audio");
      if (!db.objectStoreNames.contains("art")) db.createObjectStore("art");
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(store, mode);
        const os = t.objectStore(store);
        let result;
        const r = fn(os);
        if (r !== undefined) {
          r.onsuccess = () => (result = r.result);
        }
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

// ───────── audio ─────────

/** Stores the raw audio Blob for a track. @param {string} id @param {Blob} blob @returns {Promise<void>} */
export const putAudio = (id, blob) => tx("audio", "readwrite", (os) => os.put(blob, id));

/** Reads the raw audio Blob for a track. @param {string} id @returns {Promise<Blob|undefined>} */
export const getAudio = (id) => tx("audio", "readonly", (os) => os.get(id));

/** Deletes the raw audio Blob for a track. @param {string} id @returns {Promise<void>} */
export const delAudio = (id) => tx("audio", "readwrite", (os) => os.delete(id));

// ───────── art ─────────

/** Stores the cover art Blob for a track. @param {string} id @param {Blob} blob @returns {Promise<void>} */
export const putArt = (id, blob) => tx("art", "readwrite", (os) => os.put(blob, id));

/** Reads the cover art Blob for a track. @param {string} id @returns {Promise<Blob|undefined>} */
export const getArt = (id) => tx("art", "readonly", (os) => os.get(id));

/** Deletes the cover art Blob for a track. @param {string} id @returns {Promise<void>} */
export const delArt = (id) => tx("art", "readwrite", (os) => os.delete(id));

// ───────── helpers ─────────

/** Checks whether audio is stored for a track. @param {string} id @returns {Promise<boolean>} */
export async function hasAudio(id) {
  const keys = await tx("audio", "readonly", (os) => os.getAllKeys());
  return (keys || []).includes(id);
}

/** Lists every track id that has stored cover art. @returns {Promise<string[]>} */
export async function allArtKeys() {
  return (await tx("art", "readonly", (os) => os.getAllKeys())) || [];
}

/** Deletes everything associated with a track (audio + cover art). @param {string} id @returns {Promise<void>} */
export async function delTrack(id) {
  await delAudio(id);
  try {
    await delArt(id);
  } catch {}
}

/** Estimates used/available storage, if the browser exposes it. @returns {Promise<{usage: number, quota: number}>} */
export async function storageEstimate() {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const e = await navigator.storage.estimate();
      return { usage: e.usage || 0, quota: e.quota || 0 };
    } catch {}
  }
  return { usage: 0, quota: 0 };
}
