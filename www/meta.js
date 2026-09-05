// meta.js — dependency-free audio metadata reading, 100% client-side.
//
// Supports:
//   • ID3v2.2/2.3/2.4  (MP3)  -> title, artist, album, cover art (APIC)
//   • FLAC Vorbis comments + PICTURE block
// Everything else (M4A/OGG/Opus/WAV) falls back to the file name. Duration is
// NOT parsed here: the <audio> element provides it on load (loadedmetadata),
// which is reliable across every format.

const dec = (label) => new TextDecoder(label);

/**
 * Reads metadata from a File/Blob.
 * @param {File|Blob} file
 * @returns {Promise<{title?: string, artist?: string, album?: string, artBlob?: Blob}>}
 */
export async function readMeta(file) {
  try {
    const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    // "ID3"
    if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
      const size = synchsafe(head[6], head[7], head[8], head[9]);
      const buf = new Uint8Array(await file.slice(0, 10 + size).arrayBuffer());
      return parseID3(buf);
    }
    // "fLaC"
    if (head[0] === 0x66 && head[1] === 0x4c && head[2] === 0x61 && head[3] === 0x43) {
      // Embedded cover art can be large; read up to 6 MB of header.
      const cap = Math.min(file.size, 6 * 1024 * 1024);
      const buf = new Uint8Array(await file.slice(0, cap).arrayBuffer());
      return parseFlac(buf);
    }
  } catch (e) {
    console.warn("readMeta:", e);
  }
  return {};
}

function synchsafe(a, b, c, d) {
  return (a << 21) | (b << 14) | (c << 7) | d;
}

// ─────────────────────────── ID3v2 ───────────────────────────
function parseID3(buf) {
  const out = {};
  const major = buf[3]; // 2, 3 or 4
  let i = 10;
  const end = buf.length;
  const idLen = major === 2 ? 3 : 4;

  while (i + idLen + (major === 2 ? 3 : 4) < end) {
    let id, size;
    if (major === 2) {
      id = String.fromCharCode(buf[i], buf[i + 1], buf[i + 2]);
      size = (buf[i + 3] << 16) | (buf[i + 4] << 8) | buf[i + 5];
      i += 6;
    } else {
      id = String.fromCharCode(buf[i], buf[i + 1], buf[i + 2], buf[i + 3]);
      if (major === 4) {
        size = synchsafe(buf[i + 4], buf[i + 5], buf[i + 6], buf[i + 7]);
      } else {
        size = (buf[i + 4] << 24) | (buf[i + 5] << 16) | (buf[i + 6] << 8) | buf[i + 7];
      }
      i += 10;
    }
    if (id.charCodeAt(0) === 0 || size <= 0 || i + size > end) break;

    const frame = buf.subarray(i, i + size);
    if (id === "TIT2" || id === "TT2") out.title = textFrame(frame);
    else if (id === "TPE1" || id === "TP1") out.artist = textFrame(frame);
    else if (id === "TALB" || id === "TAL") out.album = textFrame(frame);
    else if (id === "APIC" || id === "PIC") {
      const art = id === "PIC" ? picFrameV22(frame) : apicFrame(frame);
      if (art) out.artBlob = art;
    }
    i += size;
  }
  return clean(out);
}

function decodeText(enc, bytes) {
  // enc: 0=ISO-8859-1, 1=UTF-16+BOM, 2=UTF-16BE, 3=UTF-8
  try {
    if (enc === 0) return dec("iso-8859-1").decode(bytes);
    if (enc === 1) return dec("utf-16").decode(bytes);
    if (enc === 2) return dec("utf-16be").decode(bytes);
    return dec("utf-8").decode(bytes);
  } catch {
    return dec("iso-8859-1").decode(bytes);
  }
}

function textFrame(frame) {
  if (!frame.length) return undefined;
  const enc = frame[0];
  let body = frame.subarray(1);
  // trim trailing NULs
  let endIdx = body.length;
  while (endIdx > 0 && body[endIdx - 1] === 0) endIdx--;
  const s = decodeText(enc, body.subarray(0, endIdx));
  return (s.split("\x00")[0] || "").trim() || undefined;
}

