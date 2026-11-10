const CONSENT_VERSION = '2026-11-10';
const PRIVACY_STORAGE_KEY = 'sedenkova-privacy-choice';
const privacyBanner = document.querySelector('#privacy-banner');
const privacyStatus = document.querySelector('#privacy-status');
function readPrivacyChoice() {
  try {
    const value = JSON.parse(localStorage.getItem(PRIVACY_STORAGE_KEY));
    if (value && value.version === CONSENT_VERSION && ['accepted', 'declined'].includes(value.status)) return value;
  } catch { /* Browsing remains available when storage is blocked. */ }
  return null;
}
function savePrivacyChoice(status, source) {
  const choice = { status, version: CONSENT_VERSION, recordedAt: new Date().toISOString(), source };
  try { localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(choice)); } catch { /* Keep this visit usable without persistence. */ }
  privacyBanner.hidden = true;
  privacyStatus.textContent = status === 'accepted' ? 'Согласие принято. Решение можно изменить внизу страницы.' : 'Вы продолжаете просмотр без согласия на обработку данных.';
  return choice;
}
privacyBanner.hidden = Boolean(readPrivacyChoice());
document.querySelector('#privacy-accept').addEventListener('click', () => savePrivacyChoice('accepted', 'entry'));
document.querySelector('#privacy-decline').addEventListener('click', () => {
  savePrivacyChoice('declined', 'entry');
  document.querySelector('#request-consent').checked = false;
});
document.querySelector('#privacy-settings').addEventListener('click', () => {
  privacyBanner.hidden = false;
  document.querySelector('#privacy-banner-title').focus({ preventScroll: true });
});

const menu = document.querySelector('.menu');
const nav = document.querySelector('.header nav');
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  nav.classList.toggle('open', open);
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Открыть меню');
}));
const dialog = document.querySelector('#request-dialog');
const text = document.querySelector('#request-text');
const send = document.querySelector('#send-request');
function updateLink() {
  send.href = 'https://t.me/Aleksandra_Sed?text=' + encodeURIComponent(text.value);
}
document.querySelector('#selection-form').addEventListener('submit', event => {
  event.preventDefault();
  const consent = document.querySelector('#request-consent');
  if (!consent.checked) { consent.reportValidity(); return; }
  const consentRecord = savePrivacyChoice('accepted', 'form');
  const consentTime = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Yekaterinburg', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(consentRecord.recordedAt));
  const data = new FormData(event.target);
  text.value = `Александра, здравствуйте! Хочу подобрать квартиру в новостройке Тюмени.\n\nКомнаты: ${data.get('rooms')}.\nБюджет: ${data.get('budget')}.\nРайон: ${data.get('district').trim() || 'Нужна помощь с выбором'}.\nСпособ покупки: ${data.get('financing')}.\nПереезд: ${data.get('timing')}.${data.get('wishes').trim() ? '\nПожелания: ' + data.get('wishes').trim() : ''}\n\nРасскажите, пожалуйста, об условиях вашей работы.\n\nСогласие ИП Седенкову Михаилу Витальевичу на обработку персональных данных для ответа на обращение и подбора недвижимости дано отдельной отметкой в форме. Версия: ${CONSENT_VERSION}. Дата: ${consentTime} (UTC+5).`;
  updateLink(); document.querySelector('#copy-status').textContent = ''; document.querySelector('#selection-dialog').close(); dialog.showModal();
});
text.addEventListener('input', updateLink);
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if(event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
document.querySelector('#copy-request').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(text.value); document.querySelector('#copy-status').textContent = 'Текст скопирован. Его можно вставить в чат с Александрой.'; }
  catch { text.focus(); text.select(); document.querySelector('#copy-status').textContent = 'Выделен текст запроса — скопируйте его вручную.'; }
});
document.querySelector('#year').textContent = new Date().getFullYear();

document.querySelectorAll('.siberia-section').forEach(section => {
  const figures = [...section.querySelectorAll('.siberia-figure')];
  const more = section.querySelector('.gallery-more');
  let category = 'renders';
  let limit = 6;
  function renderGallery() {
    let count = 0;
    figures.forEach(figure => {
      const matches = figure.dataset.category === category;
      if (matches) count += 1;
      figure.hidden = !matches || count > limit;
    });
    more.hidden = count <= limit;
  }
  section.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      category = button.dataset.filter;
      limit = 6;
      section.querySelectorAll('[data-filter]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
      renderGallery();
    });
  });
  more.addEventListener('click', () => { limit += 6; renderGallery(); });
  renderGallery();
});
const imageDialog = document.querySelector('#gallery-dialog');
document.querySelectorAll('.gallery-open').forEach(button => button.addEventListener('click', () => {
  const image = document.querySelector('#gallery-image');
  image.src = button.dataset.image;
  image.alt = button.dataset.caption;
  document.querySelector('#gallery-caption').textContent = button.dataset.caption;
  imageDialog.showModal();
}));
document.querySelector('.gallery-close').addEventListener('click', () => imageDialog.close());
imageDialog.addEventListener('click', event => {
  if (event.target !== imageDialog) return;
  const rect = imageDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) imageDialog.close();
});

