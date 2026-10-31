/* eslint-disable */
const react = require("./react");

module.exports = {
  ...react,
  extends: [...react.extends, "plugin:@next/next/recommended"],
  plugins: [...react.plugins, "@next/next"],
  rules: {
    ...react.rules,
    "@next/next/no-html-link-for-pages": "error",
    "@next/next/no-img-element": "warn",
  },
};
