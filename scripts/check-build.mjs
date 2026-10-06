import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { buildMatches, deriveMatchStatus, scoreMatch } from "../src/matching.js";
import { businessPhoto, requestPhoto } from "../src/photos.js";
import { DEMO_DATA, resetDemoData } from "../src/storage.js";

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
  assert.equal(scoreMatch({ ...request, supportNeeds: ["Food & beverage"] }, { ...business, offerTypes: ["Food and beverage"] }).rejected, false);
  assert.equal(scoreMatch({ ...request, partnershipTypesNeeded: ["Community event"] }, { ...business, partnershipTypes: ["Hosted event"] }).rejected, false);
  const blockedByLocation = scoreMatch({ ...request, geography: "Bronx" }, business);
  assert.equal(blockedByLocation.rejected, true);
  assert.equal(blockedByLocation.label, "Not a fit");
  assert.equal(buildMatches([{ ...request, geography: "Bronx" }], [business]).length, 0);
  assert.equal(buildMatches([request], [{ ...business, activeCampaigns: 2 }]).length, 0);
}

function assertDemoMatchingBoundaries() {
  const storageSource = readFileSync(join(root, "src/storage.js"), "utf8");
  const grovePark = DEMO_DATA.campaignRequests.find((request) => request.id === "request-grove-park");
  const unityNow = DEMO_DATA.campaignRequests.find((request) => request.id === "request-unity-now");
  const yesAcademy = DEMO_DATA.campaignRequests.find((request) => request.id === "request-young-excellence");
  const sofiaGrace = DEMO_DATA.businesses.find((business) => business.id === "biz-sofia-grace");
  const atlantaLead = DEMO_DATA.businesses.find((business) => business.id === "biz-paco-tacos-atl");
  const dmvLead = DEMO_DATA.businesses.find((business) => business.id === "biz-busboys-and-poets");
  assert.ok(grovePark, "Grove Park fixture is required for presentation QA.");
  assert.ok(unityNow, "UNITYNow fixture is required for DMV demo QA.");
  assert.ok(yesAcademy, "YES Academy fixture is required for backup demo QA.");
  assert.ok(sofiaGrace, "Sofia & Grace fixture is required for backup demo QA.");
  assert.ok(atlantaLead, "Atlanta potential lead fixture is required for Grove Park QA.");
  assert.ok(dmvLead, "DMV potential lead fixture is required for UNITYNow QA.");
  assert.ok(storageSource.includes('"request-unity-now"'), "UNITYNow must stay included in the demo workspace allowlist.");
  assert.ok(storageSource.includes('"biz-busboys-and-poets"'), "DMV leads must stay included in the demo workspace allowlist.");

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

  const groveMatches = buildMatches([grovePark], DEMO_DATA.businesses);
  assert.ok(groveMatches.length, "Grove Park should produce Atlanta presentation matches.");
  assert.ok(groveMatches.every((match) => match.total <= 92), "Grove Park potential leads must stay below confirmed-partner scores.");
  assert.equal(new Set(groveMatches.map((match) => match.total)).size, groveMatches.length, "Grove Park potential leads should not collapse into identical tie scores.");
  assert.ok(groveMatches.every((match) => (match.business.serviceAreas || []).some((area) => /atlanta|grove park|westside/i.test(area))), "Grove Park should show Atlanta/Grove Park leads only.");

  const unityMatches = buildMatches([unityNow], DEMO_DATA.businesses);
  assert.ok(unityMatches.length, "UNITYNow should produce DMV presentation matches.");
  assert.equal(new Set(unityMatches.map((match) => match.total)).size, unityMatches.length, "UNITYNow potential leads should not collapse into identical tie scores.");
  assert.ok(unityMatches.every((match) => (match.business.serviceAreas || []).some((area) => /dmv|washington|dc|maryland|virginia|national harbor|oxon hill|hyattsville|arlington/i.test(area))), "UNITYNow should show DMV leads only.");
  assert.equal(scoreMatch(grovePark, dmvLead).rejected, true, "Grove Park should not match DMV leads without a location fit.");
  assert.equal(scoreMatch(unityNow, atlantaLead).rejected, true, "UNITYNow should not match Atlanta leads without a location fit.");

  const perfectBusinesses = ["biz-paco-tacos-atl", "biz-bankhead-seafood", "biz-casa-de-luz", "biz-glaciers-italian-ice"].map((id, index) => ({
    ...DEMO_DATA.businesses.find((business) => business.id === id),
    id: `confirmed-perfect-${index}`,
    name: `Confirmed Perfect ${index + 1}`,
    status: "ready",
    qualityStatus: "ready",
    serviceAreas: ["Atlanta, GA"],
    category: "Food and beverage",
    causeAreas: ["Community"],
    offerTypes: ["Corporate sponsorship", "Professional services", "Event activation"],
    partnershipTypes: ["Fundraising", "Event sponsorship", "Event activation"],
    minimumCapacity: 1,
    maximumCapacity: 999,
    minimumOrderRequirement: 1,
    activeCampaigns: 0,
    campaignCap: 3,
    availableFrom: "2026-09-01",
    availableTo: "2026-12-31",
  }));
  const perfectMatches = buildMatches([grovePark], perfectBusinesses);
  assert.equal(perfectMatches.length, 4, "The 100% edge-case fixture should produce all four confirmed matches.");
  assert.ok(perfectMatches.every((match) => match.total === 100), "Only confirmed ready businesses with every required variable aligned should be able to show 100.");

  const nonprofitQuizRequest = {
    id: "qa-nonprofit-dmv",
    causeArea: "Education",
    businessPreference: "No preference",
    preferredCategories: ["Services", "Retail", "Local media"],
    geography: "Washington, DC",
    supportNeeds: ["Corporate sponsorship", "Professional services", "Event activation"],
    partnershipTypesNeeded: ["Fundraising", "Event sponsorship", "Corporate sponsorship"],
    expectedParticipation: 100,
    minimumSize: 50,
    idealSize: 100,
    fundingGoal: 5000,
    startDate: "2026-10-15",
    endDate: "2026-12-15",
  };
  const nonprofitQuizMatches = buildMatches([nonprofitQuizRequest], DEMO_DATA.businesses);
  assert.ok(nonprofitQuizMatches.length, "A new DMV nonprofit intro quiz should return business matches.");
  assert.ok(nonprofitQuizMatches.every((match) => /dmv|washington|dc|maryland|virginia|national harbor|oxon hill|hyattsville|arlington/i.test((match.business.serviceAreas || []).join(" "))), "A new DMV nonprofit intro quiz should only return DMV-compatible businesses.");

  const smallBusinessQuizProfile = {
    id: "qa-business-brooklyn-dessert",
    category: "Food and beverage",
    serviceAreas: ["Brooklyn", "Manhattan"],
    fulfillmentScope: "Local",
    causeAreas: ["Youth", "Education", "Food access"],
    contributionTypes: ["Percent of sales", "Product donation"],
    offerTypes: ["Food & beverage", "Products or corporate gifting"],
    partnershipTypes: ["Fundraising", "Percentage of sales campaign", "Product donation"],
    businessGoals: ["Foot traffic", "Brand awareness", "Community visibility"],
    minimumCapacity: 30,
    maximumCapacity: 180,
    idealEventSize: 100,
    minimumOrderRequirement: 250,
    campaignCap: 2,
    activeCampaigns: 0,
    estimatedUnitContribution: 12,
    availableFrom: "2026-09-01",
    availableTo: "2026-12-31",
  };
  const smallBusinessQuizMatches = buildMatches(DEMO_DATA.campaignRequests, [smallBusinessQuizProfile]);
  assert.ok(smallBusinessQuizMatches.some((match) => match.request.id === "request-young-excellence"), "A new Brooklyn/Manhattan small-business intro quiz should match YES Academy.");
  assert.equal(smallBusinessQuizMatches.some((match) => match.request.id === "request-grove-park"), false, "A new Brooklyn/Manhattan small-business intro quiz should not match Grove Park.");
  assert.equal(smallBusinessQuizMatches.some((match) => match.request.id === "request-unity-now"), false, "A new Brooklyn/Manhattan small-business intro quiz should not match UNITYNow.");
}

