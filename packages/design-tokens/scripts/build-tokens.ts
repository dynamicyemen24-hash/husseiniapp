import StyleDictionary from "style-dictionary";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

const outputDir = resolve(__dirname, "../dist");

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

StyleDictionary.registerTransform({
  name: "color/css",
  type: "value",
  matcher: token => token.type === "color",
  transformer: token => token.value,
});

StyleDictionary.registerTransform({
  name: "dimension/rem",
  type: "value",
  matcher: token => token.type === "dimension",
  transformer: token => token.value,
});

const sd = new StyleDictionary({
  source: ["tokens/**/*.json"],
  platforms: {
    css: {
      transformGroup: "css",
      buildPath: "dist/",
      files: [
        {
          destination: "tokens.css",
          format: "css/variables",
          options: {
            outputReferences: true,
          },
        },
      ],
    },
    json: {
      transformGroup: "js",
      buildPath: "dist/",
      files: [
        {
          destination: "tokens.json",
          format: "json/flat",
        },
      ],
    },
    tailwind: {
      transformGroup: "js",
      buildPath: "dist/",
      files: [
        {
          destination: "tailwind-preset.js",
          format: dictionary => {
            const tokens = dictionary.allTokens;
            const colors: Record<string, any> = {};
            const spacing: Record<string, string> = {};
            const borderRadius: Record<string, string> = {};
            const fontSize: Record<string, [string, { lineHeight: string }]> =
              {};
            const fontFamily: Record<string, string[]> = {};

            for (const token of tokens) {
              const path = token.path;
              if (path[0] === "color") {
                let current = colors;
                for (let i = 1; i < path.length - 1; i++) {
                  if (!current[path[i]]) current[path[i]] = {};
                  current = current[path[i]];
                }
                current[path[path.length - 1]] = token.value;
              } else if (path[0] === "spacing") {
                spacing[path[1]] = token.value;
              } else if (path[0] === "borderRadius") {
                borderRadius[path[1]] = token.value;
              } else if (path[0] === "typography" && path[1] === "fontSize") {
                fontSize[path[2]] = [
                  token.value,
                  { lineHeight: token.lineHeight || "normal" },
                ];
              } else if (path[0] === "typography" && path[1] === "fontFamily") {
                fontFamily[path[2]] = token.value;
              }
            }

            return `module.exports = {
  theme: {
    extend: {
      colors: ${JSON.stringify(colors, null, 2)},
      spacing: ${JSON.stringify(spacing, null, 2)},
      borderRadius: ${JSON.stringify(borderRadius, null, 2)},
      fontSize: ${JSON.stringify(fontSize, null, 2)},
      fontFamily: ${JSON.stringify(fontFamily, null, 2)},
    },
  },
};`;
          },
        },
      ],
    },
    figma: {
      transformGroup: "js",
      buildPath: "dist/",
      files: [
        {
          destination: "figma.json",
          format: dictionary => JSON.stringify(dictionary.allTokens, null, 2),
        },
      ],
    },
  },
});

try {
  sd.buildAllPlatforms();
  console.warn("✅ Design tokens built successfully");
} catch (error) {
  console.error("❌ Failed to build design tokens:", error);
  process.exit(1);
}