// APIC (ID3v2.3/2.4): enc | MIME(NUL) | picType(1) | desc(NUL*) | data
function apicFrame(frame) {
  let p = 0;
  const enc = frame[p++];
  // MIME (ISO-8859-1, NUL-terminated)
  let mimeStart = p;
  while (p < frame.length && frame[p] !== 0) p++;
  const mime = dec("iso-8859-1").decode(frame.subarray(mimeStart, p)) || "image/jpeg";
  p++; // NUL
  p++; // picture type
  // description, terminated per encoding (NUL or NUL NUL)
  p = skipDesc(frame, p, enc);
  if (p >= frame.length) return null;
  return new Blob([frame.subarray(p)], { type: mime });
}

// PIC (ID3v2.2): enc | format(3 chars) | picType(1) | desc(NUL*) | data
function picFrameV22(frame) {
  let p = 0;
  const enc = frame[p++];
  const fmt = dec("iso-8859-1").decode(frame.subarray(p, p + 3)).toLowerCase();
  p += 3;
  p++; // picture type
  p = skipDesc(frame, p, enc);
  if (p >= frame.length) return null;
  const mime = fmt === "png" ? "image/png" : "image/jpeg";
  return new Blob([frame.subarray(p)], { type: mime });
}

function skipDesc(frame, p, enc) {
  if (enc === 1 || enc === 2) {
    // UTF-16: NUL NUL terminator on an even boundary
    while (p + 1 < frame.length && !(frame[p] === 0 && frame[p + 1] === 0)) p += 2;
    p += 2;
  } else {
    while (p < frame.length && frame[p] !== 0) p++;
    p++;
  }
  return p;
}

// ─────────────────────────── FLAC ───────────────────────────
function parseFlac(buf) {
  const out = {};
  let i = 4; // after "fLaC"
  while (i + 4 <= buf.length) {
    const header = buf[i];
    const last = (header & 0x80) !== 0;
    const type = header & 0x7f;
    const len = (buf[i + 1] << 16) | (buf[i + 2] << 8) | buf[i + 3];
    const start = i + 4;
    if (start + len > buf.length) break;
    const block = buf.subarray(start, start + len);
    if (type === 4) parseVorbis(block, out); // VORBIS_COMMENT
    else if (type === 6) {
      const art = flacPicture(block);
      if (art) out.artBlob = art;
    }
    i = start + len;
    if (last) break;
  }
  return clean(out);
}

function u32le(b, o) {
  return b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24);
}
function u32be(b, o) {
  return (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3];
}

function parseVorbis(b, out) {
  let p = 0;
  const vlen = u32le(b, p);
  p += 4 + vlen;
  const count = u32le(b, p);
  p += 4;
  for (let n = 0; n < count && p + 4 <= b.length; n++) {
    const len = u32le(b, p);
    p += 4;
    const s = dec("utf-8").decode(b.subarray(p, p + len));
    p += len;
    const eq = s.indexOf("=");
    if (eq < 0) continue;
    const key = s.slice(0, eq).toUpperCase();
    const val = s.slice(eq + 1).trim();
    if (key === "TITLE" && !out.title) out.title = val;
    else if (key === "ARTIST" && !out.artist) out.artist = val;
    else if (key === "ALBUM" && !out.album) out.album = val;
  }
}

// FLAC PICTURE block: big-endian fields.
function flacPicture(b) {
  let p = 4; // picture type
  const mimeLen = u32be(b, p);
  p += 4;
  const mime = dec("iso-8859-1").decode(b.subarray(p, p + mimeLen)) || "image/jpeg";
  p += mimeLen;
  const descLen = u32be(b, p);
  p += 4 + descLen;
  p += 16; // width, height, depth, colors (4×4)
  const dataLen = u32be(b, p);
  p += 4;
  if (p + dataLen > b.length) return null;
  return new Blob([b.subarray(p, p + dataLen)], { type: mime });
}

function clean(o) {
  for (const k of ["title", "artist", "album"]) {
    if (o[k] != null) {
      o[k] = String(o[k]).replace(/[\x00-\x1f]/g, "").trim();
      if (!o[k]) delete o[k];
    }
  }
  return o;
}
