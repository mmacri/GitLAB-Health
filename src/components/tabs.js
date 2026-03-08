export const wireTabs = (root, selector = '[data-tabs]') => {
  const tabRoot = root.querySelector(selector);
  if (!tabRoot) return { setActive: () => {} };

  const tabs = [...tabRoot.querySelectorAll('[data-tab-target]')];
  const panels = [...tabRoot.querySelectorAll('[data-tab-panel]')];

  const setActive = (id) => {
    tabs.forEach((tab) => {
      const active = tab.getAttribute('data-tab-target') === id;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach((panel) => {
      const active = panel.getAttribute('data-tab-panel') === id;
      panel.classList.toggle('is-active', active);
      panel.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => setActive(tab.getAttribute('data-tab-target')));
  });

  const preselectedTab =
    tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') ||
    tabs.find((tab) => tab.classList.contains('is-active')) ||
    null;
  if (preselectedTab) {
    setActive(preselectedTab.getAttribute('data-tab-target'));
  } else if (tabs[0]) {
    setActive(tabs[0].getAttribute('data-tab-target'));
  }

  return { setActive };
};
