export function validateEnquiry(data) {
  if (!data.name.trim() || !data.message.trim() || !data.service) return 'Enter your name, service and project details.';
  const contact=data.contact.trim(), digits=contact.replace(/\D/g,'');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) && !(/^[+\d\s().-]+$/.test(contact)&&digits.length>=7&&digits.length<=15)) return 'Enter a valid phone number or email address.';
  return '';
}
export function whatsappURL(data) {
  return 'https://wa.me/2347068744549?text='+encodeURIComponent(`Hello MUA Global Innovation Ltd,\n\nMy name is ${data.name}.\nContact: ${data.contact}\nOrganisation: ${data.organisation || 'Not supplied'}\nService: ${data.service}\nPreferred timing: ${data.timing || 'Not supplied'}\n\nProject details:\n${data.message}`);
}
export async function sendEnquiry(config,data,fetcher=fetch) {
  if (!config?.supabaseUrl?.startsWith('https://') || !config.publishableKey) throw new Error('Enquiries are temporarily unavailable. Please contact MUA on WhatsApp.');
  const response=await fetcher(config.supabaseUrl.replace(/\/$/,'')+'/functions/v1/submit-enquiry',{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(20000)});
  const result=await response.json().catch(()=>null);
  if(!response.ok) throw new Error(result?.message || 'We could not confirm your enquiry. Please retry or use WhatsApp.');
  if(result?.request_id!==data.request_id) throw new Error('We could not confirm your enquiry. Please retry with the same details.');
  return result;
}
