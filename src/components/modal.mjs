export const createModal = () => {
  const wrapper = document.createElement('div');
  wrapper.className = 'app-modal';
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.innerHTML = `
    <div class="app-modal__backdrop" data-close></div>
    <div class="app-modal__panel" role="dialog" aria-modal="true" aria-label="Edit field">
      <header class="app-modal__header">
        <h2 data-title>Edit value</h2>
        <button class="ghost-btn" type="button" data-close>Close</button>
      </header>
      <div class="app-modal__body" data-content></div>
    </div>
  `;

  const close = () => {
    wrapper.classList.remove('is-open');
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.querySelector('[data-content]').innerHTML = '';
  };

  wrapper.querySelectorAll('[data-close]').forEach((item) => item.addEventListener('click', close));

  const open = ({ title = 'Edit value', content }) => {
    wrapper.querySelector('[data-title]').textContent = title;
    const body = wrapper.querySelector('[data-content]');
    body.innerHTML = '';
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      body.appendChild(content);
    }
    wrapper.classList.add('is-open');
    wrapper.setAttribute('aria-hidden', 'false');
  };

  return {
    element: wrapper,
    open,
    close
  };
};
