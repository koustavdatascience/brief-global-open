import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" }
)
  .split("\n")
  .filter(Boolean)
  .filter(
    file =>
      !file.startsWith("node_modules/") &&
      !file.startsWith("dist/") &&
      !file.startsWith(".manus-logs/")
  );

const forbidden =
  /india[ _-]?change[ _-]?radar|change[ _-]?radar|CHANGE_RADAR/i;
const credential =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:sk_live_|sk_test_|ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]{12,}/;
const findings = [];

for (const file of files) {
  if (file === "scripts/independence-audit.mjs") continue;
  if (forbidden.test(file))
    findings.push(`${file}: forbidden product filename`);
  const text = await readFile(file, "utf8").catch(() => "");
  if (forbidden.test(text))
    findings.push(`${file}: forbidden product reference`);
  if (credential.test(text)) findings.push(`${file}: credential material`);
}

if (findings.length) {
  console.error("Independence audit failed:");
  console.error(findings.join("\n"));
  process.exit(1);
}

console.log(
  `Independence audit passed for ${files.length} repository file(s).`
);
