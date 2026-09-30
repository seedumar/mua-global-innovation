(() => {
  const form = document.querySelector('#contact-form');
  if (!form) return;
  const direction = form.querySelector('[name="website_direction"]');
  const audience = form.querySelector('[name="service"]');
  const note = document.querySelector('#proposal-direction-note');
  const summary = document.querySelector('#proposal-summary');
  const review = document.querySelector('.proposal-review');
  const descriptions = {
    Essential: 'We will discuss the core pages, your content and how visitors should contact you.',
    Growth: 'We will discuss publishing updates, collecting enquiries and who will manage your content.',
    Custom: 'We will discuss user journeys, integrations, access controls and support before defining the scope.',
    'Help me choose': 'Choose a starting point or let us recommend one after discussing your goals.'
  };
  const update = () => {
    note.textContent = descriptions[direction.value];
    const features = [...form.querySelectorAll('[name="features"]:checked')].map(field => field.value);
    summary.textContent = `${audience.value || 'Audience to be confirmed'} · ${direction.value}. Features to discuss: ${features.length ? features.join(', ') : 'to be confirmed'}.`;
    document.querySelectorAll('[data-proposal-plan]').forEach(link => {
      link.closest('.proposal-plan').classList.toggle('selected', link.dataset.proposalPlan === direction.value);
    });
  };
  document.querySelectorAll('[data-proposal-plan]').forEach(link => {
    link.addEventListener('click', () => {
      direction.value = link.dataset.proposalPlan;
      update();
    });
  });
  form.addEventListener('change', update);
  review.hidden = false;
  update();
})();
