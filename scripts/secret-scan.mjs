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

const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:sk_live_|sk_test_|ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]{12,}/,
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*[A-Za-z0-9._-]{20,}/,
];

const findings = [];
for (const file of files) {
  const text = await readFile(file, "utf8").catch(() => "");
  for (const pattern of patterns) {
    if (pattern.test(text)) findings.push(`${file}: ${pattern}`);
  }
}

if (findings.length) {
  console.error("Potential credential literals found:");
  console.error(findings.join("\n"));
  process.exit(1);
}

console.log(`Secret scan passed for ${files.length} repository file(s).`);
