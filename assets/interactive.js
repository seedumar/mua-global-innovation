(() => {
  const services = {
    websites: { label: 'Websites', enquiry: 'Business website', title: 'Give your organisation a clear online presence.', text: 'Help visitors find your services, programmes and contact details on a website that works across devices.', items: ['Pages planned around your audience', 'Responsive design and enquiry paths', 'Hosting and handover agreed with you'], question: 'Who is the website for?', options: ['School', 'Business', 'Organisation'], second: 'Do you already have a website?', choices: ['Starting from scratch', 'Redesigning an existing website'] },
    software: { label: 'Software', enquiry: 'Software development', title: 'Turn a recurring task into a useful system.', text: 'Tell us about the workflow you want to improve. We can discuss a custom application built around your team.', items: ['Understand the workflow', 'Agree on features and users', 'Build, review and refine'], question: 'Who will use the system?', options: ['Staff only', 'Customers or the public', 'Staff and customers'], second: 'What is your starting point?', choices: ['A new idea', 'A manual process', 'An existing system'] },
    networking: { label: 'Networking', enquiry: 'Networking', title: 'Connect the people and devices in your workspace.', text: 'Plan a network around your building, devices and everyday connectivity needs.', items: ['Network setup', 'Wi-Fi and router configuration', 'Troubleshooting'], question: 'Where is the network needed?', options: ['Office or business', 'School', 'Home', 'Other organisation'], second: 'What do you need?', choices: ['New network setup', 'Improve coverage', 'Fix an existing network'] },
    training: { label: 'IT Training', enquiry: 'IT Training', title: 'Build skills your team can put to use.', text: 'Discuss training that matches your learners, their current skills and what they want to achieve.', items: ['Digital literacy', 'Website development fundamentals', 'Staff and student training'], question: 'Who is the training for?', options: ['Students', 'Staff', 'Individuals', 'A mixed group'], second: 'What is their current level?', choices: ['Beginners', 'Some experience', 'Mixed levels'] },
    cctv: { label: 'CCTV', enquiry: 'CCTV Installation', title: 'Plan coverage for the spaces you need to monitor.', text: 'Share your location and coverage needs so we can discuss camera placement, recording and installation.', items: ['Camera placement', 'Recording configuration', 'System checks and guidance'], question: 'Where are cameras needed?', options: ['Business premises', 'School', 'Home', 'Other organisation'], second: 'What do you need?', choices: ['New installation', 'Expand an existing system', 'Check an existing system'] },
    solar: { label: 'Solar', enquiry: 'Solar Installation', title: 'Plan power around the equipment you use.', text: 'Tell us about the site and equipment you want to power. System scope will follow an assessment of your needs.', items: ['Power needs assessment', 'Installation planning', 'Checks and handover'], question: 'Where is power needed?', options: ['Office or business', 'School', 'Home', 'Other organisation'], second: 'What is your starting point?', choices: ['New installation', 'Upgrade an existing system', 'Assess my power needs'] }
  };
  document.querySelectorAll('[data-service-explorer]').forEach(explorer => {
    const controls = explorer.querySelector('[data-service-controls]');
    const panel = explorer.querySelector('[data-service-panel]');
    controls.hidden = false;
    const buttons = Object.entries(services).map(([key, service]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = service.label;
      button.setAttribute('aria-pressed', 'false'); button.setAttribute('aria-controls', panel.id);
      button.addEventListener('click', () => show(key)); controls.append(button);
      return { key, button };
    });
    function show(key) {
      const service = services[key];
      buttons.forEach(item => item.button.setAttribute('aria-pressed', String(item.key === key)));
      const heading = document.createElement('h3'); heading.textContent = service.title;
      const text = document.createElement('p'); text.textContent = service.text;
      const list = document.createElement('ul');
      service.items.forEach(item => { const li = document.createElement('li'); li.textContent = item; list.append(li); });
      const link = document.createElement('a'); link.className = 'button button-primary';
      link.href = 'contact.html?service=' + encodeURIComponent(service.enquiry) + '#contact-form';
      link.textContent = 'Discuss ' + service.label.toLowerCase() + ' ↗';
      panel.replaceChildren(heading, text, list, link);
    }
    show('websites');
  });
  const form = document.querySelector('#contact-form');
  const select = form?.querySelector('select[name="service"]');
  if (!select) return;
  const fields = document.createElement('fieldset'); fields.className = 'guided-fields'; fields.hidden = true;
  const project = form.querySelector('textarea[name="message"]')?.closest('label');
  if (!project) return;
  project.before(fields);
  function update() {
    const value = select.value;
    const entry = (value === 'MUA Trust Homes' ? { question: 'Your role:', options: ['Tenant', 'Landlord', 'Agent', 'Property company'], second: 'Where are you interested in property?', choices: ['Kano', 'Another location', 'Exploring partnerships'] } : null) || Object.values(services).find(service => service.enquiry === value)
      || (/website/i.test(value) ? services.websites : (value ? { question: 'What stage is your project at?', options: ['Exploring an idea', 'Ready to start', 'Improving something existing'], second: 'Who will it support?', choices: ['A school', 'A business', 'An organisation', 'Individuals'] } : null));
    fields.replaceChildren(); fields.hidden = !entry;
    if (!entry) return;
    const legend = document.createElement('legend'); legend.textContent = 'A few useful details'; fields.append(legend);
    const hint = document.createElement('p'); hint.textContent = 'Optional — these answers help us understand your enquiry.'; fields.append(hint);
    [[entry.question, entry.options], [entry.second, entry.choices]].forEach(([question, choices], index) => {
      const label = document.createElement('label'); label.textContent = question;
      const input = document.createElement('select'); input.name = 'detail_' + (index + 1); input.dataset.question = question;
      const empty = document.createElement('option'); empty.value = ''; empty.textContent = 'Select if known'; input.append(empty);
      choices.forEach(choice => { const option = document.createElement('option'); option.value = choice; option.textContent = choice; input.append(option); });
      label.append(input); fields.append(label);
    });
  }
  select.addEventListener('change', update); update();
  const requestedRole = new URLSearchParams(window.location.search).get('role');
  const roleField = fields.querySelector('select[name="detail_1"]');
  if (select.value === 'MUA Trust Homes' && roleField && [...roleField.options].some(option => option.value === requestedRole)) roleField.value = requestedRole;
})();
