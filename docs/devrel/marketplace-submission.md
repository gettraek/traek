# Marketplace Submission Guidelines

Everything you need to know to publish your plugin, theme, or template to the Træk Marketplace.

---

## Submission Overview

```
1. Prepare   →  2. Submit   →  3. Review   →  4. Published
  (your work)    (wizard)      (2-5 days)      (live listing)
```

Submissions are reviewed by the Træk team. We aim for a 2–5 business day turnaround. Priority review (< 24 h) is available for Creator Pro and Partner tiers.

---

## Before You Submit

### Required checklist

- [ ] `traek-plugin.json` manifest is valid (`traek-plugin validate`)
- [ ] Package builds without errors (`pnpm build`)
- [ ] Tests pass (`pnpm test`)
- [ ] `README.md` follows the [plugin documentation template](../plugin-docs-template.md)
- [ ] At least one screenshot or demo GIF (dark theme preferred)
- [ ] License file is present
- [ ] `npm pack` preview looks correct (no secrets, no dev files)

### Strongly recommended

- [ ] A live demo link or CodeSandbox
- [ ] A changelog (`CHANGELOG.md` or GitHub Releases)
- [ ] Accessibility: keyboard navigable, ARIA labels on interactive elements
- [ ] Works with all three framework adapters (`@traek/svelte`, `@traek/react`, `@traek/vue`) or clearly documents which are supported

---

## Submission Wizard

Navigate to **marketplace.gettraek.com/submit** and complete the 3-step wizard:

### Step 1 — Package details

| Field | Notes |
|-------|-------|
| npm package name | Must be published to npm (or GitHub Packages) before review |
| Version | The specific version to list |
| Category | component / theme / template / plugin |
| Pricing | Free, one-time ($1–$999), or subscription ($1–$99/mo) |

### Step 2 — Listing content

| Field | Notes |
|-------|-------|
| Display name | ≤ 40 chars |
| Short description | ≤ 150 chars — shown on browse card |
| Long description | Markdown, shown on detail page; max 5,000 chars |
| Screenshots | PNG/WebP, min 1200×800px, max 5 images |
| Demo URL | Optional but strongly recommended |
| Tags | 1–5 lowercase tags |

### Step 3 — Creator profile & payout

| Field | Notes |
|-------|-------|
| Creator name | Public display name |
| Creator URL | Your website or GitHub |
| Stripe Connect | Required for paid listings — connect your Stripe account |
| Tax info | W-9 (US) or W-8BEN (international) for paid listings |

---

## Review Criteria

The review team evaluates submissions on five dimensions:

### 1. Functionality (required to pass)

- Installs cleanly with `npm install`
- Renders correctly on a Træk canvas
- Does not throw unhandled errors during normal use
- Does not break the host application on removal

### 2. Code quality

- No `eval()`, `Function()`, or dynamic `<script>` injection
- No telemetry or analytics sent without user opt-in
- No hardcoded credentials or API keys
- Dependencies are well-maintained (no packages with known critical CVEs)

### 3. Documentation

- README explains what the plugin does, how to install, and how to configure it
- All public API surface is documented
- Breaking changes are noted in a changelog

### 4. Design & accessibility

- Respects `--traek-*` CSS tokens (components and themes)
- Interactive elements are keyboard accessible
- Colour contrast meets WCAG AA (4.5:1 for text)
- Works in both dark and light canvas contexts (or clearly states dark-only)

### 5. Listing quality

- Screenshot accurately represents the plugin
- Description is honest and complete
- Pricing matches the feature set

---

## Review Outcomes

| Outcome | What happens |
|---------|-------------|
| **Approved** | Listing goes live; you receive an email confirmation |
| **Approved with notes** | Listed with minor suggestions for a future update |
| **Changes required** | Blocked — address the listed issues and resubmit |
| **Rejected** | Blocked permanently (e.g. policy violation, malicious code) |

If you disagree with a rejection, email **marketplace@gettraek.com** with the submission ID. We review appeals within 5 business days.

---

## Updating a Listing

1. Publish a new version to npm.
2. Go to your **Creator Dashboard → Listings → Edit**.
3. Enter the new version number.
4. Minor updates (docs, patch bug fixes) publish automatically.
5. Major updates (new features, pricing changes) go through an expedited review (< 24 h).

---

## Content & Conduct Policies

The following are not permitted on the Marketplace:

- Malware, spyware, or any code that harms users
- Exfiltrating user data without explicit consent and disclosure
- Impersonating other creators or official Træk packages
- Keyword stuffing in titles or descriptions
- Listings that exist solely to reserve a name
- Adult content

Violations result in immediate removal and may result in a permanent ban.

---

## Creator Tiers

| Tier | How to qualify | Perks |
|------|---------------|-------|
| **Contributor** | Default | Basic listing, standard review |
| **Creator** | 100+ installs | Featured placement eligibility, priority review |
| **Creator Pro** | $500 MRR | Priority review (< 24 h), early access to new APIs |
| **Partner** | Invited | Co-marketing, dedicated account manager, custom revenue terms |

---

## Questions?

- Docs: **docs.gettraek.com/marketplace**
- Email: **marketplace@gettraek.com**
- Discord: **#marketplace-dev** channel
