(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const labels = { pending: 'Ожидает', confirmed: 'Подтверждена', completed: 'Завершена', cancelled: 'Отменена', expired: 'Резерв истёк' };
  const transitions = { pending: ['pending','confirmed','cancelled'], confirmed: ['confirmed','completed','cancelled'], completed: ['completed'], cancelled: ['cancelled'], expired: ['expired'] };
  const services = { vocal: 'Запись вокала', mix: 'Сведение и мастеринг', beat: 'Написание бита' };
  const when = n => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Vladivostok', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(n));
  const localTime = n => new Date(n + 10 * 3600000).toISOString().slice(0, 16);
  let bookings = [], offset = 0, total = 0, loading, loggedIn = false;
  function message(value, error = false) { $('#message').textContent = value; $('#message').classList.toggle('error', error); }
  function showLogin() { loggedIn = false; document.body.classList.remove('is-authenticated'); $('#login-panel').hidden = false; $('#workspace').hidden = true; $('#logout').hidden = true; $('#bookings').replaceChildren(); bookings = []; }
  async function api(path, options = {}) {
    const response = await fetch('/api/booking/' + path, { credentials: 'same-origin', cache: 'no-store', ...options });
    let data;
    try { data = await response.json(); } catch { throw new Error('Сервер недоступен. Проверьте подключение.'); }
    if (!response.ok) {
      if (response.status === 401 && loggedIn) showLogin();
      throw Object.assign(new Error(data.error || 'Не удалось выполнить запрос.'), { status: response.status });
    }
    return data;
  }
  const jsonOptions = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  async function enter() {
    const session = await api('admin/session');
    loggedIn = true; $('#login-panel').hidden = true; $('#workspace').hidden = false; $('#logout').hidden = false;
    document.body.classList.add('is-authenticated');
    try { $('#legacy-data').hidden = !localStorage.getItem('waveBookings'); } catch {}
    $('#notification-state').textContent = `Telegram: ${session.notifications.telegram ? 'настроен' : 'не подключён'} · Почта: ${session.notifications.email ? 'настроена' : 'не подключена'}`;
    const config = await api('admin/settings');
    for (const service of config.services) $('#price-' + service.id).value = service.price;
    await load();
  }
  async function load() {
    loading?.abort(); loading = new AbortController();
    $('#refresh').disabled = true;
    try {
      const params = new URLSearchParams({ status: $('#status-filter').value, day: $('#day-filter').value, offset });
      const data = await api('admin/bookings?' + params, { signal: loading.signal });
      bookings = data.bookings; total = data.total;
      if (offset && !bookings.length) { offset = Math.max(0, offset - 100); return await load(); }
      render();
    } catch (error) { if (error.name !== 'AbortError') message(error.message, true); }
    finally { $('#refresh').disabled = false; }
  }
  function render() {
    const list = $('#bookings'); list.replaceChildren();
    $('#count').textContent = `${total} всего`;
    $('#page-label').textContent = total ? `${offset + 1}–${Math.min(offset + 100, total)} из ${total}` : '0 заявок';
    $('#previous').disabled = offset === 0; $('#next').disabled = offset + 100 >= total;
    $('#export').disabled = !bookings.length;
    if (!bookings.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'Заявок по этим условиям пока нет.'; list.append(empty); }
    for (const b of bookings) {
      const card = $('#booking-template').content.cloneNode(true);
      const q = selector => card.querySelector(selector);
      q('.service').textContent = services[b.service]; q('.client-name').textContent = b.name;
      q('.badge').textContent = labels[b.status]; q('.badge').classList.add(b.status);
      q('.session-time').textContent = `${when(b.starts_at)} → ${when(b.starts_at + b.duration * 3600000)} · ${b.duration} ч`;
      q('.contact').textContent = `${b.phone} · ${b.email}`;
      q('.client-comment').textContent = b.comment;
      q('.reference').textContent = `№ ${b.id} · создана ${when(b.created_at)} · v${b.version}`;
      q('.hold').textContent = b.status === 'pending' ? `Резерв до ${when(b.hold_until)}` : '';
      const status = q('.edit-status'), start = q('.edit-start'), duration = q('.edit-duration'), note = q('.edit-note');
      for (const value of transitions[b.status]) status.add(new Option(labels[value], value));
      status.value = b.status; start.value = localTime(b.starts_at); duration.value = b.duration; note.value = b.note;
      const active = ['pending', 'confirmed'].includes(b.status);
      start.disabled = duration.disabled = !active;
      const editForm = q('.edit-form');
      editForm.addEventListener('submit', async event => {
        event.preventDefault();
        const button = editForm.querySelector('button'); button.disabled = true;
        try {
          const payload = { version: b.version, status: status.value, note: note.value };
          if (start.value !== localTime(b.starts_at) || Number(duration.value) !== b.duration) {
            payload.startsAt = new Date(start.value + ':00+10:00').toISOString(); payload.duration = Number(duration.value);
          }
          const result = await api('admin/bookings/' + b.id, jsonOptions('PATCH', payload));
          const failures = Object.entries(result.notifications).filter(([, ok]) => !ok).map(([name]) => name);
          message(failures.length ? `Заявка сохранена. Не доставлено уведомление: ${failures.join(', ')}. Свяжитесь с клиентом отдельно.` : 'Изменения сохранены.');
          await load();
        } catch (error) { message(error.message, true); if (error.status === 409) await load(); }
        finally { button.disabled = false; }
      });
      list.append(card);
    }
  }
  $('#password-toggle').addEventListener('click', () => {
    const show = $('#password').type === 'password';
    $('#password').type = show ? 'text' : 'password';
    $('#password-toggle').setAttribute('aria-pressed', String(show));
    $('#password-toggle').setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
  });
  $('#login-form').addEventListener('submit', async event => {
    event.preventDefault(); const button = event.currentTarget.querySelector('[type="submit"]'); button.disabled = true;
    const password = $('#password').value; $('#password').value = ''; $('#password').type = 'password';
    $('#password-toggle').setAttribute('aria-pressed', 'false'); $('#password-toggle').setAttribute('aria-label', 'Показать пароль');
    try { await api('admin/login', jsonOptions('POST', { password })); message(''); await enter(); }
    catch (error) { message(error.message, true); $('#password').focus(); }
    finally { button.disabled = false; }
  });
  $('#logout').addEventListener('click', async () => {
    try { await api('admin/logout', jsonOptions('POST', {})); showLogin(); message('Вы вышли из студии.'); }
    catch (error) { message(error.message, true); }
  });
  for (const selector of ['#status-filter', '#day-filter']) $(selector).addEventListener('change', () => { offset = 0; load(); });
  $('#refresh').addEventListener('click', load);
  $('#previous').addEventListener('click', () => { offset = Math.max(0, offset - 100); load(); });
  $('#next').addEventListener('click', () => { offset += 100; load(); });
  $('#prices-form').addEventListener('submit', async event => {
    event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true;
    try {
      await api('admin/settings', jsonOptions('PUT', Object.fromEntries(Object.keys(services).map(id => [id, $('#price-' + id).value]))));
      message('Цены обновлены на сайте для всех посетителей.');
    } catch (error) { message(error.message, true); }
    finally { button.disabled = false; }
  });
  $('#export').addEventListener('click', () => {
    const cell = value => { let s = String(value ?? ''); if (/^[\s]*[=+@-]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; };
    const data = [['Номер', 'Имя', 'Email', 'Телефон', 'Услуга', 'Дата (Хабаровск)', 'Часов', 'Статус', 'Заметка'],
      ...bookings.map(b => [b.id, b.name, b.email, b.phone, services[b.service], when(b.starts_at), b.duration, labels[b.status], b.note])];
    const url = URL.createObjectURL(new Blob(['\ufeff' + data.map(row => row.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'wave-bookings-page.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('#legacy-export').addEventListener('click', () => {
    try {
      const raw = localStorage.getItem('waveBookings');
      if (!raw) return;
      const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'wave-legacy-bookings.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { message('Не удалось прочитать старые заявки из браузера.', true); }
  });
  enter().catch(error => { if (error.status !== 401) message(error.message, true); });
})();
