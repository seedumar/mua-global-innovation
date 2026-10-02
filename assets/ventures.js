(() => {
  const section = document.querySelector('[data-venture-audiences]');
  if (!section) return;
  const controls = section.querySelector('[data-venture-controls]');
  const buttons = [...controls.querySelectorAll('[data-venture-choice]')];
  const panels = [...section.querySelectorAll('.venture-path')];
  function show(id) {
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ventureChoice === id)));
    panels.forEach(panel => { panel.hidden = panel.id !== id; });
  }
  buttons.forEach(button => button.addEventListener('click', () => show(button.dataset.ventureChoice)));
  controls.hidden = false;
  show(buttons[0].dataset.ventureChoice);
})();
