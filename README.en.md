<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/hero-dark.gif">
  <img src="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/hero-light.gif" width="800" alt="Each request lights up the matching skill, and the eleven skills take turns turning the same wireframe screen from before the fix to after the fix: a transfer screen that shows the payee's name large and adds two confirmations only for a large first-time transfer, three candidate thumbnails, a task card on a reading-notes screen, order-flow thumbnails with a dashed exception path, a profile-edit screen with numbered pins, a card-number error message, a snackbar with Undo, icon buttons growing from 20 to 44 pixels, a subscription-cancel screen, numbered pins on a share sheet, and source chips with Regenerate">
</picture>

# power-ux-harness

**The same feature has a different right answer in every product.<br>
Eleven skills that make an AI coding agent read scale, audience, age and situation first, then design and review UX the way a senior product designer works.**

It opens the sources on how similar services solved the same situation, pulls out why it worked there, and proposes a default plus variants for the exceptions that matter in your context.<br>
Synthetic personas screen candidate designs first, and flows, screen specs, UX copy, reviews, accessibility, deceptive-pattern checks and metrics follow with the same vocabulary and the same verdicts.

[![CI](https://github.com/Power-xc/power-ux-harness/actions/workflows/ci.yml/badge.svg)](https://github.com/Power-xc/power-ux-harness/actions/workflows/ci.yml)
![skills](https://img.shields.io/badge/skills-11-111)
![format](https://img.shields.io/badge/format-Agent%20Skills-111)
[![MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**[Install](#install)** · [Same problem, different answers](#same-problem-different-answers) · [The eleven skills](#the-eleven-skills) · [Example requests](#example-requests) · [Shared vocabulary](#shared-vocabulary) · [Skill guide (KO)](https://power-ux-harness-guide.vercel.app) · [한국어](README.md)

</div>

## Same problem, different answers

**Email gives you seconds, a messenger gives you a day, a delayed bank transfer gives you three hours.** The same "take back what I sent" runs on undo windows thousands of times apart, because the time it takes to notice a mistake or a scam differs from service to service.

Being in another app is not evidence. Why it worked there, and whether that reason exists in your product, is. These 17 come from the 38-case casebook that `ux-benchmark` starts from.

**Age · ability**

| Same problem                              | One answer                                                                                                                      | The other answer                                                                                           | What split them                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Keep fall detection on?                   | Smartwatch — on automatically for users who entered an age of 55 or over                                                        | Under 55 — choose always-on yourself                                                                       | Age, and the risk of not being able to call for help after a fall                                   |
| Holiday train tickets everyone rushes for | Train booking — people 65+, people with disabilities and others book four days earlier, with a 5-minute limit and phone booking | General booking — a 3-minute limit, routes split across days to spread the load                            | A speed race plus digital skill — queue order, time and a proxy channel matter more than the screen |
| Naming the simple mode                    | Banking apps — launched it as "senior mode"                                                                                     | Only 27.4% of its users were 60+ — renamed it "easy mode"                                                  | An age label stigmatizes; wanting a simpler screen is not about age                                 |
| Booking a neighborhood clinic             | Some clinics — bookings only through a paid app                                                                                 | Government — refusing other ways to register may count as refusing care, so clinics were told to keep both | Access to care is not optional; parents who can't use the app                                       |

**Money · trust**

| Same problem                                | One answer                                                                               | The other answer                                                                    | What split them                                                                          |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Celebrating a finished action               | Work tool — an occasional celebration when a task is done, with a switch to turn it off  | Trading app — in 2021 removed the confetti that rained down after a first trade     | Is it fine to make people do this more? Where money is at stake, show the result plainly |
| Paying the wrong account                    | UK — checks the name the payer typed against the account: match, close match or no match | Korea — shows the account holder's name and the amount for the person to check      | Fraud or a typo? 66.8% of Korea's mistaken transfers were mistyped account numbers       |
| Self-control settings like a gambling block | Turning it on — instant                                                                  | Turning it off — only after the 2 days to 1 year chosen when it went on (a UK bank) | A decision made on impulse versus one made calmly                                        |
| Paying a stranger for a used item           | Local meet-ups — escrow payment started as optional                                      | Items from far-off neighborhoods and e-vouchers — escrow only                       | Can the buyer check the item in person?                                                  |

**Situation**

| Same problem           | One answer                                                                                 | The other answer                                                                        | What split them                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Location data          | Activity-tracking app — hides the first and last 200 m of a route map by default           | Night-walk safety app — sends live location to the guardians you picked on the way home | Is the viewer a stranger or someone you chose?                         |
| Calling for help       | Phone crash detection — a 10-second alert and a 30-second countdown, then it calls for you | Night-walk safety app — the user presses a big button                                   | Can the user respond at all?                                           |
| Messages while driving | Phone — fewer notifications, only urgent ones get through                                  | Car screen — reads messages aloud, takes a spoken reply and reads it back               | Eyes and hands are busy — reduce, or switch channels from eyes to ears |
| A locked phone         | Normally — the lock hides everything                                                       | Emergency medical info only — opens from the lock screen without a passcode             | Not seeing it in an emergency costs more than exposing it              |

**Scale · market**

| Same problem                | One answer                                                                                | The other answer                                                                                                   | What split them                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Uninvited people barging in | Managed organization accounts — admins set the policy                                     | Free and education accounts — once schools came on board, waiting rooms and passwords were on by default (2020-04) | Users who can't find a setting to turn it on, and a class that grinds to a halt       |
| How fast rumors spread      | Private messenger — forward to five chats at once, one chat for highly forwarded messages | Another social network — asks you to read an article you haven't opened before sharing, without blocking you       | Private chats whose content the service doesn't read, versus public posts             |
| Public reaction counts      | Video platform — hid dislike counts from viewers, kept the button and the creator's count | Photo network — lets each person choose whether to hide like counts                                                | Pile-ons aimed at small channels, versus counts that help some people and hurt others |
| Leaving a group chat        | Before — everyone was told when you left                                                  | A Korean messenger — leave quietly; about 2 million people turned it on within three weeks in its lab              | A group chat where leaving is itself a social signal                                  |
| Kiosk accessibility         | Large stores — certified kiosks and voice-guidance devices                                | Under 50 m² and small businesses — staff assistance or a call bell instead                                         | Business size and capacity, and users who would rather order from a person            |

Each case in the [casebook](skills/ux-benchmark/references/casebook.md) lists its sources, the date they were checked, the cost, and where the idea does not transfer. "What split them" mixes what the sources state with the casebook's reading of it; the casebook keeps the two apart. Policies change, so `ux-benchmark` reopens the sources before citing them. The casebook is written in Korean.

## At a glance

- **Context first** — a 20-field context card covers scale, business model, audience, age, device, situation, the cost of a mistake and content sensitivity, and the two or three fields that would flip the answer become the design criteria.
- **Adapt, don't copy** — every comparable case records why it worked there and what it cost, then gets judged adopt, adapt or don't adopt against your context.
- **Exceptions included** — failures, cancellations, mistakes, first and returning use, acting for someone else and suspected fraud are mapped per user segment, so you get a default plus per-exception variants.
- **Start from a planning doc** — give it a domain, links and a doc; it opens every source into a citation table, and personas with cited attributes walk through the candidate designs.
- **Hypotheses stay hypotheses** — synthetic results are labeled as such on the first line, reported as rankings and stability instead of percentages, and always end in a real-user validation plan.
- **Fixes name the pattern** — not "improve feedback" but "snackbar + Undo, 'Note deleted'": pattern, state and copy.
- **Verdicts against standards** — WCAG 2.2, KWCAG 2.2, Korea's dark-pattern guideline and e-commerce act, HEART and SUS, with item numbers behind every PASS or FAIL.
- **Judge only what was seen** — demo and production are recorded separately, states that could not be checked stay on the verdict as "partial", and production is observed with write and analytics requests blocked so a check never changes live data.
- **Skills hand off to each other** — every skill uses the same evidence labels and the same priorities (P1–P3), so one skill's output is the next skill's input.
- **Any agent** — two lines for the Claude Code plugin, one `npx` line for Codex, Cursor, Gemini CLI and Copilot.

The skill files are written in Korean. Agents read them without trouble and answer in the language you ask in, and `ux-writing` carries English UI-copy rules as well as Korean ones. The demo GIFs show Korean UI.

## Flow

Following one feature from the first question to release looks like this. You can also call any single skill on its own.

| Step             | Skill              | Produces                                                                    |
| ---------------- | ------------------ | --------------------------------------------------------------------------- |
| Context          | `ux-benchmark`     | Context card · comparable sources · insights · context-fit proposals        |
| Explore          | `ux-simulate`      | Source table · synthetic personas · ranked candidates · real-user test plan |
| Confirm          | `ux-research`      | Research plan · interview guide · usability-test tasks · synthesis          |
| Define           | `ux-flow`          | Flow diagram · screen list · screen × state table · navigation              |
| Design           | `ux-spec`          | Screen spec with numbered regions · handoff checklist                       |
| Copy             | `ux-writing`       | Error, button, empty-state and dialog copy · glossary                       |
| Review           | `ux-review`        | Heuristic and pattern verdicts · P1–P3 findings · fixes                     |
| Accessibility    | `ux-a11y`          | WCAG 2.2 and KWCAG 2.2 audit                                                |
| Deceptive design | `ux-dark-patterns` | Verdicts on 13 types · sign-up vs. cancel path comparison                   |
| Measure          | `ux-metrics`       | HEART metrics · guardrails · experiment plan                                |
| AI screens       | `ux-ai`            | 18 human–AI interaction guidelines · AI screen patterns                     |

## The eleven skills

### ux-benchmark

**Context card → comparable services → insights → a default plus context-specific variants.**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/benchmark-dark.gif">
  <img src="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/benchmark-light.gif" width="800" alt="For a money-transfer app whose users over 60 are growing, the context card picks digital skill, cost of a mistake and exposure to fraud as the deciding context; a domestic bank's delayed transfer, a foreign bank's payee-name check and an email undo are broken into why each worked and what it cost, and judged adapt, adopt and don't adopt; the result shows a default that displays the payee's name large next to a variant for first-time accounts and amounts of 1,000,000 won or more that adds two confirmations, an optional guardian alert and arrival 30 minutes later, plus an exception that stops the transfer when the name doesn't match">
</picture>

Given a description, a URL or a planning doc, it fills a 20-field context card — business, users, situation, risk — with evidence, and picks the two or three fields that would flip the answer if their values flipped. It chooses five to eight comparables across three rings — direct competitors, other industries that share the deciding context, and extreme cases where the risk is higher or users are more vulnerable — opens their official material, records why each worked and what it cost, and proposes a default plus variants for the exceptions that matter in your context.

- **When** — "How do similar services handle this?", "Find what worked elsewhere and adapt it to us", "More of our users are in their 60s, how should this screen change?", `@ux benchmark`, `@ux context`
- **Age becomes fields** — "users in their 60s" is rewritten as digital skill, eyesight, motor precision, cognitive load, a helper and exposure to fraud: fields you can design for. An age label stigmatizes, and the same need shows up at any age.
- **Context distance** — each case is checked against your context and judged adopt, adapt or don't adopt, with a one-line reason. Every proposal carries at least one "don't copy this" and one "try this small first".
- **Weight of evidence** — each case keeps the facts apart from the evidence that it worked (an official ruling or announcement > a record of keeping or expanding it > review reactions > inference), and cases exposed by sanctions or rulings become counterexample cards. Screens behind a login count only the steps public material confirms.
- **Never** — "because the competitor does it", citing a source it did not open, copying screens or copy, or splitting people by age alone.

<details>
<summary>Example output — a large transfer to a first-time account</summary>

```markdown
Context card (excerpt)

| Field                | Value                                               | Evidence            | Design impact                                  |
| -------------------- | --------------------------------------------------- | ------------------- | ---------------------------------------------- |
| B1 Stage · scale     | Growth stage · small support team                   | S1 company page     | No plan that relies on manual review           |
| U2 Digital skill     | Widely spread · share of 60+ rising                 | S2 app analytics    | Split by risk signals, not by age              |
| R1 Cost of a mistake | A large amount sent wrongly is hard to recover      | S3 recovery program | Confirm before sending · cancel before arrival |
| R4 Exposure to fraud | Concentrated on first-time accounts · large amounts | assumption          | Validation plan #1                             |

Deciding context: U2 digital skill · R1 cost of a mistake · R4 exposure to fraud

| Comparable                       | Ring                         | Why it worked there                          | Cost                            | Context distance                                                   |
| -------------------------------- | ---------------------------- | -------------------------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| Domestic bank — delayed transfer | Direct competitor            | Time to realize you were scammed             | Urgent transfers wait too       | Adapt — 30 minutes, only for first-time accounts and large amounts |
| Foreign bank — payee-name check  | Direct competitor · abroad   | Says before sending whether the name matches | A mismatch needs one more check | Adopt — show the payee's name large                                |
| Email — undo send                | Same context, other industry | Undoes a slip right after sending            | Nothing to do after 30 seconds  | Don't adopt — seconds are too short to notice a scam               |

Proposal
Default: show the payee's name large · stop when the name doesn't match
Variant: first-time account · 1,000,000 won or more → two confirmations + optional guardian alert + arrives in 30 minutes, cancel until then
Exception: name mismatch → "The payee's name doesn't match. You can't send until you check it again."
Don't copy: extra checks triggered by age alone — it stigmatizes and misses the same risk in younger users
Try small first: turn on the 30-minute arrival only for large first-time transfers and watch cancellations before arrival and support contacts

Validation plan

| Riskiest assumption                            | How to check                             | Result that flips it                        |
| ---------------------------------------------- | ---------------------------------------- | ------------------------------------------- |
| 30 minutes is enough to notice a scam          | Reasons for cancellations before arrival | Most reports come in after 30 minutes       |
| Two confirmations don't block normal transfers | Usability test with 5 people + drop-off  | More people abandon normal transfers midway |

Verdict: READY
```

</details>

### ux-simulate

**Desk research → synthetic personas → candidate walkthroughs → recommendation and validation plan.**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/simulate-dark.gif">
  <img src="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/simulate-light.gif" width="800" alt="Given a domain, links and a planning doc, the skill opens 12 sources, four personas with source chips try three sign-up screen thumbnails (one screen, step by step, browse first), and the result grid recommends option B as a hypothesis to confirm with five real users">
</picture>

Given a domain, links and a planning doc, it opens every source and tags it with an ID, then researches the rules that apply, how similar services structure the flow, and what app reviews complain about. Three to five personas built from structured attributes walk through two or three candidate designs step by step (a cognitive walkthrough), and the least obstructed candidate is recommended with its chain of evidence.

- **When** — "Here's the doc and some links, which UX fits?", "Narrow the options before we interview anyone", `@ux simulate`, `@ux discover`
- **Personas** — every attribute carries a source ID or `가정` (assumption); an accessibility or edge persona and a skeptic are mandatory. It also explains how to draw a stratified sample from a public synthetic-persona dataset aligned to Korean population statistics. Accessibility conditions are given as captures rendered under that condition, not as a description.
- **Trustworthy runs** — candidates described with the same number of pros and cons and differing in one element at a time, repeated runs with shuffled order and unordered labels (three by default), an empty persona and a demographics-only baseline, a hidden decoy with a deliberate flaw that is also checked with a separate yes/no question, single-candidate runs for first impressions, and a log of model, prompt and date.
- **Never** — percentages like "70% of users prefer", citing a source it did not open, or a recommendation without a validation plan.

### ux-research

**Pick the method that fits the question, design interviews and usability tests, and turn findings into a decision.**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/research-dark.gif">
  <img src="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/research-light.gif" width="800" alt="A research plan opens with the question of why people stop using reading notes and the decision it serves; on its say-versus-do, why-versus-how-much 2×2 method map only contextual interviews and five usability-test participants are highlighted, and in the interview guide and a task card on a small device screen a leading question and a label-revealing task are struck through and the rewritten lines get PASS">
</picture>

- **When** — "Why do people drop out of onboarding?", "Tasks and a script for five participants next week", "Turn these eight interview transcripts into what we fix next", "Where and why do people drop out at checkout?"
- **What it does** — narrows the question to one decision and picks the method by the shape of the question — funnels and heatmaps for where people drop out, interviews and observation for why, A/B tests for whether a fix really works — instead of defaulting to interviews, and confirms big decisions with a second method from another angle. It asks about past behavior instead of opinions, keeps screen labels out of tasks, and recruits five per round.
- **Aliases** — `@ux research` · `@ux interview` · `@ux usability-test`

### ux-flow

**Flow diagrams with the happy, error and recovery paths, a screen list, and a screen × state table.**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/flow-dark.gif">
  <img src="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/flow-light.gif" width="800" alt="Five screen thumbnails from sign-up to order complete are joined by arrows, each gains state chips for error, loading, empty list, empty cart, processing, failed and end, dashed arrows carry a payment failure and a lost connection to a pick-another-method sheet and a saved cart, and two open decisions stay on the last line">
</picture>

- **When** — "Screens and edge cases from sign-up to first order", "Structure the My Page menu"
- **What it does** — draws the task flow in Mermaid, gives every screen an ID (`SCR-ORD-03`), records loading, empty, error, done and end states, and collects open policy questions separately. A hub screen such as home, which branches to many destinations, uses an entry → destination table as its completion condition, and screens that render differently in demo and production get a code-branch table. Top-level desktop menus are not hidden behind a hamburger, and on mobile four or fewer destinations all stay visible.
- **Aliases** — `@ux flow` · `@ux ia`

### ux-spec

**A screen spec with numbered regions: component name, behavior, states, copy, data, accessibility and events for each.**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/spec-dark.gif">
  <img src="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/spec-light.gif" width="800" alt="Four regions of the SCR-SET-02 profile-edit screen get numbers, then the input, save button, cancel button and snackbar get their copy, states, accessibility names and events">
</picture>

- **When** — "A spec developers can build from", "A screen spec an agent can implement directly"
- **What it does** — pins down names people mix up (toast vs. snackbar, dialog vs. bottom sheet) so design, engineering and agents call the same thing by the same name, writes icon-only buttons known by their shape (hamburger, kebab, meatball) by function and accessible name, picks between 18 look-alike pairs (switch vs. checkbox, menu vs. select, tooltip vs. popover …) with one deciding question, names indicators, rating widgets, share icons and screen transitions, and, when an AI draws the screen, replaces "make it pretty" with a style name plus the accessibility criteria that style breaks first. It runs a handoff checklist for missing states and copy.
- **Alias** — `@ux spec`

### ux-writing

**Error messages that say what went wrong, why and how to fix it; buttons that name the result; Korean and English rules.**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/writing-dark.gif">
  <img src="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/writing-light.gif" width="800" alt="On a payment screen a card-number error with no cause and Cancel and OK buttons are flagged P1, then the same screen shows a sentence that says what is wrong, why and how to fix it with Close and Pay buttons, and passes">
</picture>

- **When** — "Polish these error messages", "Every button says OK, what should each say?", "Review our English UI copy"
- **What it does** — writes errors, buttons, empty states, notifications, confirmation dialogs, permission requests and form labels by Korean and English rules, and builds a glossary so one thing keeps one name.
- **Aliases** — `@ux write` · `@ux copy-review`

### ux-review

**Reviews screens against heuristics and pattern fit, and writes fixes down to pattern, state and copy.**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/review-dark.gif">
  <img src="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/review-light.gif" width="800" alt="A screen that confirms an irreversible note deletion only with a toast is rated P1, fixed with a snackbar and Undo, and accepted once a single Undo restores the note">
</picture>

- **When** — "Users seem lost in onboarding", "Delete only shows a toast; Undo or a confirmation dialog?", "A switch plus a Save button, is that OK?"
- **What it does** — finds heuristic violations along the observed path, checks whether each notification fits its interruption level (0–3) and whether a pricing table shows its comparison items, the basis of its recommendation and the billed amount, and whether a completion cue fits the size of the task, then converts severity to P1–P3 and picks the one to three fixes to do first.
- **Scope of the verdict** — splits empty states by why they are empty (first use, no results, offline, permission, all caught up, just emptied, failed to load, locked) and catches false empty states that show a failed load as "nothing here yet"; also checks near-empty first-run (cold start), error and end states; errors that cannot be triggered safely in production are reproduced by failing requests in a demo build or confirmed in code. A state still unseen adds "partial" to the verdict, and a block that happens only on some devices, permissions or data adds "conditional". When a screen renders differently in demo and production, every finding records the observed build.
- **Aliases** — `@ux review` · `@ux funnel`

### ux-a11y

**WCAG 2.2 AA audits, cross-checked against KWCAG 2.2 and Korea's mobile-app accessibility standard by item number.**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/a11y-dark.gif">
  <img src="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/a11y-light.gif" width="800" alt="On a delivery-address screen, overlapping 24-pixel circles around 20-pixel icon buttons (2.5.8), a 2.6 to 1 link contrast (1.4.3) and focus hidden behind a sticky bar (2.4.11) are numbered and marked FAIL, then the same screen gets 44-pixel touch targets, contrast above 4.5 to 1 and scroll padding, and all three pass">
</picture>

- **When** — "Prepare for an accessibility certification", "Can a screen-reader user finish checkout?", "Are our touch targets big enough?"
- **What it does** — checks keyboard and focus, accessible names and roles, contrast, target size, time limits, forms and authentication, and labels each result as automated, manual, code-inferred or not checked. Text over images, gradients or translucent layers is measured from screenshot pixels with a bundled script.
- **Alias** — `@ux a11y`

### ux-dark-patterns

**Checks sign-up, checkout, subscription, consent and cancel flows against Korea's 13 dark-pattern types and its e-commerce act.**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/dark-patterns-dark.gif">
  <img src="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/dark-patterns-light.gif" width="800" alt="Four findings on a subscription-cancel screen (obstruction, a guilt-inducing decline line, false hierarchy and preselection) are numbered and marked P1 or P2, then the same screen shows two equal buttons, an unchecked optional consent and a neutral line, and each item passes">
</picture>

- **When** — "Is our cancel flow legal?", "An add-on is pre-checked at checkout", "Is this pop-up too frequent?", "Can we add a pricier plan so the middle one sells?", "Where should the label go on ad cards mixed into the feed?"
- **What it does** — counts the steps of the sign-up and cancel paths side by side, pairs each type with an honest alternative, separates honest use from deception for pricing-table nudges (anchoring, the compromise effect, decoy plans, struck-through list prices), checks how ads are told apart from content in ad- or sponsorship-funded services, measures whether cancellation and account deletion show the restore deadline as a date and offer the app-store account-deletion path, adds EU DSA and US FTC checks for overseas users, and leaves the final legal call to counsel.
- **Alias** — `@ux dark`

### ux-metrics

**HEART with goals, signals and metrics, guardrails, SUS, and experiment plans with decision rules written first.**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/metrics-dark.gif">
  <img src="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/metrics-light.gif" width="800" alt="Four numbered pins mark a note-sharing sheet screen, the goal–signal–metric table for the five HEART categories points at the same numbers and event names in its signal column, Engagement is excluded as off-goal, and a note-deletion guardrail is added">
</picture>

- **When** — "Define success metrics", "Will a step-by-step sign-up raise the completion rate?", "Score our SUS survey"
- **What it does** — defines metrics per user (denominator, window, unit), adds guardrails, writes the decision rule before the experiment starts, and, when real users are too few to reach the required sample, plans no A/B test: it lays the events first, reads rates only as observation metrics and defers the decision rule until the sample is reached.
- **Aliases** — `@ux metrics` · `@ux experiment`

### ux-ai

**AI feature screens: stating limits, stopping generation, exact citations, regeneration that keeps versions, approval before actions, failure handling.**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/ai-dark.gif">
  <img src="https://raw.githubusercontent.com/Power-xc/power-ux-harness/main/assets/demos/ai-light.gif" width="800" alt="On a book-summary chat screen a Stop button shows while the answer streams and turns into Regenerate 1/2 when it ends, and numbered callouts point out the page-number source chips, the note on what could not be verified, and feedback with reasons">
</picture>

- **When** — "Design our AI chat screen", "Where do citations and Regenerate go?", "What should the agent show before it sends an email for me?"
- **What it does** — checks 18 human–AI interaction guidelines across first use, during use, when wrong and over time, and names screen elements by pattern (suggested prompts, streaming + Stop, citation chips, approval before action …). Promises in guide and onboarding copy are checked line by line against the result screen's defaults. For features that assemble a screen per request, it checks that the same request yields the same structure and that a re-plan shows what changed and asks before changing a confirmed booking or payment.
- **Alias** — `@ux ai`

## Example requests

| Ask                                                                                               | Fires              |
| ------------------------------------------------------------------------------------------------- | ------------------ |
| See how similar services guard large transfers to first-time accounts and adapt it to us          | `ux-benchmark`     |
| More of our users are in their 60s; use cases that worked elsewhere to rethink this checkout      | `ux-benchmark`     |
| Use the doc and market data to run personas and tell me which of two onboarding options is better | `ux-simulate`      |
| I'm testing a new booking flow with five users next week, write the tasks and the script          | `ux-research`      |
| List the screens and edge cases from sign-up to first order                                       | `ux-flow`          |
| Spec just the payment-method screen: components, states and copy by region                        | `ux-spec`          |
| Every button says OK, decide what each screen's button should say                                 | `ux-writing`       |
| Delete only shows a toast that disappears; should we add Undo or a confirmation dialog?           | `ux-review`        |
| Can a screen-reader user get through checkout? Check contrast and focus order                     | `ux-a11y`          |
| The cancel button sits small at the bottom of My Page, is that a dark pattern?                    | `ux-dark-patterns` |
| Set metrics and guardrails to tell whether the onboarding revamp worked                           | `ux-metrics`       |
| What confirmation should an AI agent show before sending an email for me?                         | `ux-ai`            |

All 56 request–skill pairs live in [`evals/cases.json`](evals/cases.json). Requests that are easy to confuse with a neighboring skill carry `shouldNotFire`, which pins the boundary.

## Install

### Claude Code

```text
/plugin marketplace add Power-xc/power-ux-harness
/plugin install power-ux-harness@power-ux-harness
```

### Codex · Cursor · Gemini CLI · GitHub Copilot

Installs into `.agents/skills`, the project location several agents read. Requires Node.js 22 or later.

```sh
npx github:Power-xc/power-ux-harness                    # all eleven into this project
npx github:Power-xc/power-ux-harness --only ux-review,ux-a11y
npx github:Power-xc/power-ux-harness --tool both        # .agents/skills and .claude/skills
npx github:Power-xc/power-ux-harness --list             # list the skills
```

Re-running skips identical files. If a skill with the same name but different content exists (including one you edited), its whole folder is skipped and reported as a conflict; only `--force` overwrites it. `--dry-run` prints the plan first.

### Copy by hand

Copy `skills/<id>` into your agent's skills folder. Each folder works on its own; the body completes the procedure even without another skill's reference files.

## Shared vocabulary

Every skill uses these words in the same sense. That is how `ux-spec` turns a `ux-review` finding into a spec as is, and how `ux-research` takes a `ux-simulate` hypothesis as its test task.

| Term                        | Meaning                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `observed`                  | Seen directly on a screen, prototype or recording                                       |
| `code-inferred`             | Confirmed from code and state branches but not rendered                                 |
| `reported`                  | Said by a participant or customer                                                       |
| `hypothesis`                | Inferred; synthetic simulation results always belong here                               |
| `PASS` · `FAIL` · `BLOCKED` | Verdicts of review skills; BLOCKED means environment or access stopped a required check |
| `N/A` · `NOT_CHECKED`       | Does not apply · applies but was not checked                                            |
| `P1` · `P2` · `P3`          | Task impossible, loss, deception / flow stops, round trips / friction                   |

When merging reports from several skills, read `ux-a11y`'s `automated` · `manual` as `observed`, and `ux-benchmark`'s `가정` (assumption) as `hypothesis`.

## Standards

Verdicts rest on published standards; each skill's `references/` opens with its sources and their publication or effective dates.

- **Accessibility** — WCAG 2.2, KWCAG 2.2 (KS X OT0003:2022), Korea's mobile-app content accessibility standard (KS X 3253:2025)
- **Deceptive design** — the dark-pattern provisions of Korea's e-commerce consumer-protection act (in force 2025-02-14), the Korea Fair Trade Commission's guideline on online interfaces against dark patterns (2026-10-06) and its review guideline on endorsements and testimonials in advertising, EU DSA Article 25, the US FTC staff report and Endorsement Guides
- **Research and metrics** — heuristic evaluation and severity, cognitive walkthroughs, choosing methods by question type and triangulation, HEART, SUS, controlled-experiment design
- **Synthetic users** — the repeat, baseline, decoy and rank-only reporting rules come from studies of the positivity bias, reduced variance and option-order bias of synthetic responses
- **Context and cases** — the context card builds on ISO 9241-11's view of usability within a context of use and adds business and risk fields; the eyesight, motor and cognition fields lean on WCAG 2.2 and Korea's digital divide survey. The 38 cases were checked against official help pages, press releases and regulators' documents, with the date each was opened

## Checks and contributing

```sh
npm test
```

Checks skill structure and size, required section order, hard-gate numbering, relative links, chaining targets, trigger cases, the README skill list, manifest versions, and secrets, absolute paths and tool-attribution lines, then runs the script tests. No dependencies to install. The rules for adding or changing a skill are in [CONTRIBUTING.md](CONTRIBUTING.md) (Korean).

The README GIFs are rendered from the deterministic scenes in [`demos/`](demos/); edit a scene and re-render with the same command.

## Related

- [power-persona-sim](https://github.com/Power-xc/power-persona-sim) — a survey simulator that runs questionnaires and in-depth interviews at scale with synthetic personas aligned to population statistics. Where `ux-simulate` screens one design decision, it covers market research broadly.

## License

[MIT](LICENSE)
