# træk OSS Health Metrics

Canonical definitions for all open-source health metrics tracked by the CMO. Used to populate the monthly community health report and inform quarterly strategy reviews.

---

## Core Metric Definitions

### 1. Stars Velocity

**Definition:** New GitHub stars gained per week, measured as a rolling 7-day average.

**Why it matters:** Indicates organic discovery and brand momentum. Spikes correlate with launches, blog posts, and HN/Reddit posts. Declining velocity is an early signal of content fatigue.

**Calculation:**
```
stars_velocity = (stars_this_week - stars_last_week)
rolling_7d_avg = average of last 4 weekly deltas
```

**Targets:**
| Phase | Weekly target |
|-------|--------------|
| Pre-launch | — |
| Launch week | 100+ |
| Month 1-3 | 20+ |
| Month 4-12 | 10+ |

**Source:** GitHub Insights → Traffic → Clones & Visitors; supplement with [star-history.com](https://star-history.com) for charts.

---

### 2. Fork-to-PR Ratio

**Definition:** Percentage of forks that result in at least one opened pull request (within 90 days of forking).

**Why it matters:** Forks without PRs indicate developers experimenting privately but not contributing back. Low ratios suggest friction in the contribution path.

**Calculation:**
```
fork_to_pr_ratio = (forks_with_pr / total_forks) * 100
```

Measure forks created in a rolling 90-day window vs. PRs opened by those fork authors.

**Targets:**
| Phase | Target ratio |
|-------|-------------|
| Launch | >5% |
| 6-month | >10% |
| 12-month | >15% |

**Source:** GitHub API — cross-reference fork authors against PR authors. Manual monthly query until automation is built.

---

### 3. Time-to-First-Response (TTFR)

**Definition:** Median time between a new issue/PR being opened and the first maintainer comment or review.

**Why it matters:** The single strongest predictor of contributor retention. >48h TTFR is where contributors disengage. For `good first issue` PRs, target is 24h.

**Calculation:**
```
ttfr_issue = median(first_maintainer_comment_at - issue_created_at)
ttfr_pr    = median(first_review_at - pr_created_at)
```

Measure separately for issues and PRs. Exclude weekends from calculation (CET business hours).

**Targets:**
| Type | Target |
|------|--------|
| Issues | < 48h |
| PRs | < 48h |
| `good first issue` PRs | < 24h |

**Source:** GitHub Insights → Pull Requests → Review time; or use [Velocity by CodeClimate](https://velocity.codeclimate.com) or [Linear-style manual audit](https://github.com).

---

### 4. Contributor Retention

**Definition:** Percentage of contributors who made at least one contribution in a given quarter that also contributed in the following quarter.

**Why it matters:** Acquisition is cheap; retention builds a sustainable community. A high churn rate (one-and-done contributions) means onboarding works but the community is not sticky.

**Calculation:**
```
retention_rate = (contributors_active_in_Q(n) AND Q(n+1)) / contributors_active_in_Q(n)
```

A "contribution" is any merged PR or substantive comment/discussion post.

**Targets:**
| Phase | Quarterly retention |
|-------|-------------------|
| 6-month | > 20% |
| 12-month | > 35% |

**Source:** GitHub Insights → Contributors; manual quarterly cohort analysis.

---

### 5. Supporting Metrics (Track Monthly)

| Metric | Description | Target (12mo) |
|--------|-------------|---------------|
| Open issues avg age | Mean days a non-closed issue has been open | < 14d |
| `good first issue` open count | Issues currently labeled and unassigned | 5-10 |
| Discord members | Total server members | 200 |
| Monthly active Discussion posters | Unique authors posting in GitHub Discussions | 40 |
| External contributors (lifetime) | Unique authors with merged PRs not on core team | 50 |
| PRs merged per month | Volume indicator | 8+ |
| npm weekly downloads | Library adoption | 500+ |

---

## GitHub Insights Setup

### Enable GitHub Insights

1. Go to `github.com/gettraek/traek` → **Insights** tab.
2. Review these built-in views monthly:
   - **Traffic** → Views, Unique visitors, Clones (stars not shown; use star-history.com)
   - **Contributors** → Commits, additions, deletions per contributor
   - **Pulse** → Weekly merged PRs, open issues, closed issues

### Supplementary Tools

| Tool | Purpose | Cost |
|------|---------|------|
| [star-history.com](https://star-history.com/#gettraek/traek) | Stars over time chart | Free |
| GitHub Insights (built-in) | Traffic, clones, referrers | Free |
| [OpenCollective](https://opencollective.com) | Financial contributors (future) | Free |
| Manual spreadsheet | TTFR, fork-to-PR, retention | Free |

### Monthly Data Pull (Manual Process Until Automated)

On the first Monday of each month:

```bash
# Stars count
gh api repos/gettraek/traek --jq '.stargazers_count'

# Forks count
gh api repos/gettraek/traek --jq '.forks_count'

# Open issues count
gh api repos/gettraek/traek/issues?state=open --jq 'length'

# Contributors list
gh api repos/gettraek/traek/contributors --jq '.[].login'

# Recent PRs (last 30 days)
gh pr list --repo gettraek/traek --state merged --limit 100 \
  --json mergedAt,author,title | jq '[.[] | select(.mergedAt > "YYYY-MM-DD")]'
```

Paste into the monthly health report template (`docs/community/monthly-health-report-template.md`).

---

## Metric Ownership

| Metric | Owner | Cadence |
|--------|-------|---------|
| Stars velocity | CMO | Weekly |
| Fork-to-PR ratio | CMO | Monthly |
| TTFR | CMO (flag to CTO if >48h) | Weekly |
| Contributor retention | CMO | Quarterly |
| Supporting metrics | CMO | Monthly |

---

## References

- Monthly report template: `docs/community/monthly-health-report-template.md`
- Contributor recognition: `docs/community/contributor-recognition-program.md`
- First-timer pipeline: `docs/community/first-timer-pipeline.md`
- Engagement plan: `docs/community/engagement-plan.md`
