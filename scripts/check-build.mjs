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
    market: "New York",
    monthlyBudget: 1000,
    causes: ["Food access"],
    audiences: ["Families"],
    activationTypes: ["Round-up campaign"],
  };
  const nonprofit = {
    id: "np",
    market: "New York",
    minimumContribution: 500,
    causes: ["Food access"],
    audiences: ["Families"],
    activationNeeds: ["Round-up campaign"],
  };
  const score = scoreMatch(business, nonprofit);
  assert.equal(score.total, 64);
  assert.deepEqual(score.reasons, ["Cause alignment", "Audience overlap", "Budget fit", "Activation fit", "Same market"]);
  assert.equal(buildMatches([business], [nonprofit])[0].total, 64);
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
