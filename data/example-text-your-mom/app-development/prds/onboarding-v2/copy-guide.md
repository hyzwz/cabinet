---
title: Onboarding V2 Copy Guide
created: '2026-04-16T00:00:00Z'
modified: '2026-04-16T00:00:00Z'
tags:
  - onboarding
  - copy
  - prd
  - ob2
order: 2
---
# Onboarding V2 Copy Guide

Supporting OB-2 (Emotional Copy Rewrite). Every line here follows the rule from the PRD: no "task," "schedule," "productivity," or "alert." The product feels like a caring friend, not a reminder app.

---

## Screen 1 — Welcome

**Headline:** You meant to text them. We get it.

**Sub:** Text Your Mom sends you a quiet nudge before "I'll reply later" turns into two weeks of nothing.

**CTA button:** Let's set this up

*Avoid:* "Get Started," "Sign Up," "Create Account" — these feel like admin, not care.

---

## Screen 2 — Pick Your People

**Headline:** Who would you hate to drift from?

**Sub:** Just names for now. No contacts access needed at this step.

**Input placeholder:** A name (anyone)

**Helper text beneath input:**
> These don't have to be the people you talk to most. Just the ones you'd feel bad about not replying to.

**Minimum 1, soft nudge toward 3:**
> Even one person is a great start.

**Skip link (if shown):** I'll add people later

---

## Screen 3 — What a Nudge Actually Looks Like

**Headline:** Not a task. Just a tap on the shoulder.

**Sub:** Here's what we'll send you:

**Preview notification card:**
> Hey — it's been a few days since you talked to [Name]. A quick text goes a long way. 💬

**Below the card:**
> You can change the timing and tone any time. We'll never nag. Promise.

**CTA:** That works for me

---

## Screen 4 — Frequency

**Headline:** How often does [Name] usually hear from you?

**Options (radio list):**

| Label | Sub-label |
|---|---|
| Every week | For people you'd hate to accidentally drift from |
| Every two weeks | For people you care about but see less often |
| Once a month | For people who would genuinely be surprised and happy |

**Footer note:**
> This isn't a commitment. Change it any time, or skip a nudge whenever you want.

---

## Screen 5 — Permission Request

**Headline:** Can we send you nudges?

**Sub:** You've already seen what they look like. This just lets us actually deliver them.

*[System notification permission dialog fires here]*

**If user denies notification permission:**
> No problem — you can always open the app to check in. We'll prompt you gently from inside for now.

*Do not make the user feel bad about saying no.*

---

## Screen 6 — Done

**Headline:** You're all set.

**Sub:** Your first nudge for [Name] will come [day, time]. If it sparks a good conversation, that's the whole point.

**CTA:** I'm in

**Secondary (link):** Add another person

---

## Microcopy Bank

Use these for edge cases, error states, and in-app copy that flows from onboarding tone.

| Situation | Copy |
|---|---|
| User types a name but doesn't submit | "That someone sounds important." |
| Permission denied (post-onboarding prompt) | "Still here when you're ready." |
| First nudge fires | "Hey — it's been a few days. You know what to do." |
| User disables a contact mid-session | "Got it. You can always bring them back." |
| 7-day streak of replies | "Look at you. [Name] is lucky to have you." |
| User snoozes a nudge | "Understood. We'll try again in [X]." |
| App opened but no action taken | "No pressure. Just checking in." |

---

## Copy Rules (repeat of PRD, for dev reference)

1. Never use: task, schedule, productivity, alert, notification permission, tracking
2. Always use: nudge, tap, check in, stay close, reply, drift, relationship
3. Tone test: would you send this to someone you care about? If yes, it ships.
4. Humor is allowed. Guilt is not.
