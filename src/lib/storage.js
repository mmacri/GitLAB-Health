const memory = new Map();

const hasLocalStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const LEGACY_KEY_ALIASES = {
  gh_customer_safe_mode: ['glh-safe-mode'],
  gh_view_mode: ['glh-view-mode'],
  gh_requests_v1: ['glh-requests'],
  gh_program_attendance_v1: ['glh-program-attendance'],
  gh_intake_draft_v1: ['glh-intake-draft'],
  gh_user_overrides_v1: ['glh-account-overrides'],
  gh_playbook_checklist_v1: ['glh-playbook-checklist'],
  gh_selected_account_id: ['glh-selected-account-id'],
  gh_gitlab_config_v1: ['glh-gitlab-config'],
  gh_gitlab_base_url: [],
  gh_gitlab_project_path: [],
  gh_engagement_log_v1: ['engagement_log_v1'],
  gh_toolkit_launch: ['glh-toolkit-launch'],
  gh_action_cards_v1: ['glh-action-cards']
};

const aliasesFor = (key) => LEGACY_KEY_ALIASES[String(key || '')] || [];

const parseValue = (raw, fallback) => {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const storage = {
  get(key, fallback = null) {
    try {
      if (hasLocalStorage()) {
        const value = window.localStorage.getItem(key);
        if (value !== null) return parseValue(value, fallback);

        for (const alias of aliasesFor(key)) {
          const aliasValue = window.localStorage.getItem(alias);
          if (aliasValue === null) continue;
          // Migrate legacy key to canonical key name.
          window.localStorage.setItem(key, aliasValue);
          return parseValue(aliasValue, fallback);
        }

        return fallback;
      }

      if (memory.has(key)) return memory.get(key);
      for (const alias of aliasesFor(key)) {
        if (memory.has(alias)) return memory.get(alias);
      }
      return fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      if (hasLocalStorage()) {
        window.localStorage.setItem(key, JSON.stringify(value));
        aliasesFor(key).forEach((alias) => window.localStorage.removeItem(alias));
        return;
      }
      memory.set(key, value);
      aliasesFor(key).forEach((alias) => memory.delete(alias));
    } catch {
      // Ignore storage write failures to keep the app usable.
    }
  },
  remove(key) {
    try {
      if (hasLocalStorage()) {
        window.localStorage.removeItem(key);
        aliasesFor(key).forEach((alias) => window.localStorage.removeItem(alias));
        return;
      }
      memory.delete(key);
      aliasesFor(key).forEach((alias) => memory.delete(alias));
    } catch {
      // Ignore storage remove failures.
    }
  }
};

export const STORAGE_KEYS = {
  safeMode: 'gh_customer_safe_mode',
  viewMode: 'gh_view_mode',
  requests: 'gh_requests_v1',
  programs: 'gh_program_attendance_v1',
  intakeDraft: 'gh_intake_draft_v1',
  accountOverrides: 'gh_user_overrides_v1',
  playbookChecklist: 'gh_playbook_checklist_v1',
  selectedAccountId: 'gh_selected_account_id',
  gitlabConfig: 'gh_gitlab_config_v1',
  gitlabBaseUrl: 'gh_gitlab_base_url',
  gitlabProjectPath: 'gh_gitlab_project_path',
  engagementLog: 'gh_engagement_log_v1',
  toolkitLaunch: 'gh_toolkit_launch',
  actionCards: 'gh_action_cards_v1'
};