function assertDemoResetAndFlowWiring() {
  const appSource = readFileSync(join(root, "src/app.js"), "utf8");
  assert.ok(appSource.includes("startDemoMatchFinder()"), "Demo links must keep a no-login intro quiz entry.");
  assert.ok(appSource.includes("enterDemoAfterQuiz(createdRecord)"), "Demo quiz completion must enter the matching workspace without forcing login.");
  assert.ok(appSource.includes('id="landing-demo"'), "Demo landing must keep an Enter Demo Workspace button.");
  assert.ok(appSource.includes("resetDemoData()"), "Demo workspace must keep the reset demo data action.");
  assert.ok(appSource.includes('data-demo-start-role="admin"'), "Demo workspace must keep the admin/owner role entry.");
  assert.ok(appSource.includes('data-demo-start-role="nonprofit"'), "Demo workspace must keep the nonprofit role entry.");
  assert.ok(appSource.includes('data-demo-start-role="business"'), "Demo workspace must keep the business role entry.");

  const memory = new Map();
  globalThis.localStorage = {
    getItem: (key) => memory.get(key) || null,
    setItem: (key, value) => memory.set(key, String(value)),
  };
  const reset = resetDemoData();
  assert.ok(reset.campaignRequests.some((record) => record.id === "request-grove-park"), "Demo reset must restore Grove Park.");
  assert.ok(reset.campaignRequests.some((record) => record.id === "request-unity-now"), "Demo reset must restore UNITYNow.");
  assert.ok(reset.businesses.some((record) => record.id === "biz-paco-tacos-atl"), "Demo reset must restore Atlanta potential leads.");
  assert.ok(reset.businesses.some((record) => record.id === "biz-busboys-and-poets"), "Demo reset must restore DMV potential leads.");
  assert.ok(reset.businesses.some((record) => record.id === "biz-sofia-grace"), "Demo reset must restore the backup confirmed business flow.");
}