const moreReviews = document.querySelector('#show-more-reviews');
moreReviews.addEventListener('click', () => {
  document.querySelectorAll('.review-card[hidden]').forEach(card => { card.hidden = false; });
  moreReviews.setAttribute('aria-expanded', 'true');
  moreReviews.hidden = true;
});

// Keep project presentations collapsed until a visitor chooses a project.
const projectSections = [...document.querySelectorAll('.siberia-section')];
function openProject(id, scroll = true) {
  const selected = projectSections.find(section => section.id === id);
  projectSections.forEach(section => {
    section.hidden = section !== selected;
    document.querySelectorAll(`a[href="#${section.id}"]`).forEach(link => {
      link.setAttribute('aria-expanded', String(section === selected));
      link.setAttribute('aria-controls', section.id);
    });
  });
  if (selected && scroll) selected.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
projectSections.forEach(section => {
  document.querySelectorAll(`a[href="#${section.id}"]`).forEach(link => {
    link.setAttribute('aria-expanded', 'false');
    link.setAttribute('aria-controls', section.id);
    link.addEventListener('click', event => {
      event.preventDefault();
      history.pushState(null, '', '#' + section.id);
      openProject(section.id);
    });
  });
  section.querySelector('.project-close').addEventListener('click', () => {
    openProject('');
    history.replaceState(null, '', '#projects');
    const link = document.querySelector(`a[href="#${section.id}"]`);
    link.focus({ preventScroll: true });
    link.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});
function restoreProject() { openProject(location.hash.slice(1), Boolean(projectSections.find(section => '#' + section.id === location.hash))); }
window.addEventListener('popstate', restoreProject);
window.addEventListener('hashchange', restoreProject);
restoreProject();

const quizDialog = document.querySelector('#selection-dialog');
const quizSteps = [...document.querySelectorAll('.quiz-step')];
let quizIndex = 0;
function showQuizStep(index, focus = true) {
  quizIndex = index;
  quizSteps.forEach((step, i) => { step.hidden = i !== index; });
  document.querySelector('#quiz-progress').textContent = `Шаг ${index + 1} из ${quizSteps.length}`;
  document.querySelector('#quiz-meter').value = index + 1;
  document.querySelector('#quiz-back').hidden = index === 0;
  document.querySelector('#quiz-next').hidden = index === quizSteps.length - 1;
  quizDialog.scrollTop = 0;
  if (focus) quizSteps[index].querySelector('h3').focus({ preventScroll: true });
}
document.querySelectorAll('[data-open-quiz], a[href="#selection"]').forEach(button => button.addEventListener('click', event => {
  event.preventDefault();
  quizDialog.showModal();
  showQuizStep(0);
}));
document.querySelector('.quiz-close').addEventListener('click', () => quizDialog.close());
document.querySelector('#quiz-next').addEventListener('click', () => showQuizStep(Math.min(quizIndex + 1, quizSteps.length - 1)));
document.querySelector('#quiz-back').addEventListener('click', () => showQuizStep(Math.max(0, quizIndex - 1)));
// Enter moves to the next step rather than submitting a hidden final step.
document.querySelector('#selection-form').addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA' && quizIndex < quizSteps.length - 1) {
    event.preventDefault(); showQuizStep(quizIndex + 1);
  }
});
const mortgageForm = document.querySelector('#mortgage-form');
const rubles = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
function calculateMortgage() {
  const error = document.querySelector('#mortgage-error');
  error.textContent = '';
  const outputs = ['payment', 'principal', 'interest', 'total'];
  const clear = () => outputs.forEach(key => { document.querySelector('#mortgage-' + key).textContent = '—'; });
  if (!mortgageForm.checkValidity()) { clear(); return; }
  const data = new FormData(mortgageForm);
  const price = Number(data.get('price')), deposit = Number(data.get('deposit'));
  const monthlyRate = Number(data.get('rate')) / 1200, months = Number(data.get('years')) * 12;
  if (deposit >= price) { error.textContent = 'Первоначальный взнос должен быть меньше стоимости квартиры.'; clear(); return; }
  const principal = price - deposit;
  const payment = monthlyRate === 0 ? principal / months : principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
  const total = payment * months;
  const amounts = { payment, principal, interest: Math.max(0, total - principal), total };
  outputs.forEach(key => { document.querySelector('#mortgage-' + key).textContent = rubles.format(amounts[key]); });
}
mortgageForm.addEventListener('submit', event => { event.preventDefault(); calculateMortgage(); });
mortgageForm.addEventListener('input', calculateMortgage);
calculateMortgage();
