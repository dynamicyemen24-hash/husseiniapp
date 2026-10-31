import fs from "fs";

const content = fs.readFileSync(
  "D:\\Projects26\\ALHUSAINIA\\husseiniya-platform\\client\\src\\App.tsx",
  "utf-8"
);
let braceCount = 0;
let inString = false;
let stringChar = "";
let pos = 0;

for (const ch of content) {
  if (!inString && (ch === '"' || ch === "'" || ch === "`")) {
    inString = true;
    stringChar = ch;
  } else if (inString && ch === stringChar) {
    inString = false;
  } else if (!inString) {
    if (ch === "{") braceCount++;
    if (ch === "}") braceCount--;
    if (braceCount < 0) {
      console.log("Negative brace count at position", pos);
    }
  }
  pos++;
}

console.log("Final brace count:", braceCount);

const lines = content.split("\n");
let lineBraceCount = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let inStr = false;
  let strChar = "";
  for (const ch of line) {
    if (!inStr && (ch === '"' || ch === "'" || ch === "`")) {
      inStr = true;
      strChar = ch;
    } else if (inStr && ch === strChar) {
      inStr = false;
    } else if (!inStr) {
      if (ch === "{") lineBraceCount++;
      if (ch === "}") lineBraceCount--;
    }
  }
  if (lineBraceCount !== braceCount) {
    console.log(
      "Line " +
        (i + 1) +
        ": brace diff = " +
        (lineBraceCount - braceCount) +
        " (total: " +
        lineBraceCount +
        ")"
    );
  }
  braceCount = lineBraceCount;
}
