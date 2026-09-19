import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { buildMatches, deriveMatchStatus, scoreMatch } from "../src/matching.js";

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
    offerTypes: ["Food"],
    minimumCapacity: 50,
    maximumCapacity: 150,
    campaignCap: 2,
    activeCampaigns: 0,
    availableFrom: "2026-09-01",
    availableTo: "2026-10-30",
  };
  const request = {
    id: "request",
    causeArea: "Food access",
    businessPreference: "Food and beverage",
    geography: "Brooklyn",
    supportNeeds: ["Food"],
    minimumSize: 75,
    idealSize: 100,
    startDate: "2026-09-15",
    endDate: "2026-10-15",
  };
  const score = scoreMatch(request, business);
  assert.equal(score.total, 100);
  assert.deepEqual(score.reasons, [
    "Available during campaign window",
    "Serves Brooklyn",
    "Supports Food access",
    "Fits food and beverage preference",
    "Offers the support needed",
    "Capacity range can cover the expected participation",
  ]);
  assert.equal(buildMatches([request], [business])[0].total, 100);
  assert.equal(buildMatches([{ ...request, geography: "Bronx" }], [business]).length, 0);
  assert.equal(buildMatches([request], [{ ...business, activeCampaigns: 2 }]).length, 0);
}

function assertWorkflowFixtures() {
  const nonprofit = {
    id: "workflow-request",
    causeArea: "Education",
    businessPreference: "Food and beverage",
    geography: "Manhattan",
    supportNeeds: ["Food & beverage"],
    partnershipTypesNeeded: ["Fundraising"],
    expectedParticipation: 60,
    minimumSize: 40,
    fundingGoal: 2400,
    startDate: "2026-10-01",
    endDate: "2026-10-31",
  };
  const business = {
    id: "workflow-business",
    category: "Food and beverage",
    serviceAreas: ["Manhattan"],
    causeAreas: ["Education"],
    offerTypes: ["Food & beverage"],
    partnershipTypes: ["Fundraising"],
    minimumCapacity: 40,
    maximumCapacity: 120,
    minimumOrderRequirement: 200,
    campaignCap: 2,
    activeCampaigns: 0,
    availableFrom: "2026-09-01",
    availableTo: "2026-11-01",
    estimatedUnitContribution: 12,
  };
  const match = scoreMatch(nonprofit, business);
  assert.equal(match.rejected, false);
  assert.ok(match.reasons.includes("Supports Education"));
  assert.equal(buildMatches([nonprofit], [business])[0].business.id, "workflow-business");

  assert.equal(deriveMatchStatus({}), "suggested");
  assert.equal(deriveMatchStatus({ nonprofitDecision: "approved" }), "awaiting_business");
  assert.equal(deriveMatchStatus({ businessDecision: "approved" }), "awaiting_nonprofit");
  assert.equal(deriveMatchStatus({ nonprofitDecision: "held" }), "on_hold");
  assert.equal(deriveMatchStatus({ nonprofitDecision: "approved", businessDecision: "approved" }), "mutually_approved");
  assert.equal(deriveMatchStatus({ nonprofitDecision: "approved", businessDecision: "declined" }), "declined");
  assert.equal(deriveMatchStatus({ nonprofitDecision: "approved", businessDecision: "approved", outreachStatus: "sent" }), "outreach_sent");
}

walk(root);

for (const file of jsFiles) {
  run(`Syntax check ${relative(root, file)}`, "node", ["--check", file]);
}

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const assetPattern = /<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi;
  for (const match of html.matchAll(assetPattern)) {
    const assetPath = match[1].split("?")[0];
    if (/^(?:https?:)?\/\//.test(assetPath) || assetPath.startsWith("#")) continue;
    if (!existsSync(join(root, assetPath))) {
      throw new Error(`${relative(root, file)} references missing asset: ${assetPath}`);
    }
  }
}

assertMatchingRules();
assertWorkflowFixtures();

console.log(`Build check passed: ${jsFiles.length} JavaScript files, ${htmlFiles.length} HTML files, and matching rules verified.`);
