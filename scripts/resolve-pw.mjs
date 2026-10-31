import { resolve } from "node:path";
import { createRequire } from "node:module";
const req = createRequire(import.meta.url);
console.log(resolve(req.resolve("playwright/package.json")));
