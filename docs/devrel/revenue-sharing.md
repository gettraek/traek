# Revenue Sharing & Payouts

Everything about how Træk shares Marketplace revenue with creators.

---

## Revenue Split

| Creator tier | Your share | Træk share |
|-------------|-----------|------------|
| Contributor | 70% | 30% |
| Creator | 70% | 30% |
| Creator Pro | 70% | 30% |
| Partner | Negotiated | Negotiated |

The 70/30 split applies to all paid listing types: one-time purchases and recurring subscriptions. There are no additional platform fees beyond Stripe's standard payment processing costs (~2.9% + $0.30 per transaction), which are deducted before the split is applied.

### Example calculation

A $9.99/month subscription with 100 active subscribers:

```
Gross revenue:      $999.00
Stripe fees (~3%):  - $29.97
Net revenue:        $969.03
Your share (70%):   $678.32
Træk share (30%):   $290.71
```

---

## Payout Schedule

Payouts are processed **monthly on the 15th** for the previous calendar month's revenue. You must have a minimum balance of **$25** to receive a payout. Balances below $25 roll over to the next month.

| Day | Event |
|-----|-------|
| 1st | Previous month closes |
| 5th | Revenue reconciliation completes |
| 15th | Payout initiated via Stripe Connect |
| 15–22 | Funds arrive (depends on your bank) |

---

## Stripe Connect Setup

Payouts are processed through **Stripe Connect**. You must connect a Stripe account before your paid listing can go live.

1. Go to **marketplace.gettraek.com/creator/settings**
2. Click **Connect with Stripe**
3. Complete Stripe's onboarding (identity verification + bank account)
4. Træk sends payouts directly to your connected bank account

Stripe supports payouts to **40+ countries**. See [Stripe's supported countries](https://stripe.com/global) for the full list.

### Tax information

Træk is required to collect tax information for creators earning over $600/year (US) or the equivalent threshold in your country.

| Location | Form required |
|----------|--------------|
| United States | W-9 |
| Outside US | W-8BEN (individuals) or W-8BEN-E (entities) |

Forms are collected during Stripe onboarding. Træk will issue a 1099-K at year end if applicable.

---

## Subscription Lifecycle

| Event | Revenue treatment |
|-------|-----------------|
| New subscription | Prorated from purchase date to end of billing month |
| Renewal | Full month credited on renewal date |
| Cancellation | No refund after billing date; revenue credited for full period |
| Refund (< 7 days) | Charged back from your balance |
| Refund (7–30 days) | Discretionary; Træk covers refunds for creator-verified bugs |
| Dispute/chargeback | Deducted from your balance; fee passed through from Stripe |

---

## Creator Dashboard

The **Creator Dashboard** at `marketplace.gettraek.com/creator` shows:

- **Revenue summary** — monthly and all-time earnings
- **Payout history** — each payout with date, amount, and Stripe transfer ID
- **Listing performance** — installs, active subscribers, ratings, reviews
- **Revenue chart** — daily/weekly/monthly view with trend line

---

## Refund Policy

Users may request a refund within **7 days** of purchase for any reason. Refunds are granted automatically for one-time purchases. For subscriptions, refunds cover only the current billing period if the request is within 7 days.

You can view and respond to refund requests in your Creator Dashboard under **Support → Refunds**.

---

## Free Listings & Revenue

Free listings do not earn direct revenue. However, free listings can drive paid conversions by:

- Offering a free tier with a premium upgrade path (contact **marketplace@gettraek.com** for freemium listing type — in beta)
- Building reputation and installs before launching a paid version
- Driving traffic to your own SaaS or consulting services

---

## Questions & Support

- Creator Dashboard: **marketplace.gettraek.com/creator**
- Payout issues: **billing@gettraek.com**
- Tax questions: **tax@gettraek.com**
- Discord: **#creator-support**
