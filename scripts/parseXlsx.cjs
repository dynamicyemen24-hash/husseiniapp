const fs = require("fs");
const path = require("path");

function decodeEntities(s) {
  return (s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(parseInt(d, 10)));
}

function parseSharedStrings(p) {
  if (!fs.existsSync(p)) return [];
  const xml = fs.readFileSync(p, "utf8");
  const sis = xml.match(/<si>([\s\S]*?)<\/si>/g) || [];
  return sis.map(si => {
    const texts = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
    return texts.map(t => decodeEntities(t.replace(/<[^>]*>/g, ""))).join("");
  });
}

function colLetter(r) {
  return r.replace(/[0-9]/g, "");
}
function colIndex(letter) {
  let n = 0;
  for (const ch of letter) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseSheet(sheetPath, shared) {
  const xml = fs.readFileSync(sheetPath, "utf8");
  const rows = xml.match(/<row\b[^>]*>([\s\S]*?)<\/row>/g) || [];
  const out = [];
  for (const row of rows) {
    const cells = row.match(/<c\b([^>]*)>([\s\S]*?)<\/c>/g) || [];
    const map = {};
    for (const cell of cells) {
      const attrs = cell.match(/<c\b([^>]*)>/)[1];
      const rM = attrs.match(/\br="([^"]+)"/);
      const tM = attrs.match(/\bt="([^"]+)"/);
      const r = rM ? rM[1] : "";
      const t = tM ? tM[1] : null;
      const inner = cell.replace(/^<c[^>]*>/, "").replace(/<\/c>$/, "");
      let val = "";
      if (t === "s") {
        const vM = inner.match(/<v>([\s\S]*?)<\/v>/);
        if (vM) val = shared[parseInt(vM[1], 10)] || "";
      } else if (t === "inlineStr") {
        const tM2 = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        val = tM2 ? decodeEntities(tM2[1]) : "";
      } else {
        const vM = inner.match(/<v>([\s\S]*?)<\/v>/);
        val = vM ? vM[1] : "";
      }
      map[colIndex(colLetter(r))] = val;
    }
    const arr = [];
    const maxIdx = Math.max(-1, ...Object.keys(map).map(Number));
    for (let i = 0; i <= maxIdx; i++) arr.push(map[i] ?? "");
    out.push(arr);
  }
  return out;
}

function dump(dir, name) {
  const base = path.join("temp", dir, "xl");
  const shared = parseSharedStrings(path.join(base, "sharedStrings.xml"));
  const wsDir = path.join(base, "worksheets");
  const sheets = fs
    .readdirSync(wsDir)
    .filter(f => f.endsWith(".xml") && f !== "_rels");
  const result = {};
  for (const s of sheets) {
    const rows = parseSheet(path.join(wsDir, s), shared);
    result[s] = rows;
  }
  fs.writeFileSync(
    path.join("temp", name + ".json"),
    JSON.stringify(result, null, 1)
  );
  // Summary
  for (const s of sheets) {
    const rows = result[s];
    console.log(
      `${name} / ${s}: ${rows.length} rows, header=`,
      JSON.stringify(rows[0])
    );
  }
}

dump("x_accounts", "accounts_raw");
dump("x_inv", "inventory_raw");
dump("x_serv", "services_raw");
