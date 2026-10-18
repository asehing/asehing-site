// Reader/writer for Framer's exported CMS files (*.framercms): a "chunk" with the items and an
// "indexes" file with sorted lookups, plus the byte ranges of each index that the collection
// module (<id>.js) hardcodes. Layout was reverse-engineered; the tests in build verify that
// unchanged content regenerates byte-identical files.
//
// chunk   := u32 itemCount, item*          item  := u16 fieldCount, field*
// field   := u32 keyLen, key, u8 type, value
// types   := 0 null | 1 array(u16 n, n*(u8 type,value)) | 2/3 bool(1) | 4 int64 | 5/0x0c string(u32 len)
//            | 9 object(u16 n, field*) | 0x0a json(u32 len) | 0x0b richtext(u8 flag, u32 len)
// indexes := section*   section := u32 jsonLen, json, u8 kind, [kind2: u32+name0], u32+name, u32 count, entry*
//   kind 1 entry := u8 type, value, loc      kind 2 entry := u8 t, v, u8 t2, v2, loc
//   loc := u16 0, u32 itemOffset, u32 itemLength

const u32 = (b, o) => b.readUInt32BE(o);
const u16 = (b, o) => b.readUInt16BE(o);

function valueEnd(b, o, t) {
  switch (t) {
    case 0x00: return o;
    case 0x04: return o + 8;
    case 0x02: case 0x03: return o + 1;
    case 0x05: case 0x0c: case 0x0a: return o + 4 + u32(b, o);
    case 0x0b: return o + 5 + u32(b, o + 1);
    case 0x01: {
      const n = u16(b, o); o += 2;
      for (let i = 0; i < n; i++) { const et = b[o++]; o = valueEnd(b, o, et); }
      return o;
    }
    case 0x09: {
      const n = u16(b, o); o += 2;
      for (let i = 0; i < n; i++) { o += 4 + u32(b, o); const ft = b[o++]; o = valueEnd(b, o, ft); }
      return o;
    }
    default: throw new Error(`unknown framercms type 0x${t.toString(16)} at ${o}`);
  }
}

export function parseChunk(b) {
  const n = u32(b, 0); let o = 4; const items = [];
  for (let i = 0; i < n; i++) {
    const nf = u16(b, o); o += 2; const fields = [];
    for (let j = 0; j < nf; j++) {
      const kl = u32(b, o); const key = b.toString('utf8', o + 4, o + 4 + kl); o += 4 + kl;
      const t = b[o++]; const e = valueEnd(b, o, t);
      fields.push({ key, t, v: b.subarray(o, e) }); o = e;
    }
    items.push({ fields });
  }
  if (o !== b.length) throw new Error('chunk not fully consumed');
  return items;
}

const num = (n) => { const x = Buffer.alloc(4); x.writeUInt32BE(n); return x; };
const str = (s) => { const sb = Buffer.from(s, 'utf8'); return Buffer.concat([num(sb.length), sb]); };

// Serialises items; returns the chunk and each item's { off, len } (used by index locations).
export function serChunk(items) {
  const parts = [num(items.length)]; let off = 4; const locs = [];
  for (const it of items) {
    const p = [Buffer.from([it.fields.length >> 8, it.fields.length & 255])];
    for (const f of it.fields) p.push(str(f.key), Buffer.from([f.t]), f.v);
    const buf = Buffer.concat(p); parts.push(buf); locs.push({ off, len: buf.length }); off += buf.length;
  }
  return { buf: Buffer.concat(parts), locs };
}

