(() => {
  'use strict';
  const form = document.getElementById('booking-form');
  if (!form) return;
  const field = id => document.getElementById('book-' + id);
  const day = field('date'), time = field('time'), duration = field('duration');
  const submit = form.querySelector('[type="submit"]'), status = document.getElementById('booking-status');
  const success = document.getElementById('booking-success');
  const dateText = value => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Vladivostok', dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));
  const studioDay = value => new Date(value + 10 * 3600000).toISOString().slice(0, 10);
  let ready = false, sending = false, controller, requestId = crypto.randomUUID(), fingerprint = '';
  async function api(path, options = {}) {
    const response = await fetch('/api/booking/' + path, { credentials: 'same-origin', cache: 'no-store', ...options });
    let data;
    try { data = await response.json(); } catch { throw new Error('Сервис записи недоступен. Свяжитесь со студией.'); }
    if (!response.ok) throw Object.assign(new Error(data.error || 'Не удалось отправить запрос.'), { status: response.status });
    return data;
  }
  function message(value, error = false) {
    status.textContent = value;
    status.classList.toggle('is-error', error);
  }
  function syncSubmit() { submit.disabled = !ready || sending || !time.value; }
  async function loadSlots() {
    controller?.abort();
    controller = new AbortController();
    time.replaceChildren(new Option('Загружаем время…', ''));
    time.disabled = true; syncSubmit();
    if (!ready || !day.value || !day.validity.valid) { time.replaceChildren(new Option('Выберите дату', '')); return; }
    message('Проверяем свободное время…');
    try {
      const data = await api(`slots?day=${encodeURIComponent(day.value)}&duration=${duration.value}`, { signal: controller.signal });
      time.replaceChildren(new Option(data.slots.length ? 'Выберите время' : 'Нет свободного времени', ''));
      for (const slot of data.slots) time.add(new Option(slot.label, slot.startsAt));
      time.disabled = !data.slots.length;
      message(data.slots.length ? 'Время Хабаровска · запись минимум за 2 часа. Резерв на 24 часа до подтверждения.' : 'Выберите другую дату или меньшую длительность.');
    } catch (error) {
      if (error.name === 'AbortError') return;
      time.replaceChildren(new Option('Не удалось загрузить время', ''));
      message(error.message, true);
    }
    syncSubmit();
  }
  day.min = studioDay(Date.now());
  day.max = studioDay(Date.now() + 89 * 86400000);
  day.addEventListener('change', loadSlots);
  duration.addEventListener('change', loadSlots);
  time.addEventListener('change', syncSubmit);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !ready || !form.reportValidity()) return;
    const payload = { name: field('name').value.trim(), email: field('email').value.trim(), phone: field('phone').value.trim(),
      service: field('service').value, startsAt: time.value, duration: Number(duration.value), consent: field('consent').checked, website: field('website').value };
    if (!/^\+?[\d ()-]{10,30}$/.test(payload.phone) || payload.phone.replace(/\D/g, '').length < 10) {
      message('Проверьте номер телефона: нужно не менее 10 цифр.', true); field('phone').focus(); return;
    }
    const nextFingerprint = JSON.stringify(payload);
    if (fingerprint && nextFingerprint !== fingerprint) requestId = crypto.randomUUID();
    fingerprint = nextFingerprint;
    sending = true; syncSubmit(); submit.textContent = 'Сохраняем…'; message('Отправляем заявку…');
    try {
      const { booking } = await api('bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, requestId }) });
      const active = ['pending', 'confirmed'].includes(booking.status);
      if (!active) throw new Error('Предыдущий резерв уже закрыт. Выберите время и отправьте новую заявку.');
      document.getElementById('booking-success-text').textContent = `№ ${booking.id}\n${dateText(booking.startsAt)} (Хабаровск), ${booking.duration} ч.\n\n` +
        (booking.status === 'confirmed' ? 'Запись подтверждена администратором.' : `Время зарезервировано до ${dateText(booking.holdUntil)}. Администратор свяжется с вами для подтверждения. До подтверждения это предварительная заявка.`);
      form.style.display = 'none'; success.style.display = 'block';
      document.getElementById('booking-success-text').focus();
      form.reset(); requestId = crypto.randomUUID(); fingerprint = '';
    } catch (error) {
      if (error.status === 409) { await loadSlots(); requestId = crypto.randomUUID(); fingerprint = ''; }
      message(error.message, true);
    } finally { sending = false; submit.textContent = 'Отправить заявку'; syncSubmit(); }
  });
  document.getElementById('booking-again').addEventListener('click', () => {
    success.style.display = 'none'; form.style.display = 'flex'; loadSlots(); field('name').focus();
  });
  api('config').then(config => {
    for (const service of config.services) {
      const price = document.getElementById('price-' + service.id), option = document.getElementById('opt-' + service.id);
      if (price) price.textContent = 'Цена: ' + service.price;
      if (option) option.textContent = `${service.name} (${service.price})`;
    }
    ready = config.ready;
    document.getElementById('booking-contact').hidden = ready;
    message(ready ? 'Выберите дату и длительность сессии. Всё время указано по Хабаровску.' : 'Онлайн-запись ещё настраивается. Для записи свяжитесь со студией по контактам рядом.');
    if (ready && day.value) loadSlots();
    syncSubmit();
  }).catch(error => message(error.message, true));
})();
