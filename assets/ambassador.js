(() => {
  const raw = window.MUA_AMBASSADOR_FORM_URL;
  const link = document.querySelector('#application-link');
  const privacy = document.querySelector('#application-privacy');
  const status = document.querySelector('#application-status');
  if (!link || !privacy || !status) return;
  link.hidden = true;
  privacy.hidden = true;
  status.textContent = 'Applications are not open yet. Please contact MUA for updates.';
  if (!raw) return;
  let url;
  try { url = new URL(raw); } catch { return; }
  if (url.protocol !== 'https:' || !['docs.google.com','forms.gle','tally.so'].includes(url.hostname)) return;
  link.href = url.href;
  link.hidden = false;
  privacy.hidden = false;
  status.textContent = 'Applications are open. Complete the application form for review by the MUA team.';
})();
