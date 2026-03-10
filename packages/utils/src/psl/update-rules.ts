/**
 * Public Suffix List (PSL) parser.
 * From https://github.com/lupomontero/psl
 * Author: lupomontero
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const src = "https://publicsuffix.org/list/effective_tld_names.dat";
const dest = fileURLToPath(new URL("./rules.ts", import.meta.url));

const parseLine = (line: any) => {
  const trimmed = line.trim();

  if (!trimmed || (trimmed.charAt(0) === "/" && trimmed.charAt(1) === "/")) {
    return;
  }

  const rule = trimmed.split(" ")[0];
  return rule;
};

fetch(src)
  .then((response) => response.text())
  .then((text) =>
    text.split("\n").reduce((memo, line) => {
      const parsed = parseLine(line);
      return !parsed ? memo : memo.concat(parsed);
    }, [])
  )
  .then((rules) =>
    writeFile(dest, `export default ${JSON.stringify(rules, null, 2)};`)
  )
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
