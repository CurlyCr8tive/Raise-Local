import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { buildMatches, deriveMatchStatus, scoreMatch } from "../src/matching.js";
import { DEMO_DATA } from "../src/storage.js";

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
  assert.equal(score.label, "Strong fit");
  assert.deepEqual(score.reasons, [
    "Available during campaign window",
    "Serves Brooklyn",
    "Supports Food access",
    "Fits food and beverage preference",
    "Offers the support needed",
    "Capacity range can cover the expected participation",
  ]);
  assert.equal(buildMatches([request], [business])[0].total, 100);
  const blockedByLocation = scoreMatch({ ...request, geography: "Bronx" }, business);
  assert.equal(blockedByLocation.rejected, true);
  assert.equal(blockedByLocation.label, "Not a fit");
  assert.equal(buildMatches([{ ...request, geography: "Bronx" }], [business]).length, 0);
  assert.equal(buildMatches([request], [{ ...business, activeCampaigns: 2 }]).length, 0);
}

function assertDemoMatchingBoundaries() {
  const grovePark = DEMO_DATA.campaignRequests.find((request) => request.id === "request-grove-park");
  const yesAcademy = DEMO_DATA.campaignRequests.find((request) => request.id === "request-young-excellence");
  const sofiaGrace = DEMO_DATA.businesses.find((business) => business.id === "biz-sofia-grace");
  const atlantaLead = DEMO_DATA.businesses.find((business) => business.id === "biz-paco-tacos-atl");
  assert.ok(grovePark, "Grove Park fixture is required for presentation QA.");
  assert.ok(yesAcademy, "YES Academy fixture is required for backup demo QA.");
  assert.ok(sofiaGrace, "Sofia & Grace fixture is required for backup demo QA.");
  assert.ok(atlantaLead, "Atlanta potential lead fixture is required for Grove Park QA.");

  const brooklynBusiness = {
    id: "brooklyn-business",
    name: "Brooklyn QA Business",
    category: "Food and beverage",
    serviceAreas: ["Brooklyn"],
    fulfillmentScope: "Local",
    causeAreas: [grovePark.causeArea],
    offerTypes: grovePark.supportNeeds,
    partnershipTypes: grovePark.partnershipTypesNeeded,
    minimumCapacity: 1,
    maximumCapacity: 500,
    minimumOrderRequirement: 100,
    campaignCap: 2,
    activeCampaigns: 0,
  };
  const groveVsBrooklyn = scoreMatch(grovePark, brooklynBusiness);
  assert.equal(groveVsBrooklyn.rejected, true);
  assert.equal(groveVsBrooklyn.label, "Not a fit");
  assert.ok(groveVsBrooklyn.blockers.includes("Location or service area does not overlap."));
  assert.equal(buildMatches([grovePark], [brooklynBusiness]).length, 0);

  const groveVsAtlantaLead = scoreMatch(grovePark, atlantaLead);
  assert.equal(groveVsAtlantaLead.rejected, false);
  assert.ok(groveVsAtlantaLead.total < 100, "Potential leads must not display as perfect 100% matches.");
  assert.ok(groveVsAtlantaLead.total <= 92, "Potential leads are capped below confirmed partners.");

  const scopedMatches = buildMatches([grovePark, yesAcademy], DEMO_DATA.businesses);
  assert.ok(scopedMatches.some((match) => match.request.id === grovePark.id), "Grove Park should keep its Atlanta presentation matches.");
  assert.ok(scopedMatches.some((match) => match.request.id === yesAcademy.id && match.business.id === sofiaGrace.id), "Backup YES Academy path should still match Sofia & Grace.");
  assert.ok(scopedMatches.every((match) => !match.rejected), "Rejected matches must not appear in review queues.");
}

function assertIntroQuizLength() {
  const appSource = readFileSync(join(root, "src/app.js"), "utf8");
  const countKeysInArray = (name) => {
    const start = appSource.indexOf(`const ${name} = [`);
    assert.notEqual(start, -1, `${name} must exist.`);
    const end = appSource.indexOf("];", start);
    assert.notEqual(end, -1, `${name} must close.`);
    return [...appSource.slice(start, end).matchAll(/\bkey:\s*["']/g)].length;
  };
  assert.equal(countKeysInArray("NONPROFIT_CORE_QUESTIONS") + 1, 10, "Nonprofit intro quiz must stay at 10 questions including contact.");
  assert.equal(countKeysInArray("BUSINESS_CORE_QUESTIONS") + 1, 10, "Business intro quiz must stay at 10 questions including contact.");
}

function assertGmailRawMessageLineBreaks() {
  const serverSource = readFileSync(join(root, "server.mjs"), "utf8");
  assert.equal(serverSource.includes('].join("\\\\r\\\\n");'), false, "Gmail MIME messages must use real CRLF line breaks, not literal \\\\r\\\\n text.");
  const start = serverSource.indexOf("function gmailRawMessage");
  const end = serverSource.indexOf("\n}\n\nasync function sendGmailMessage", start);
  assert.notEqual(start, -1, "gmailRawMessage must exist.");
  assert.notEqual(end, -1, "gmailRawMessage must be extractable for line-break QA.");
  const functionSource = serverSource.slice(start, end + 3);
  const raw = Function("Buffer", `${functionSource}; return gmailRawMessage({ to: "client@example.com", subject: "Line check", text: "Body line" });`)(Buffer);
  const decoded = Buffer.from(raw, "base64url").toString("utf8");
  assert.equal(decoded.includes("\\r\\n"), false, "Decoded Gmail MIME message must not contain literal \\\\r\\\\n text.");
  const lines = decoded.split("\r\n");
  assert.equal(lines[0], "To: client@example.com");
  assert.equal(lines[3], "Subject: Line check");
  assert.equal(lines[4], "");
  assert.equal(lines[5], "Body line");
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
assertDemoMatchingBoundaries();
assertIntroQuizLength();
assertGmailRawMessageLineBreaks();
assertWorkflowFixtures();

console.log(`Build check passed: ${jsFiles.length} JavaScript files, ${htmlFiles.length} HTML files, and matching rules verified.`);