function assertPasswordRecoveryGuard() {
  const appSource = readFileSync(join(root, "src/app.js"), "utf8");
  assert.ok(appSource.includes("urlIndicatesPasswordRecovery()"), "Password reset links must be detected before normal sign-in routing.");
  assert.ok(appSource.includes('event === "PASSWORD_RECOVERY"'), "Supabase PASSWORD_RECOVERY events must force the set-password screen.");
  assert.ok(appSource.includes("if (passwordRecovery) return false;"), "Password recovery must not use existing password_set metadata to skip the reset form.");
  assert.ok(appSource.includes("Save New Password"), "Password recovery screen must clearly ask the user to save a new password.");
}

function assertDemoDataVisualPolish() {
  const assetExists = (path) => existsSync(join(root, path));
  const isPotentialLead = (record) => record.status === "potential_lead" || record.qualityStatus === "potential_lead";

  for (const request of DEMO_DATA.campaignRequests) {
    const photo = requestPhoto(request);
    assert.equal(photo.startsWith("assets/"), true, `${request.organizationName} must use a reviewed local image asset, not generic stock.`);
    assert.ok(assetExists(photo), `${request.organizationName} image asset is missing: ${photo}`);
    assert.notEqual(/ps\s*120/i.test(request.organizationName), true, "PS 120 is not a real seeded nonprofit and must not return.");
  }

  for (const business of DEMO_DATA.businesses) {
    const photo = businessPhoto(business);
    assert.equal(photo.startsWith("assets/"), true, `${business.name} must use a reviewed local asset or neutral placeholder, not generic stock.`);
    assert.ok(assetExists(photo), `${business.name} image asset is missing: ${photo}`);
    if (isPotentialLead(business)) {
      assert.ok(/\(Potential Lead\)/i.test(business.name) || business.id.startsWith("business-"), `${business.name} must be visibly labeled as a potential lead.`);
      assert.ok(business.leadSource, `${business.name} must explain where the lead came from.`);
      assert.ok(business.googleMapsUrl || business.sourceUrl || business.website, `${business.name} must keep a public verification/source link.`);
      assert.match(`${business.notes} ${business.leadSource}`, /not (?:signed up|registered)|not confirmed/i, `${business.name} must say it is not a confirmed Raise Local partner.`);
    }
  }
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
assertDemoDataVisualPolish();
assertDemoResetAndFlowWiring();
assertPasswordRecoveryGuard();
assertIntroQuizLength();
assertGmailRawMessageLineBreaks();
assertWorkflowFixtures();

console.log(`Build check passed: ${jsFiles.length} JavaScript files, ${htmlFiles.length} HTML files, and matching rules verified.`);