export function parseIndex(b) {
  let o = 0; const secs = [];
  const readName = () => { const l = u32(b, o); const s = b.toString('utf8', o + 4, o + 4 + l); o += 4 + l; return s; };
  while (o < b.length) {
    const jl = u32(b, o); const json = b.toString('utf8', o + 4, o + 4 + jl); o += 4 + jl;
    const kind = b[o++]; const sec = { json, kind };
    if (kind === 2) sec.name0 = readName();
    sec.name = readName();
    const cnt = u32(b, o); o += 4; const ents = [];
    for (let i = 0; i < cnt; i++) {
      const t = b[o++]; let e = valueEnd(b, o, t); const v = b.subarray(o, e); o = e;
      if (kind === 1) { ents.push({ t, v, loc: b.subarray(o, o + 10) }); o += 10; }
      else {
        const t2 = b[o++]; e = valueEnd(b, o, t2); const v2 = b.subarray(o, e); o = e;
        ents.push({ t, v, t2, v2, loc: b.subarray(o, o + 10) }); o += 10;
      }
    }
    sec.ents = ents; secs.push(sec);
  }
  return secs;
}

// Returns the file plus the [from,to) byte range of every section (hardcoded in <id>.js).
export function serIndex(secs) {
  const parts = []; const ranges = []; let pos = 0;
  for (const s of secs) {
    const p = [num(Buffer.byteLength(s.json)), Buffer.from(s.json), Buffer.from([s.kind])];
    if (s.kind === 2) p.push(str(s.name0));
    p.push(str(s.name), num(s.ents.length));
    for (const e of s.ents) {
      p.push(Buffer.from([e.t]), e.v);
      if (s.kind === 2) p.push(Buffer.from([e.t2]), e.v2);
      p.push(e.loc);
    }
    const buf = Buffer.concat(p); ranges.push({ from: pos, to: pos + buf.length }); pos += buf.length; parts.push(buf);
  }
  return { buf: Buffer.concat(parts), ranges };
}

// ---- value helpers ----
export const getStr = (t, v) => (t === 0x0c || t === 0x05 || t === 0x0a ? v.toString('utf8', 4) : t === 0x0b ? v.toString('utf8', 5) : null);
export const strVal = (s) => str(s);
export const int64 = (n) => { const x = Buffer.alloc(8); x.writeBigInt64BE(BigInt(n)); return x; };

function cmp(t, a, b, ci) {
  if (t === 0x04) { const x = a.readBigInt64BE(), y = b.readBigInt64BE(); return x < y ? -1 : x > y ? 1 : 0; }
  const sa = getStr(t, a), sb = getStr(t, b);
  if (sa !== null) {
    const x = ci && t === 0x0c ? sa.toLowerCase() : sa, y = ci && t === 0x0c ? sb.toLowerCase() : sb;
    return Buffer.compare(Buffer.from(x), Buffer.from(y));
  }
  return Buffer.compare(a, b);
}

// Rebuilds every index section of `tmpl` for the given items (with locs from serChunk).
export function genIndex(items, locs, tmpl) {
  const recs = items.map((it, i) => ({
    f: new Map(it.fields.map((x) => [x.key, x])),
    loc: Buffer.concat([Buffer.from([0, 0]), num(locs[i].off), num(locs[i].len)]),
  }));
  const slugField = tmpl.find((s) => s.kind === 2 && s.json === '{"type":1}').name;
  return tmpl.map((s) => {
    let ents;
    if (s.kind === 1) {
      const ci = !['id', 'previousItemId', 'nextItemId'].includes(s.name);
      ents = recs.map(({ f, loc }) => { const x = f.get(s.name); return { t: x ? x.t : 0, v: x ? x.v : Buffer.alloc(0), loc }; });
      ents.sort((a, b) => (a.t - b.t) || (a.t === 0 ? 0 : cmp(a.t, a.v, b.v, ci)));
    } else if (s.json === '{"type":1}') {
      ents = recs.map(({ f, loc }) => { const i = f.get('id'), v = f.get(s.name); return { t: i.t, v: i.v, t2: v.t, v2: v.v, loc }; });
      ents.sort((a, b) => cmp(a.t, a.v, b.v));
    } else {
      ents = recs.map(({ f, loc }) => { const v = f.get(slugField), i = f.get('id'); return { t: v.t, v: v.v, t2: i.t, v2: i.v, loc }; });
      ents.sort((a, b) => cmp(a.t, a.v, b.v));
    }
    return { ...s, ents };
  });
}
