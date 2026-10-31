import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "k6.zip");

const apiUrl = "https://api.github.com/repos/grafana/k6/releases/latest";

const req = https.request(
  apiUrl,
  { headers: { "User-Agent": "node" } },
  res => {
    let data = "";
    res.on("data", c => {
      data += c;
    });
    res.on("end", () => {
      const release = JSON.parse(data);
      let winAsset = null;
      for (const a of release.assets) {
        const n = a.name.toLowerCase();
        if (n.includes("windows") && n.includes("amd64")) {
          winAsset = a;
          break;
        }
      }
      if (!winAsset) {
        console.log("No Windows amd64 asset found. Available assets:");
        for (const a of release.assets) {
          console.log("  -", a.name);
        }
        return;
      }
      console.log("Found asset:", winAsset.name);
      console.log("Download URL:", winAsset.browser_download_url);

      const file = fs.createWriteStream(outPath);
      let downloaded = 0;

      const redirect = url => {
        https
          .get(url, res2 => {
            if (
              res2.statusCode >= 300 &&
              res2.statusCode < 400 &&
              res2.headers.location
            ) {
              redirect(res2.headers.location);
            } else {
              console.log(
                "HTTP",
                res2.statusCode,
                "content-length:",
                res2.headers["content-length"]
              );
              res2.on("data", c => {
                downloaded += c.length;
                file.write(c);
              });
              res2.on("end", () => {
                file.end();
                console.log("Download complete:", downloaded, "bytes");
              });
              res2.on("error", e => console.error("Download error:", e));
            }
          })
          .on("error", e => console.error("Connection error:", e));
      };
      redirect(winAsset.browser_download_url);
    });
  }
);

req.on("error", e => console.error("API error:", e));
req.end();
