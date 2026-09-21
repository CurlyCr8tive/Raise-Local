# Eight-Minute Combined Demo Script

## Objective

Show one connected story: Verified Consulting turns PR work into organized proof and coaching, then Raise Local extends that relationship-building capability into repeatable local partnerships.

The presentation should feel like one operating system for Tenyse’s work, not two unrelated products.

## Timing At A Glance

| Time | Segment | Outcome |
| --- | --- | --- |
| 0:00-0:45 | Slides: the problem | Establish the manual-work problem and Tenyse’s role |
| 0:45-1:30 | Slides: the solution | Connect PR platform, coaching, and Raise Local |
| 1:30-3:20 | Verified Consulting walkthrough | Show reporting automation and client value |
| 3:20-4:20 | Coaching walkthrough | Show what happens after visibility lands |
| 4:20-7:35 | Raise Local walkthrough | Show intake, explainable matching, mutual approval, and coordination |
| 7:35-8:00 | Close | State the business value and next step |

## 0:00-0:45: Slides, The Problem

**Say:**

“Tenyse’s work creates value across many moving parts: client information, press placements, reports, coaching, and relationships. The challenge is that the work can become scattered across documents, inboxes, spreadsheets, and follow-up notes. That makes the value harder to see and the next action harder to find.”

On the pain-point slide, let Tenyse speak to the lived problem if she is presenting with you. Keep this section short. The audience should understand the operational gap before seeing the software.

## 0:45-1:30: Slides, The Solution And Transition

**Say:**

“The Verified Consulting platform organizes the proof of the work: what happened, what it was worth, what the client should see, and what needs to happen next. Coaching keeps the client moving after visibility lands. Raise Local is the next extension of that same relationship-building work: it helps local causes and businesses find workable partnerships while keeping human judgment in the loop.”

**Transition to the live build:**

“I’ll show this in three connected moments: how Tenyse manages proof, how clients continue through coaching, and how Raise Local turns a community need into a potential partnership.”

## 1:30-3:20: Verified Consulting Walkthrough

Open the [owner preview](http://localhost:8420/owner.html?demo=owner).

### 1:30-1:50, Owner dashboard

**Say:**

“This is Tenyse’s operating view. The goal is to make the business legible at a glance: client progress, press value, placements, reports, and the work that needs attention.”

Point to the dashboard summary and recent activity. Do not explain every metric.

### 1:50-2:20, Campaign value workspace

Open a strong campaign such as SNAP Co. or Houston Housing Authority.

**Say:**

“A placement is not just stored as a link. It becomes structured proof: the source, the result, the publicity value, the strongest proof points, and the language needed for a client update.”

Show the value and placement details. Keep the focus on turning scattered work into usable client evidence.

### 2:20-2:45, Review Queue

Open the discovery/review queue.

**Say:**

“The discovery assistant helps surface possible mentions, but it does not silently turn them into results. Tenyse reviews the signal before it becomes client-facing. AI helps find the signal; Tenyse approves the truth.”

Show one candidate and the review action. Avoid spending time on every field.

### 2:45-3:20, Reports

Open Reports and show the report builder, executive summary, narrative, save, and export path.

**Say:**

“This is the highest-value workflow: the platform turns tracked work into a client-ready report package. The system structures the data, AI can help draft the language, the brand layer stays consistent, and Tenyse keeps final control.”

Do not actually download during the live presentation unless already rehearsed. Showing the available path is enough.

## 3:20-4:20: Coaching Walkthrough

Open the [Greyz Bistro coaching view](http://localhost:8420/client.html?demo=greyz-bistro&view=coaching).

**Say:**

“PR creates visibility, but visibility is most useful when the client knows what to do with it. This client view makes the next phase visible without exposing Tenyse’s internal workflow.”

Show:

- Current coaching phase.
- Homework or next action.
- Resources.
- Opportunity or reflection prompt.

**Bridge:**

“The pattern is the same: capture the work, make the value visible, and create a clear next step. Raise Local applies that pattern to relationships between nonprofits and local businesses.”

## 4:20-7:35: Raise Local Walkthrough

Open [Raise Local](http://localhost:4102), choose **View Demo Workspace**, and reset the demo before recording.

Use the seeded **YES Academy Inc. plus Sofia & Grace Cookie Co.** match as the primary story. It mirrors the presentation slide titled “One match, start to finish” and keeps the live walkthrough aligned with the deck's outreach example.

### 4:20-4:45, Nonprofit signal

Switch to **Nonprofit** and open Campaign Requests.

**Say:**

"YES Academy has a community need: a Harlem toy drive. Instead of searching a giant marketplace, the nonprofit gives Raise Local the cause, location, timing, support type, audience, and goal. The guided intake turns that story into a structured signal."

Open the seeded YES Academy request. Show the campaign description and the **Find New Matches** action. Do not spend the demo typing every field.

### 4:45-5:05, Matching assistant

Choose **Find New Matches** or open Match Review.

**Say during the loading state:**

“The matching assistant is checking cause alignment, location, timing, partnership type, capacity, and funding needs. The important part is that the result is explainable.”

### 5:05-5:45, Strongest match

Open the **YES Academy Inc. + Sofia & Grace Cookie Co.** match.

**Say:**

“This is not just a score. Raise Local can show why this relationship was recommended, what decision path passed, what a first campaign could look like, and what the fundraising scenario might be.”

Point to the suggested campaign approach and scenario. Add:

“The estimate is a planning scenario, not a promise. The parties still agree to the terms.”

### 5:45-6:15, Business approval

Switch to **Business**, open Match Review, and choose **Approve** on the same match.

**Say:**

“The business makes its own decision. A recommendation is not an assumption of consent.”

If the seeded state already includes a prior decision, use the visible decision path and explain that this is where the business can approve, hold, or decline.

### 6:15-6:40, Nonprofit approval

Switch back to **Nonprofit** and approve the same match.

**Say:**

“The match moves forward only when both sides approve. That protects both parties and gives Tenyse a clean signal about which relationships are ready.”

### 6:40-7:35, Tenyse coordination

Switch to **Tenyse / Admin**, open Match Review, then Outreach.

**Say:**

“Now Tenyse sees the relationship at the moment her judgment matters most. She does not have to manually search, compare, and remember every possible connection. She sees mutual approval, the reasoning, the context, and the next coordination action in one place.”

Show the outreach coordination action, draft the warm introduction, send outreach, and move the project toward Active. Connect this to the slide's final stages:

“The match has moved from signal, to fit, to mutual approval, to a coordinated introduction. Tenyse can stay connected without manually rebuilding the context in a separate inbox.”

## 7:35-8:00: Close

Return to the Raise Local dashboard or the Verified Consulting owner dashboard, depending on which ending looks cleaner in rehearsal.

**Say:**

“The value is not automation for its own sake. The platform captures Tenyse’s work, turns it into client-facing proof, guides the next action, and helps her scale relationship-building without losing the human judgment that makes the work trustworthy. Verified Consulting makes the value visible; Raise Local helps create the next opportunity.”

## Presenter Rules

- Use the owner preview and seeded demo data as the reliability baseline.
- Do not log out of a real account during the presentation.
- Do not open Supabase, environment variables, browser storage, or debug panels on screen.
- Do not claim Gmail sending, live AI matching, or production deployment if those pieces are not connected.
- Explain the assistant as an amplifier: it organizes, filters, explains, and drafts; Tenyse remains the decision-maker.
- Keep one strong story moving forward rather than demonstrating every route.
