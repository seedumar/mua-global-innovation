(() => {
  const raw = window.MUA_AMBASSADOR_FORM_URL;
  if (!raw) return;
  let url;
  try { url = new URL(raw); } catch { return; }
  if (url.protocol !== 'https:' || !['docs.google.com','forms.gle','tally.so'].includes(url.hostname)) return;
  const link = document.querySelector('#application-link');
  if (!link) return;
  link.href = url.href;
  link.hidden = false;
  document.querySelector('#application-privacy').hidden = false;
  document.querySelector('#application-status').textContent = 'Applications are open. Complete the application form for review by the MUA team.';
})();
