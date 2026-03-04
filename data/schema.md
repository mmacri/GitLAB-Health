# Data Schema

This schema defines the static data backing the GitLAB-Health portfolio-first dashboard.

## Customer-safe policy
- Customer-safe exports and UI hide any field under `internal_only`.
- Resources with `customer_safe=false` are hidden in customer-safe mode.
- Playbook checklist items with `internal_only=true` are hidden in customer-safe mode.

## accounts.json
Top-level:
- `version` number
- `updated_on` date string
- `accounts[]`

Account fields:
- `id` string
- `name` string
- `segment` string
- `renewal_date` date
- `lifecycle_stage` `onboard|enable|expand|optimize|renew`
- `health` (customer-safe)
  - `overall` `green|yellow|red`
  - `adoption_health` `green|yellow|red`
  - `engagement_health` `green|yellow|red`
  - `lifecycle_stage` `onboard|enable|expand|optimize|renew`
  - `last_updated` date or null
- `adoption` (customer-safe)
  - `use_case_scores` object with `SCM|CI|CD|Secure` numeric scores
  - `platform_adoption_score` number
  - `platform_adoption_level` string
  - `trend_30d` number
- `engagement` (customer-safe)
  - `cadence` string
  - `last_touch_date` date
  - `next_touch_date` date or null
  - `next_ebr_date` date or null (single source of truth for next EBR date)
  - `program_attendance`
    - `last_90d` number
    - `webinars` number
    - `labs` number
    - `office_hours` number
- `journey` (customer-safe)
  - `time_to_engage_days` number
  - `time_to_onboard_days` number
  - `time_to_first_value_days` number
  - `time_to_outcome_days` number
  - `milestones[]`
    - `key` string
    - `label` string
    - `target_days` number
    - `actual_days` number
    - `status` `done|watch|risk`
- `outcomes` (customer-safe)
  - `objectives[]`
    - `title` string
    - `status` `in_progress|at_risk|complete`
    - `owner` string
    - `due_date` date
  - `value_metrics`
    - `time_saved_hours` number
    - `pipeline_speed` string or null
    - `security_coverage` string
    - `dora`
      - `deployment_frequency` string
      - `lead_time` string
      - `change_failure_rate` string
      - `mttr` string
  - `executive_summary` string
  - `validation_status` `customer confirmed|internal estimate`
- `change_log[]` (customer-safe)
  - `date` date
  - `category` `Usage|Engagement|Risk|Outcomes`
  - `summary` string
- `internal_only` (internal-only)
  - `sentiment_notes` string
  - `expansion_hypotheses[]` string
  - `escalations[]`
    - `severity` `P1|P2|P3`
    - `issue` string
    - `next_update_due` date

## requests.json
- `version`, `updated_on`
- `requests[]`
  - `request_id`
  - `account_id`
  - `requestor_role`
  - `topic`
  - `stage`
  - `desired_outcome`
  - `definition_of_done`
  - `due_date`
  - `status` `new|triage|in_progress|blocked|completed`
  - `assigned_to`
  - `notes`
  - `created_on`

## programs.json
- `version`, `updated_on`
- `programs[]`
  - `program_id`
  - `type` `webinar|hands-on lab|office hours`
  - `title`
  - `date` ISO datetime
  - `target_use_cases[]`
  - `registration_count`
  - `attendance_count`
  - `owner`
  - `invite_blurb`
  - `followup_steps[]`

## playbooks.json
- `version`, `updated_on`
- `playbooks[]`
  - `id`
  - `stage`
  - `topic`
  - `title`
  - `recommended_program` program id
  - `next_best_action`
  - `checklist[]`
    - `key`
    - `label`
    - `internal_only` boolean
  - `templates`
    - `agenda`
    - `followup`
    - `issue`
  - `resource_ids[]`

## resources.json
- `version`, `updated_on`
- `categories[]` (`id`, `label`)
- `resources[]`
  - `id`, `title`, `summary`, `url`
  - `category` (`Onboarding|Adoption|Health & Risk|Engagement|Value & Outcomes|Platform Enablement|Operating Model`)
  - `audience` (`Customer-safe|Internal`)
  - `type` (`Handbook|Docs|Playbook`)
  - `tags[]` string
  - `tooltip`
  - `customer_safe` boolean (derived from audience)

## templates.json
- `updated_on`
- `templates`
  - `success_plan_objectives[]` (customer-safe)
  - `success_plan_metrics[]` (customer-safe)
  - `success_plan_initiatives[]` (customer-safe)
  - `workshop_prerequisites[]` (customer-safe)
  - `renewal_next_steps[]` (customer-safe)
  - `issue_default_description` (customer-safe)

## Local storage schema
- `engagement_log_v1[]`
  - `id`
  - `account_id`
  - `account_name`
  - `date`
  - `type`
  - `notes_customer_safe` (customer-safe)
  - `notes_internal` (internal-only)
  - `created_at`
- `glh-gitlab-config`
  - `baseUrl`
  - `projectPath`
- `glh-action-cards`
  - `{ [accountId]: { [actionId]: boolean } }`

## Customer-safe denylist
- `internal_only`
- `internal_only.sentiment_notes`
- `internal_only.expansion_hypotheses`
- `internal_only.escalations`
- `notes_internal`
- `internal_notes`
- `sentiment*`
- `expansion*`
- `escalation*`
