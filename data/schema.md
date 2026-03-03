# Data Schema

This file documents the static data model used by the GitLAB-Health pooled CSE dashboard.

## Customer-safe redaction policy
- `customer_safe: true` fields can appear in customer-facing UI and customer-safe exports.
- `internal_only` fields are never shown in customer-safe mode and are excluded from customer-safe exports.

## `data/accounts.json`
- `version` (number): schema version.
- `updated_on` (string, `YYYY-MM-DD`): last data refresh date.
- `accounts` (array): list of account records.

### Account object
- `id` (string): unique stable account id.
- `name` (string): account display name.
- `segment` (string): portfolio segment.
- `renewal_date` (string, `YYYY-MM-DD`): renewal date.
- `health` (object, customer-safe):
  - `overall` (string enum: `green|yellow|red`)
  - `adoption_health` (string enum)
  - `engagement_health` (string enum)
  - `lifecycle_stage` (string enum: `onboard|enable|expand|optimize|renew`)
  - `last_updated` (string, `YYYY-MM-DD`)
- `adoption` (object, customer-safe):
  - `use_case_scores` (object): numeric scores for `SCM`, `CI`, `CD`, `Secure`.
  - `platform_adoption_score` (number `0-100`)
  - `platform_adoption_level` (string): summary level (for example `3 of 4 use cases green`).
  - `trend_30d` (number): score delta over 30 days.
- `engagement` (object, customer-safe):
  - `last_touch_date` (string, `YYYY-MM-DD`)
  - `next_touch_date` (string, `YYYY-MM-DD`)
  - `program_attendance` (object)
    - `last_90d` (number)
    - `webinars` (number)
    - `labs` (number)
    - `office_hours` (number)
- `outcomes` (object, customer-safe):
  - `objectives` (array)
    - `title` (string)
    - `status` (string enum: `in_progress|at_risk|complete`)
    - `owner` (string)
    - `due_date` (string, `YYYY-MM-DD`)
  - `value_metrics` (object)
    - `time_saved_hours` (number)
    - `pipeline_speed` (string)
    - `security_coverage` (string)
- `internal_only` (object, internal-only):
  - `sentiment_notes` (string)
  - `expansion_hypotheses` (array of string)
  - `escalations` (array)
    - `severity` (string enum: `P1|P2|P3`)
    - `issue` (string)
    - `next_update_due` (string, `YYYY-MM-DD`)

## `data/requests.json`
- `version` (number)
- `updated_on` (string)
- `requests` (array)
  - `request_id` (string)
  - `account_id` (string)
  - `requestor_role` (string enum: `Account Executive|Renewals Manager`)
  - `topic` (string enum: `SCM|CI|CD|Secure|platform foundations`)
  - `stage` (string enum: `onboard|enable|expand|optimize|renew`)
  - `desired_outcome` (string)
  - `definition_of_done` (string)
  - `due_date` (string)
  - `status` (string enum: `new|triage|in_progress|blocked|completed`)
  - `assigned_to` (string)
  - `created_on` (string)

## `data/programs.json`
- `version` (number)
- `updated_on` (string)
- `programs` (array)
  - `program_id` (string)
  - `type` (string enum: `webinar|hands-on lab|office hours`)
  - `title` (string)
  - `date` (string ISO datetime)
  - `target_use_cases` (array of string)
  - `registration_count` (number)
  - `attendance_count` (number)
  - `owner` (string)

## `data/playbooks.json`
- `version` (number)
- `updated_on` (string)
- `playbooks` (array)
  - `id` (string)
  - `stage` (string)
  - `topic` (string)
  - `title` (string)
  - `recommended_program` (string, `program_id`)
  - `next_best_action` (string)
  - `resource_ids` (array of string)

## `data/resources.json`
- `version` (number)
- `updated_on` (string)
- `categories` (array)
  - `id` (string)
  - `label` (string)
- `resources` (array)
  - `id` (string)
  - `title` (string)
  - `summary` (string)
  - `url` (string)
  - `categories` (array of category ids)
  - `tooltip` (string)
  - `customer_safe` (boolean)

## Denylist used by customer-safe exports
- `internal_only`
- `internal_only.sentiment_notes`
- `internal_only.expansion_hypotheses`
- `internal_only.escalations`