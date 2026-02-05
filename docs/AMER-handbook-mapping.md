# AMER Handbook Mapping

## AMER expectation to implementation

| AMER expectation | UI enforcement | Data fields |
|---|---|---|
| Time to first engage <= 14 days | Compliance Strip check: **First Engage <= 14 days** (`#journey`) | `start_date`, `first_engage_date` |
| Time to first value <= 30 days | Compliance Strip check: **First Value <= 30 days** (`#journey`) | `start_date`, `first_value_date` |
| Onboarding complete <= 45 days | Compliance Strip check: **Onboarding Complete <= 45 days** (`#journey`) | `start_date`, `onboarding_complete_date` |
| Never go more than one month without a customer call | Compliance Strip check: **Cadence Call within last 30 days** + Cadence Tracker banner/recommended action (`#engagement`) | `last_cadence_call_date`, `next_cadence_call_date` |
| At least 1 workshop per quarter per customer | Workshop Tracker status (Green/Yellow/Red) in Engagement & Enablement (`#engagement`) | `workshops[]`, `next_workshop_date`, `next_workshop_theme`, `timezone` |
| At least 1 EBR per year | Compliance Strip check: **EBR within last 12 months** + EBR roadmap countdown (`#engagement`) | `last_ebr_date`, `next_ebr_target_date`, `timezone` |
| Success plan updated minimum quarterly and validated by customer + manager | Compliance Strip check: **Success Plan updated this quarter + validated** + Success Plan governance card (`#success-plan`) | `success_plan_last_updated_date`, `success_plan_next_review_date`, `success_plan_customer_validated`, `success_plan_manager_validated`, `timezone` |
| Health update frequency: Red weekly, Yellow biweekly, Green monthly; escalations handled | Health/Risk card: next due dates + overdue badges + escalation cadence override (`#health-risk`) and compliance alert elevation | `overall_health`, `last_health_update_date`, `escalated`, `escalation_severity`, `last_escalation_update_date` |

## Additional AMER operationalization delivered

| Motion | UI element | Data fields |
|---|---|---|
| Account growth planning | **Account Growth Plan** card in Outcomes | `growth_plan.objectives[]`, `growth_plan.hypotheses[]`, `growth_plan.active_plays[]`, `growth_plan.owners[]` |
| Expand & Renew readiness | **Expand & Renew** drawer with renewal checklist + expansion motion | `renewal_date`, `renewal_owner`, `renewal_readiness.*`, `expansion_motion.*` |
| AMER handbook deep-link guidance | Searchable Resource Registry categories + AMER anchor links | `data/resources.json` entries and category metadata |

## Rule engines and logic files
- `src/lib/dateUtils.js`: `parseISO`, `diffInDays`, `addDays`, `addMonths`, `getQuarterStart`, `getQuarterEnd`, `isSameQuarter`.
- `src/lib/deriveAccountMetrics.js`: `deriveAccountMetrics(account)` and data validation.
- `src/lib/handbookRules.js`: `evaluateHandbookCompliance(accountData)`.
