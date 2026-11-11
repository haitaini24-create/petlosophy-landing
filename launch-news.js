(() => {
  const modal = document.getElementById('launchNewsModal');
  const form = document.getElementById('launchNewsForm');
  if (!modal || !form) return;
  const copy = {
    ko: ['오픈 소식 받기','이메일 또는 휴대전화 번호를 남겨주시면 출시 소식을 보내드릴게요.','이메일 또는 휴대전화 번호','[필수] 연락처 수집·이용 및 출시 안내 수신에 동의합니다.','연락처는 출시 안내에만 사용하며, 동의 철회 시 또는 수집 후 2년 이내 삭제합니다.','신청하기','신청 내용을 저장하고 있어요.','신청이 완료됐어요.','이미 신청하신 연락처예요.','연락처를 확인해 주세요.','동의가 필요해요.','저장하지 못했어요. 잠시 후 다시 시도해 주세요.','개인정보처리방침'],
    en: ['Get launch updates','Leave your email or phone number and we’ll let you know when PETLOSOPHY launches.','Email or phone number','[Required] I agree to collection of my contact details and launch updates.','Used only for launch updates. Deleted on withdrawal or within 2 years.','Sign up','Saving your request…','You’re signed up.','This contact is already signed up.','Please check your contact details.','Consent is required.','Could not save. Please try again.','Privacy policy'],
    ja: ['オープンのお知らせを受け取る','メールアドレスまたは電話番号を登録すると、オープン時にお知らせします。','メールアドレスまたは電話番号','【必須】連絡先の収集・利用とオープン案内の受信に同意します。','連絡先はオープン案内のみに使用し、同意撤回時または収集から2年以内に削除します。','登録する','保存しています…','登録が完了しました。','この連絡先は登録済みです。','連絡先をご確認ください。','同意が必要です。','保存できませんでした。後ほど再度お試しください。','プライバシーポリシー']
  };
  const ids = ['launchNewsTitle','launchNewsIntro','launchNewsLabel','launchNewsConsent','launchNewsPrivacy','launchNewsSubmit'];
  const status = document.getElementById('launchNewsStatus');
  const input = document.getElementById('launchNewsContact');
  const lang = () => ['ko','en','ja'].includes(window.__plLang) ? window.__plLang : 'ko';
  function translate() {
    const t = copy[lang()];
    ids.forEach((id,i) => {
      const el = document.getElementById(id);
      if (i === 4) { el.firstChild.textContent = t[i] + ' '; el.querySelector('a').textContent = t[12]; }
      else el.textContent = t[i];
    });
  }
  const close = () => { modal.hidden = true; status.textContent = ''; };
  modal.querySelector('[data-open-pv]').addEventListener('click', () => { close(); });
  document.querySelectorAll('[data-open-launch-news]').forEach(button => button.addEventListener('click', () => {
    translate(); modal.hidden = false; input.focus();
  }));
  modal.addEventListener('click', event => { if (event.target === modal || event.target.closest('[data-close-launch-news]')) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) close(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const t = copy[lang()];
    const value = input.value.trim();
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phone = /^\+?[0-9]{9,15}$/;
    if (!email.test(value) && !phone.test(value.replace(/[\s()-]/g,''))) { status.textContent=t[9]; return; }
    if (!form.elements.consent.checked) { status.textContent=t[10]; return; }
    const cfg = window.PETLOSOPHY_USAGE_PUBLIC;
    if (!cfg?.url || !cfg?.key) { status.textContent=t[11]; return; }
    const button = document.getElementById('launchNewsSubmit');
    button.disabled=true; status.textContent=t[6];
    try {
      const response = await fetch(cfg.url + '/rest/v1/rpc/join_launch_news', {
        method:'POST', headers:{'Content-Type':'application/json',apikey:cfg.key,Authorization:'Bearer '+cfg.key},
        body:JSON.stringify({p_contact:value,p_locale:lang(),p_consent:true})
      });
      if (!response.ok) throw new Error('save failed');
      const result = await response.json();
      status.textContent=result==='already_registered'?t[8]:t[7];
      if (result==='registered' || result==='already_registered') { form.reset(); }
    } catch { status.textContent=t[11]; }
    finally { button.disabled=false; }
  });
})();
