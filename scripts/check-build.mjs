import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { buildMatches, scoreMatch } from "../src/matching.js";

const root = process.cwd();
const jsFiles = [];
const htmlFiles = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    if (entry.isFile() && fullPath.endsWith(".js")) jsFiles.push(fullPath);
    if (entry.isFile() && fullPath.endsWith(".html")) htmlFiles.push(fullPath);
  }
}

function run(label, command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", stdio: "pipe" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}.`);
}

function assertMatchingRules() {
  const business = {
    id: "biz",
    category: "Food and beverage",
    serviceAreas: ["Brooklyn", "Queens"],
    causeAreas: ["Food access"],
    contributionTypes: ["Percent of sales"],
    availableFrom: "2026-09-01",
    availableTo: "2026-10-30",
  };
  const request = {
    id: "request",
    causeArea: "Food access",
    businessPreference: "Food and beverage",
    geography: "Brooklyn",
    startDate: "2026-09-15",
    endDate: "2026-10-15",
  };
  const score = scoreMatch(request, business);
  assert.equal(score.total, 100);
  assert.deepEqual(score.reasons, [
    "Supports Food access",
    "Fits food and beverage preference",
    "Serves Brooklyn",
    "Has a contribution type on file",
    "Available during campaign window",
  ]);
  assert.equal(buildMatches([request], [business])[0].total, 100);
  assert.equal(buildMatches([{ ...request, geography: "Bronx" }], [business]).length, 0);
}

walk(root);

for (const file of jsFiles) {
  run(`Syntax check ${relative(root, file)}`, "node", ["--check", file]);
}

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const assetPattern = /<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi;
  for (const match of html.matchAll(assetPattern)) {
    const assetPath = match[1];
    if (/^(?:https?:)?\/\//.test(assetPath) || assetPath.startsWith("#")) continue;
    if (!existsSync(join(root, assetPath))) {
      throw new Error(`${relative(root, file)} references missing asset: ${assetPath}`);
    }
  }
}

assertMatchingRules();

console.log(`Build check passed: ${jsFiles.length} JavaScript files, ${htmlFiles.length} HTML files, and matching rules verified.`);
