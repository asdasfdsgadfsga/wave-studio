
document.addEventListener('DOMContentLoaded', () => {
    // ЗАГРУЗКА ЦЕН ИЗ НАСТРОЕК АДМИНКИ
    try {
        const settings = JSON.parse(localStorage.getItem('waveSettings'));
        if (settings) {
            if (settings.vocal) {
                const pv = document.getElementById('price-vocal');
                const ov = document.getElementById('opt-vocal');
                if(pv) pv.textContent = 'Цена: ' + settings.vocal;
                if(ov) ov.textContent = 'Запись вокала (' + settings.vocal + ')';
            }
            if (settings.mix) {
                const pm = document.getElementById('price-mix');
                const om = document.getElementById('opt-mix');
                if(pm) pm.textContent = 'Цена: ' + settings.mix;
                if(om) om.textContent = 'Сведение и мастеринг (' + settings.mix + ')';
            }
            if (settings.beat) {
                const pb = document.getElementById('price-beat');
                const ob = document.getElementById('opt-beat');
                if(pb) pb.textContent = 'Цена: ' + settings.beat;
                if(ob) ob.textContent = 'Написание бита (' + settings.beat + ')';
            }
        }
    } catch(e) {}
});

// Пословное проявление текста со снятием размытия (Word-by-word Scroll Reveal)
function initWordReveal() {
    const targetSelectors = [
        '.hero-subtitle',
        '.about-text p',
        '.services-subtitle',
        '.showcase-subtitle',
        '.gear-subtitle',
        '.reviews-subtitle',
        '.gallery-subtitle',
        '.faq-subtitle',
        '.booking-desc',
        '.daw-promo-desc'
    ];

    const targets = document.querySelectorAll(targetSelectors.join(','));

    targets.forEach(el => {
        if (el.dataset.srInitialized) return;
        el.dataset.srInitialized = 'true';
        el.classList.add('sr-text');

        let wordCount = 0;

        function processNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                const tokens = text.split(/(\s+)/);
                const fragment = document.createDocumentFragment();

                tokens.forEach(token => {
                    if (!token) return;
                    if (/^\s+$/.test(token)) {
                        fragment.appendChild(document.createTextNode(token));
                    } else {
                        const span = document.createElement('span');
                        span.className = 'sr-word';
                        span.style.setProperty('--w-idx', wordCount++);
                        span.textContent = token;
                        fragment.appendChild(span);
                    }
                });

                if (node.parentNode) {
                    node.parentNode.replaceChild(fragment, node);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const childNodes = Array.from(node.childNodes);
                childNodes.forEach(child => processNode(child));
            }
        }

        const childNodes = Array.from(el.childNodes);
        childNodes.forEach(child => processNode(child));
    });
}

// Р­С„С„РµРєС‚ СЃРІРµС‚РѕРІРѕРіРѕ Р»СѓС‡Р° Р·Р° РєСѓСЂСЃРѕСЂРѕРј (Spotlight Card)
function initSpotlightCards() {
    const cards = document.querySelectorAll('.card-spotlight, .service-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
            card.style.setProperty('--spotlight-color', 'rgba(199, 125, 255, 0.22)');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // 0. РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ РїРѕСЃР»РѕРІРЅРѕРіРѕ РїСЂРѕСЏРІР»РµРЅРёСЏ С‚РµРєСЃС‚Р°
    initWordReveal();

    // 0.1 РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ РєР°СЂС‚РѕС‡РµРє СЃ СЌС„С„РµРєС‚РѕРј Spotlight
    initSpotlightCards();

    // 1. РђРЅРёРјР°С†РёСЏ СЌР»РµРјРµРЅС‚РѕРІ РїСЂРё СЃРєСЂРѕР»Р»Рµ (РєР°Р¶РґС‹Р№ СЂР°Р· РїСЂРё РїРѕСЏРІР»РµРЅРёРё)
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            } else {
                // РЈР±РёСЂР°РµРј РєР»Р°СЃСЃ, С‡С‚РѕР±С‹ Р°РЅРёРјР°С†РёСЏ РїРѕРІС‚РѕСЂСЏР»Р°СЃСЊ РїСЂРё РІРѕР·РІСЂР°С‚Рµ РЅР° СЃРµРєС†РёСЋ
                entry.target.classList.remove('is-visible');
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
        observer.observe(el);
    });

    // 1.1 3D OPTION WHEEL РќРђР’РР“РђР¦РРЇ
    const wheelNav = document.getElementById('side-option-wheel');
    const wheelItems = wheelNav ? Array.from(wheelNav.querySelectorAll('.ow-item')) : [];
    const sections = Array.from(document.querySelectorAll('.scroll-section'));

    if (wheelNav && wheelItems.length > 0) {
        const n = wheelItems.length;
        const rowH = 40;
        const tilt = 8.5;
        const curve = 0.75;
        const blur = 1.6;
        const fade = 0.28;
        const minOpacity = 0.1;
        const smoothing = 220; // ms
        const mirror = -1; // right side
        const tiltRad = (tilt * Math.PI) / 180;
        const R = tiltRad > 0.0005 ? rowH / tiltRad : 0;

        let cur = 0;
        let target = 0;
        let rafId = null;
        let lastTime = 0;
        let selectedIndex = 0;
        let lastTickTime = 0;
        let audioCtx = null;

        function playTick() {
            try {
                const now = performance.now();
                if (now - lastTickTime < 80) return;
                lastTickTime = now;

                if (!audioCtx) {
                    const AC = window.AudioContext || window.webkitAudioContext;
                    if (AC) audioCtx = new AC();
                }
                if (!audioCtx) return;
                if (audioCtx.state === 'suspended') audioCtx.resume();

                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                const t = audioCtx.currentTime;

                osc.type = 'sine';
                osc.frequency.setValueAtTime(1400, t);
                osc.frequency.exponentialRampToValueAtTime(320, t + 0.022);

                gain.gain.setValueAtTime(0.035, t);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);

                osc.connect(gain);
                gain.connect(audioCtx.destination);

                osc.start(t);
                osc.stop(t + 0.022);
            } catch (e) {}
        }

        function runFrame(now) {
            if (!lastTime) lastTime = now;
            const dt = Math.min((now - lastTime) / 1000, 0.05);
            lastTime = now;

            const tau = smoothing / 1000;
            const k = 1 - Math.exp(-dt / tau);

            let next = cur + (target - cur) * k;
            const settled = Math.abs(target - next) < 0.001;
            if (settled) next = target;
            cur = next;

            // Check if active rounded index changed
            const nearest = Math.round(cur);
            if (nearest !== selectedIndex) {
                selectedIndex = nearest;
                playTick();
            }

            for (let i = 0; i < n; i++) {
                const el = wheelItems[i];
                if (!el) continue;
                const d = i - cur;
                const dist = Math.abs(d);

                let x = 0;
                let y = d * rowH;
                let rot = 0;

                if (R > 0) {
                    const ang = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, d * tiltRad));
                    y = R * Math.sin(ang);
                    x = -mirror * R * (1 - Math.cos(ang)) * curve;
                    rot = (mirror * ang * 180) / Math.PI;
                }

                const isSelected = nearest === i;
                if (isSelected && !el.classList.contains('active')) {
                    el.classList.add('active');
                    el.setAttribute('aria-selected', 'true');
                } else if (!isSelected && el.classList.contains('active')) {
                    el.classList.remove('active');
                    el.setAttribute('aria-selected', 'false');
                }

                el.style.transform = `translate3d(${x.toFixed(2)}px, calc(${y.toFixed(2)}px - 50%), 0) rotate(${rot.toFixed(3)}deg)`;
                el.style.opacity = Math.max(minOpacity, 1 - dist * fade).toFixed(3);
                el.style.filter = blur > 0 && dist > 0.15 ? `blur(${Math.min(dist * blur, 6).toFixed(2)}px)` : 'none';
                el.style.pointerEvents = dist > 3.6 ? 'none' : 'auto';
            }

            if (!settled) {
                rafId = requestAnimationFrame(runFrame);
            } else {
                rafId = null;
            }
        }

        function setWheelTarget(val) {
            val = Math.max(0, Math.min(n - 1, val));
            target = val;
            if (rafId == null) {
                lastTime = performance.now();
                rafId = requestAnimationFrame(runFrame);
            }
        }

        // Render initial frame immediately
        runFrame(performance.now());

        // Click on wheel item -> scroll page to section
        wheelItems.forEach((item, idx) => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                setWheelTarget(idx);
                const href = item.getAttribute('href');
                if (href) {
                    if (href === '#gallery') {
                        wheelNav.classList.add('nav-transparent');
                    } else {
                        wheelNav.classList.remove('nav-transparent');
                    }
                    const sec = document.querySelector(href);
                    if (sec) {
                        sec.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });

        // Wheel event on OptionWheel container -> step through items
        let wheelTimeout = null;
        wheelNav.addEventListener('wheel', (e) => {
            e.preventDefault();
            const step = e.deltaY > 0 ? 1 : -1;
            const newT = Math.max(0, Math.min(n - 1, Math.round(target) + step));
            setWheelTarget(newT);

            if (wheelTimeout) clearTimeout(wheelTimeout);
            wheelTimeout = setTimeout(() => {
                const targetItem = wheelItems[newT];
                if (targetItem) {
                    const href = targetItem.getAttribute('href');
                    if (href === '#gallery') {
                        wheelNav.classList.add('nav-transparent');
                    } else {
                        wheelNav.classList.remove('nav-transparent');
                    }
                    const sec = document.querySelector(href);
                    if (sec) {
                        sec.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            }, 100);
        }, { passive: false });

        // Observer for sections -> updates OptionWheel target smoothly
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    const matchingItem = wheelNav.querySelector(`.ow-item[href="#${id}"]`);
                    if (matchingItem) {
                        const index = parseInt(matchingItem.getAttribute('data-index'), 10);
                        if (!isNaN(index)) {
                            setWheelTarget(index);
                        }
                    }

                    // Side nav transparency on gallery section
                    if (id === 'gallery') {
                        wheelNav.classList.add('nav-transparent');
                    } else {
                        wheelNav.classList.remove('nav-transparent');
                    }

                    // Hide DAW button on footer
                    const headerDawBtn = document.getElementById('header-daw-btn');
                    if (headerDawBtn) {
                        if (id === 'footer') {
                            headerDawBtn.style.opacity = '0';
                            headerDawBtn.style.pointerEvents = 'none';
                        } else {
                            headerDawBtn.style.opacity = '1';
                            headerDawBtn.style.pointerEvents = 'auto';
                        }
                    }
                }
            });
        }, { threshold: 0.5 });

        sections.forEach(section => {
            sectionObserver.observe(section);
        });
    }

    // 3. РћРіСЂР°РЅРёС‡РµРЅРёРµ РґР°С‚С‹ (РЅРµР»СЊР·СЏ РІС‹Р±СЂР°С‚СЊ СЃРµРіРѕРґРЅСЏ Рё СЂР°РЅСЊС€Рµ)
    const dateInput = document.getElementById('book-date');
    if (dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        // Р¤РѕСЂРјР°С‚РёСЂСѓРµРј РґР»СЏ datetime-local (YYYY-MM-DDThh:mm)
        const tzOffset = tomorrow.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(tomorrow - tzOffset)).toISOString().slice(0, 16);
        dateInput.min = localISOTime;
    }

    // 4. РњРѕРґР°Р»СЊРЅС‹Рµ РѕРєРЅР° (РРЅС„Рѕ)
    const authModal = document.getElementById('auth-modal');
    const infoModal = document.getElementById('info-modal');
    const bookingModal = document.getElementById('booking-modal');
    
    const infoData = {
        socials: {
            title: 'Наши соцсети',
            body: 'Подписывайтесь на нас, чтобы не пропустить обновления и новые плагины:<br><div class="social-links"><a href="#" target="_blank">ВКонтакте</a><a href="#" target="_blank">Telegram</a><a href="#" target="_blank">YouTube</a></div>'
        },
        support: {
            title: 'Поддержка 24/7',
            body: 'Если у вас возникли проблемы, наша команда всегда готова помочь.<br><br>Email: support@waveprodmusic.com<br>Telegram: @waveprod_support'
        }
    };

    // РћС‚РєСЂС‹С‚РёРµ РјРѕРґР°Р»РѕРє РёР· РјРµРЅСЋ/РєРЅРѕРїРѕРє
    document.querySelectorAll('[data-open-modal]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = link.getAttribute('data-open-modal');
            
            if (modalId === 'auth') {
                authModal.classList.add('active');
                const tab = link.getAttribute('data-tab');
                if (tab) switchAuthTab(tab);
            } else if (modalId === 'info') {
                const infoKey = link.getAttribute('data-info');
                document.getElementById('info-title').innerHTML = infoData[infoKey].title;
                document.getElementById('info-body').innerHTML = infoData[infoKey].body;
                infoModal.classList.add('active');
            } else if (modalId === 'booking') {
                bookingModal.classList.add('active');
                document.getElementById('booking-form').style.display = 'flex';
                document.getElementById('booking-success').style.display = 'none';
            }
            
            closeMobileMenu();
        });
    });

    // Р—Р°РєСЂС‹С‚РёРµ РјРѕРґР°Р»РѕРє
    function closeModals() {
        if(authModal) authModal.classList.remove('active');
        if(infoModal) infoModal.classList.remove('active');
        if(bookingModal) bookingModal.classList.remove('active');
        resetForms();
    }

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModals();
        });
    });

    // РџРµСЂРµРєР»СЋС‡РµРЅРёРµ РІРєР»Р°РґРѕРє Р’С…РѕРґ/Р РµРіРёСЃС‚СЂР°С†РёСЏ
    const tabBtns = document.querySelectorAll('.tab-btn');
    const authForms = document.querySelectorAll('.auth-form');

    function switchAuthTab(tabId) {
        tabBtns.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        authForms.forEach(form => {
            if (form.id === `${tabId}-form`) form.classList.add('active');
            else form.classList.remove('active');
        });
        resetForms();
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchAuthTab(btn.getAttribute('data-tab'));
        });
    });

    // РЈС‚РёР»РёС‚С‹ РґР»СЏ РІР°Р»РёРґР°С†РёРё
    function resetForms() {
        document.querySelectorAll('.auth-form').forEach(f => {
            f.reset();
            const btn = f.querySelector('button');
            if(f.id === 'login-form') btn.textContent = 'Войти';
            if(f.id === 'register-form') btn.textContent = 'Зарегистрироваться';
            btn.style.backgroundColor = '';
            btn.style.borderColor = '';
        });
        document.querySelectorAll('.form-group input').forEach(input => {
            input.classList.remove('invalid');
            input.nextElementSibling.textContent = ''; 
        });
    }

    function showError(input, message) {
        input.classList.add('invalid');
        input.nextElementSibling.textContent = message;
    }

    function clearError(input) {
        input.classList.remove('invalid');
        input.nextElementSibling.textContent = '';
    }
 const phoneInput = document.getElementById('book-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function (e) {
            let input = e.target.value.replace(/\D/g, ''); // РћСЃС‚Р°РІР»СЏРµРј С‚РѕР»СЊРєРѕ С†РёС„СЂС‹
            let formatted = '';
            
            if (input.length > 0) {
                if (input[0] === '8' || input[0] === '7' || input[0] === '9') {
                    if (input[0] === '9') input = '7' + input;
                    else input = '7' + input.substring(1);
                }
            }

            if (input.length === 0) {
                formatted = '';
            } else if (input.length <= 1) {
                formatted = '+7';
            } else if (input.length <= 4) {
                formatted = '+7 (' + input.substring(1);
            } else if (input.length <= 7) {
                formatted = '+7 (' + input.substring(1, 4) + ') ' + input.substring(4);
            } else if (input.length <= 9) {
                formatted = '+7 (' + input.substring(1, 4) + ') ' + input.substring(4, 7) + '-' + input.substring(7);
            } else {
                formatted = '+7 (' + input.substring(1, 4) + ') ' + input.substring(4, 7) + '-' + input.substring(7, 9) + '-' + input.substring(9, 11);
            }
            
            e.target.value = formatted;
        });
        
        phoneInput.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && e.target.value.length <= 4) {
                e.target.value = '';
            }
        });

        phoneInput.addEventListener('blur', function(e) {
            if (e.target.value === '+7' || e.target.value === '+7 (') {
                e.target.value = '';
            }
        });
    }
    // Р’Р°Р»РёРґР°С†РёСЏ Р РµРіРёСЃС‚СЂР°С†РёРё
    const regForm = document.getElementById('register-form');
    if (regForm) {
        regForm.addEventListener('submit', (e) => {
            e.preventDefault();
            let isValid = true;
            
            const name = document.getElementById('reg-name');
            const email = document.getElementById('reg-email');
            const pass = document.getElementById('reg-password');
            const passConf = document.getElementById('reg-password-confirm');
            
            // РРјСЏ
            if (name.value.trim().length < 2) {
                showError(name, 'Имя слишком короткое (минимум 2 символа)');
                isValid = false;
            } else clearError(name);
            
            // Email (Regex РїСЂРѕРІРµСЂРєР°)
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.value.trim())) {
                showError(email, 'Неверный формат email');
                isValid = false;
            } else clearError(email);
            

            
            // РџР°СЂРѕР»СЊ
            if (pass.value.length < 6) {
                showError(pass, 'Пароль должен быть от 6 символов');
                isValid = false;
            } else clearError(pass);
            
            // РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РїР°СЂРѕР»СЏ
            if (pass.value !== passConf.value || passConf.value === '') {
                showError(passConf, 'Пароли не совпадают');
                isValid = false;
            } else clearError(passConf);
            
            // Р•СЃР»Рё РІСЃРµ РІРµСЂРЅРѕ
            if (isValid) {
                const btn = regForm.querySelector('button');
                btn.textContent = 'Успешно!';
                btn.style.backgroundColor = '#4caf50';
                btn.style.borderColor = '#4caf50';
                
                setTimeout(() => {
                    closeModals();
                }, 1500);
            }
        });
    }

    // Р’Р°Р»РёРґР°С†РёСЏ Р’С…РѕРґР°
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            let isValid = true;
            
            const email = document.getElementById('login-email');
            const pass = document.getElementById('login-password');
            
            if (!email.value.trim()) {
                showError(email, 'Введите email');
                isValid = false;
            } else clearError(email);
            
            if (!pass.value) {
                showError(pass, 'Введите пароль');
                isValid = false;
            } else clearError(pass);
            
            if (isValid) {
                const btn = loginForm.querySelector('button');
                btn.textContent = 'Вход выполнен...';
                btn.style.backgroundColor = '#9d4edd';
                
                setTimeout(() => {
                    closeModals();
                }, 1000);
            }
        });
    }

    // Р’Р°Р»РёРґР°С†РёСЏ Р±СЂРѕРЅРёСЂРѕРІР°РЅРёСЏ Рё РѕС‚РїСЂР°РІРєР° РЅР° Р±РµРєРµРЅРґ
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let isValid = true;
            
            const name = document.getElementById('book-name');
            const email = document.getElementById('book-email');
            const phone = document.getElementById('book-phone');
            const service = document.getElementById('book-service');
            const date = document.getElementById('book-date');
            
            if (name.value.trim().length < 2) {
                showError(name, 'Введите корректное имя');
                isValid = false;
            } else clearError(name);
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.value.trim())) {
                showError(email, 'Неверный формат email');
                isValid = false;
            } else clearError(email);

            if (service.value === '') {
                showError(service, 'Выберите услугу');
                isValid = false;
            } else clearError(service);

            if (!date.value) {
                showError(date, 'Выберите дату и время');
                isValid = false;
            } else clearError(date);
            
            
            if (isValid) {
                // РЎРћРҐР РђРќР•РќРР• Р”Р›РЇ РђР”РњРРќ РџРђРќР•Р›Р
                const storedBookings = JSON.parse(localStorage.getItem('waveBookings') || '[]');
                storedBookings.push({
                    id: Date.now(),
                    name: name.value,
                    email: email.value,
                    phone: phone.value,
                    service: service.value,
                    date: date.value,
                    timestamp: new Date().toISOString()
                });
                localStorage.setItem('waveBookings', JSON.stringify(storedBookings));
                
                
                const btn = bookingForm.querySelector('button');
                const originalText = btn.textContent;
                btn.textContent = 'Отправка...';
                
                try {
                    // РћС‚РїСЂР°РІРєР° РґР°РЅРЅС‹С… РЅР° Р±РµРєРµРЅРґ
                    const response = await fetch('http://localhost:3000/api/book', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: name.value,
                            email: email.value,
                            phone: phone.value,
                            service: service.value,
                            date: date.value
                        })
                    });

                    if (response.ok) {
                        bookingForm.style.display = 'none';
                        const successScreen = document.getElementById('booking-success');
                        successScreen.style.display = 'block';
                        
                        const successText = document.getElementById('booking-success-text');
                        successText.innerHTML = `На вашу почту <strong>${email.value}</strong> было отправлено письмо со всеми деталями бронирования и дальнейшими инструкциями.`;
                        
                        bookingForm.reset();
                    } else {
                        // Р•СЃР»Рё СЃРµСЂРІРµСЂ РІРµСЂРЅСѓР» РѕС€РёР±РєСѓ, РїСЂРѕСЃС‚Рѕ РїРѕРєР°Р·С‹РІР°РµРј СѓСЃРїРµС… РґР»СЏ РІРёР·СѓР°Р»Р° (РґРµРјРѕ-СЂРµР¶РёРј)
                        console.warn('Сервер вернул ошибку, но мы показываем экран успеха для демо.');
                        showSuccessScreen(email.value);
                    }
                } catch (error) {
                    // Р•СЃР»Рё Р±РµРєРµРЅРґ РЅРµ Р·Р°РїСѓС‰РµРЅ (ECONNREFUSED), РїРѕРєР°Р·С‹РІР°РµРј СѓСЃРїРµС… РґР»СЏ РґРµРјРѕРЅСЃС‚СЂР°С†РёРё UI
                    console.warn('Бекенд не запущен. Переход в демо-режим (показ экрана успеха).', error);
                    showSuccessScreen(email.value);
                } finally {
                    btn.textContent = originalText;
                }
            }
        });
        
        // Р’СЃРїРѕРјРѕРіР°С‚РµР»СЊРЅР°СЏ С„СѓРЅРєС†РёСЏ РґР»СЏ РїРѕРєР°Р·Р° СЌРєСЂР°РЅР° СѓСЃРїРµС…Р°
        function showSuccessScreen(userEmail) {
            bookingForm.style.display = 'none';
            const successScreen = document.getElementById('booking-success');
            successScreen.style.display = 'block';
            const successText = document.getElementById('booking-success-text');
            successText.innerHTML = `На вашу почту <strong>${userEmail}</strong> было отправлено письмо со всеми деталями бронирования.`;
            bookingForm.reset();
        }
    }

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // 5. РџР»Р°РІРЅС‹Р№ СЃРєСЂРѕР»Р» РїРѕ СЏРєРѕСЂРЅС‹Рј СЃСЃС‹Р»РєР°Рј ("РџСЂР°Р№СЃ" -> #services)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // РўР°Рє РєР°Рє scroll-snap РІРёСЃРёС‚ РЅР° main, РєСЂСѓС‚РёРј main
                const main = document.querySelector('.scroll-container');
                main.scrollTo({
                    top: targetElement.offsetTop,
                    behavior: 'smooth'
                });
            }
            
            closeMobileMenu();
        });
    });
});


    
// Р—Р°РіР»СѓС€РєР° РґР»СЏ Р·Р°РєСЂС‹С‚РёСЏ РјРѕР±РёР»СЊРЅРѕРіРѕ РјРµРЅСЋ, РµСЃР»Рё РјРµРЅСЋ РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚
function closeMobileMenu() {
    const nav = document.querySelector('.side-nav') || document.querySelector('.nav-links');
    if (nav && nav.classList.contains('open')) {
        nav.classList.remove('open');
    }
}


/* ===================================================
   РРќРўР•Р РђРљРўРР’РќР«Р™ A/B РђРЈР”РРћРџР›Р•Р•Р  РЎР РђР’РќР•РќРРЇ "Р”Рћ / РџРћРЎР›Р•"
   =================================================== */
/* ===================================================
   ИНТЕРАКТИВНЫЙ A/B АУДИОПЛЕЕР СРАВНЕНИЯ "ДО / ПОСЛЕ"
   =================================================== */
document.addEventListener('DOMContentLoaded', () => {
    const audioRaw = document.getElementById('ab-audio-raw');
    const audioMaster = document.getElementById('ab-audio-mastered');
    const playBtn = document.getElementById('ab-play-btn');
    const playIcon = document.getElementById('ab-play-icon');
    const pauseIcon = document.getElementById('ab-pause-icon');
    const btnRaw = document.getElementById('ab-btn-raw');
    const btnMaster = document.getElementById('ab-btn-mastered');
    const playerCard = document.querySelector('.ab-player-card');
    const discIcon = document.querySelector('.ab-disc-icon');
    const progressFill = document.getElementById('ab-progress-fill');
    const progressHandle = document.getElementById('ab-progress-handle');
    const scrubBar = document.getElementById('ab-scrub-bar');
    const currentTimeEl = document.getElementById('ab-current-time');
    const durationTimeEl = document.getElementById('ab-duration-time');
    const volumeSlider = document.getElementById('ab-volume-slider');
    const stateBadgeText = document.getElementById('ab-state-text');
    const specRaw = document.getElementById('spec-card-raw');
    const specMaster = document.getElementById('spec-card-mastered');
    const canvas = document.getElementById('ab-wave-canvas');

    if (!audioRaw || !audioMaster || !playBtn) return;

    const TRACK_DURATION = 38.6; // Точная длительность трека
    let isPlaying = false;
    let currentMode = 'mastered'; // 'raw' или 'mastered'
    let masterVolume = 0.85;

    // Web Audio API для живой синхронизации спектра с визуализатором волны
    let audioCtx = null;
    let analyser = null;
    let dataArray = null;

    function initVisualizerAudio() {
        if (audioCtx) return;
        try {
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioCtxClass();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128; // 64 частотные полосы
            analyser.smoothingTimeConstant = 0.8;
            dataArray = new Uint8Array(analyser.frequencyBinCount);

            const sourceMaster = audioCtx.createMediaElementSource(audioMaster);
            const sourceRaw = audioCtx.createMediaElementSource(audioRaw);

            sourceMaster.connect(analyser);
            sourceRaw.connect(analyser);
            analyser.connect(audioCtx.destination);
        } catch (e) {
            console.warn('Web Audio API audio visualizer init note:', e);
        }
    }

    if (durationTimeEl) durationTimeEl.textContent = '0:38';

    function updateAudios() {
        if (currentMode === 'mastered') {
            audioMaster.volume = masterVolume;
            audioRaw.volume = 0; // заглушен, но идет синхронно
        } else {
            audioRaw.volume = masterVolume;
            audioMaster.volume = 0; // заглушен, но идет синхронно
        }
    }
    updateAudios();

    function formatTime(sec) {
        if (isNaN(sec) || sec < 0 || !isFinite(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    async function togglePlay() {
        initVisualizerAudio();
        if (audioCtx && audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        const activeAudio = currentMode === 'mastered' ? audioMaster : audioRaw;
        const inactiveAudio = currentMode === 'mastered' ? audioRaw : audioMaster;

        if (!isPlaying) {
            try {
                if (activeAudio.currentTime >= TRACK_DURATION - 0.5) {
                    audioMaster.currentTime = 0;
                    audioRaw.currentTime = 0;
                }
                inactiveAudio.currentTime = activeAudio.currentTime;
                audioMaster.playbackRate = 1.0;
                audioRaw.playbackRate = 1.0;
                updateAudios();

                await Promise.all([audioMaster.play(), audioRaw.play()]);
                isPlaying = true;
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'block';
                discIcon.classList.add('playing');
            } catch (err) {
                console.error('Audio playback error:', err);
            }
        } else {
            audioMaster.pause();
            audioRaw.pause();
            isPlaying = false;
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            discIcon.classList.remove('playing');
        }
    }

    playBtn.addEventListener('click', togglePlay);

    function setMode(mode) {
        if (currentMode === mode) return;
        const oldActive = currentMode === 'mastered' ? audioMaster : audioRaw;
        currentMode = mode;
        const newActive = currentMode === 'mastered' ? audioMaster : audioRaw;

        // Синхронизируем позицию нового активного трека
        newActive.currentTime = oldActive.currentTime;
        newActive.playbackRate = 1.0;

        if (mode === 'raw') {
            btnRaw.classList.add('active');
            btnMaster.classList.remove('active');
            playerCard.classList.add('is-raw');
            playerCard.classList.remove('is-mastered');
            specRaw.classList.add('active');
            specMaster.classList.remove('active');
            stateBadgeText.textContent = 'RAW AUDIO • DEMO (-6dB)';
            stateBadgeText.parentElement.style.borderColor = 'rgba(255, 77, 77, 0.5)';
            stateBadgeText.parentElement.style.background = 'rgba(255, 77, 77, 0.12)';
            stateBadgeText.parentElement.style.color = '#ff6b6b';
        } else {
            btnMaster.classList.add('active');
            btnRaw.classList.remove('active');
            playerCard.classList.add('is-mastered');
            playerCard.classList.remove('is-raw');
            specMaster.classList.add('active');
            specRaw.classList.remove('active');
            stateBadgeText.textContent = 'MASTERED • 3D STEREO';
            stateBadgeText.parentElement.style.borderColor = 'rgba(157, 78, 221, 0.4)';
            stateBadgeText.parentElement.style.background = 'rgba(157, 78, 221, 0.15)';
            stateBadgeText.parentElement.style.color = '#c77dff';
        }

        updateAudios();
    }

    btnRaw.addEventListener('click', () => setMode('raw'));
    btnMaster.addEventListener('click', () => setMode('mastered'));

    volumeSlider.addEventListener('input', (e) => {
        masterVolume = parseFloat(e.target.value);
        updateAudios();
    });

    // Обработчик тика: активный трек играет плавно, без смены playbackRate и без заиканий
    function onAudioTick(sourceAudio) {
        const activeAudio = currentMode === 'mastered' ? audioMaster : audioRaw;
        const inactiveAudio = currentMode === 'mastered' ? audioRaw : audioMaster;
        if (sourceAudio !== activeAudio) return;

        const curTime = activeAudio.currentTime;

        if (curTime >= TRACK_DURATION) {
            audioMaster.currentTime = 0;
            audioRaw.currentTime = 0;
            return;
        }

        const progress = Math.min(100, (curTime / TRACK_DURATION) * 100);
        progressFill.style.width = progress + '%';
        progressHandle.style.left = progress + '%';
        currentTimeEl.textContent = formatTime(curTime);
        durationTimeEl.textContent = '0:38';

        // Корректируем ТОЛЬКО неактивный трек, если он отстал, активный не трогаем!
        const drift = activeAudio.currentTime - inactiveAudio.currentTime;
        if (Math.abs(drift) > 0.18) {
            inactiveAudio.currentTime = activeAudio.currentTime;
        }
    }

    audioMaster.addEventListener('timeupdate', () => onAudioTick(audioMaster));
    audioRaw.addEventListener('timeupdate', () => onAudioTick(audioRaw));

    function onEnded() {
        audioMaster.currentTime = 0;
        audioRaw.currentTime = 0;
        if (isPlaying) {
            audioMaster.play();
            audioRaw.play();
        }
    }
    audioMaster.addEventListener('ended', onEnded);
    audioRaw.addEventListener('ended', onEnded);

    function scrub(e) {
        const rect = scrubBar.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const pct = clickX / rect.width;
        const targetTime = Math.min(TRACK_DURATION - 0.05, Math.max(0, pct * TRACK_DURATION));

        audioMaster.currentTime = targetTime;
        audioRaw.currentTime = targetTime;

        currentTimeEl.textContent = formatTime(targetTime);
        progressFill.style.width = (pct * 100) + '%';
        progressHandle.style.left = (pct * 100) + '%';
    }

    scrubBar.addEventListener('click', scrub);
    if (canvas && canvas.parentElement) canvas.parentElement.addEventListener('click', scrub);

    // ==========================================
    // ЖИВОЙ НЕОНОВЫЙ ВИЗУАЛИЗАТОР СПЕКТРА
    // ==========================================
    if (canvas) {
        const ctx = canvas.getContext('2d');

        function resizeCanvas() {
            canvas.width = canvas.parentElement.clientWidth * (window.devicePixelRatio || 1);
            canvas.height = canvas.parentElement.clientHeight * (window.devicePixelRatio || 1);
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Статический профиль формы волны трека
        const numBars = 64;
        const barHeights = [];
        for (let i = 0; i < numBars; i++) {
            const centerDist = Math.abs(i - numBars / 2) / (numBars / 2);
            const base = (1 - Math.pow(centerDist, 1.35)) * 0.72 + 0.18;
            const variation = (Math.sin(i * 0.45) * 0.18 + Math.cos(i * 0.85) * 0.12);
            barHeights.push(Math.max(0.14, Math.min(0.95, base + variation)));
        }

        function drawWaveform() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const w = canvas.width;
            const h = canvas.height;
            const barWidth = (w / numBars) * 0.65;
            const gap = (w / numBars) * 0.35;
            const activeAudio = currentMode === 'mastered' ? audioMaster : audioRaw;
            const progress = Math.min(1, activeAudio.currentTime / TRACK_DURATION);

            // Получаем спектр частот из Web Audio API
            let hasRealData = false;
            if (analyser && isPlaying && dataArray) {
                analyser.getByteFrequencyData(dataArray);
                hasRealData = true;
            }

            for (let i = 0; i < numBars; i++) {
                const x = i * (barWidth + gap) + gap / 2;
                let barH = barHeights[i] * (h * 0.72);

                if (isPlaying) {
                    if (hasRealData) {
                        // Живая реакция на звук: бас (слева), вокал/мид (центр), хэты (справа)
                        const freqVal = dataArray[i] / 255.0;
                        const boost = currentMode === 'mastered' ? 1.35 : 0.95;
                        const reactiveH = (barHeights[i] * 0.35 + freqVal * 0.85) * (h * 0.82) * boost;
                        barH = Math.max(5, Math.min(h * 0.95, reactiveH));
                    } else {
                        // Плавная волна, если контекст еще не инициализирован
                        const waveBoost = currentMode === 'mastered' ? 1.3 : 0.7;
                        const pulse = Math.sin((Date.now() / 110) + i * 0.32) * (5 * waveBoost);
                        barH = Math.max(5, barHeights[i] * (h * 0.72) + pulse);
                    }
                }

                const y = (h - barH) / 2;
                const isPassed = (i / numBars) <= progress;

                if (isPassed) {
                    if (currentMode === 'mastered') {
                        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
                        grad.addColorStop(0, '#e0aaff');
                        grad.addColorStop(0.5, '#c77dff');
                        grad.addColorStop(1, '#7b2cbf');
                        ctx.fillStyle = grad;
                        ctx.shadowColor = '#c77dff';
                        ctx.shadowBlur = isPlaying ? 14 : 6;
                    } else {
                        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
                        grad.addColorStop(0, '#ff8787');
                        grad.addColorStop(1, '#e03131');
                        ctx.fillStyle = grad;
                        ctx.shadowColor = '#ff6b6b';
                        ctx.shadowBlur = isPlaying ? 10 : 4;
                    }
                } else {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
                    ctx.shadowBlur = 0;
                }

                ctx.beginPath();
                const radius = Math.min(barWidth / 2, 3);
                if (ctx.roundRect) {
                    ctx.roundRect(x, y, barWidth, barH, radius);
                } else {
                    ctx.rect(x, y, barWidth, barH);
                }
                ctx.fill();
            }

            requestAnimationFrame(drawWaveform);
        }

        drawWaveform();
    }
});


/* ===================================================
   SWIPER 3D COVERFLOW: STUDIO GEAR SLIDER
   =================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // РџСЂРѕРІРµСЂСЏРµРј РЅР°Р»РёС‡РёРµ Р±РёР±Р»РёРѕС‚РµРєРё Swiper Рё РєРѕРЅС‚РµР№РЅРµСЂР°
    if (typeof Swiper === 'undefined') {
        console.warn('Swiper library is not loaded.');
        return;
    }

    const gearSwiperEl = document.querySelector('.gear-swiper');
    if (!gearSwiperEl) return;

    const gearSwiper = new Swiper('.gear-swiper', {
        // 3D Coverflow СЌС„С„РµРєС‚
        effect: 'coverflow',
        grabCursor: true,
        centeredSlides: true,
        slidesPerView: 'auto',
        initialSlide: 0,
        loop: true,
        loopAdditionalSlides: 2,
        loopPreventsSliding: true,
        watchSlidesProgress: true,
        slideToClickedSlide: true,
        speed: 650,
        
        // 3D РЅР°СЃС‚СЂРѕР№РєРё Coverflow: РіР»СѓР±РѕРєР°СЏ РїРµСЂСЃРїРµРєС‚РёРІР° Рё СЃРёРјРјРµС‚СЂРёС‡РЅС‹Р№ РІС‹С…РѕРґ Р·Р° РѕР±Р° РєСЂР°СЏ СЌРєСЂР°РЅР°
        coverflowEffect: {
            rotate: 22,          // РєРѕРјС„РѕСЂС‚РЅС‹Р№ СѓРіРѕР» РїРѕРІРѕСЂРѕС‚Р° Р±РѕРєРѕРІС‹С… РєР°СЂС‚РѕС‡РµРє
            stretch: 15,         // РїР»РѕС‚РЅРѕРµ РїРµСЂРµРєСЂС‹С‚РёРµ
            depth: 180,          // РіР»СѓР±РёРЅР° 3D
            modifier: 1,         // РјРЅРѕР¶РёС‚РµР»СЊ
            slideShadows: false, // РєР°СЃС‚РѕРјРЅС‹Рµ РЅРµРѕРЅРѕРІС‹Рµ С‚РµРЅРё
        },

        // РђРІС‚РѕРїСЂРѕРєСЂСѓС‚РєР°
        autoplay: {
            delay: 3200,
            disableOnInteraction: false,
            pauseOnMouseEnter: true, // РїР°СѓР·Р° РїСЂРё РЅР°РІРµРґРµРЅРёРё РјС‹С€Рё
        },

        // РќР°РІРёРіР°С†РёСЏ СЃС‚СЂРµР»РєР°РјРё
        navigation: {
            nextEl: '#gear-next-btn',
            prevEl: '#gear-prev-btn',
        },

        // РџР°РіРёРЅР°С†РёСЏ С‚РѕС‡РєР°РјРё
        pagination: {
            el: '.gear-pagination',
            clickable: true,
        },

        // РЈРїСЂР°РІР»РµРЅРёРµ РєР»Р°РІРёР°С‚СѓСЂРѕР№ (СЃС‚СЂРµР»РєРё РІР»РµРІРѕ/РІРїСЂР°РІРѕ)
        keyboard: {
            enabled: true,
            onlyInViewport: true,
        },

        // РЈРїСЂР°РІР»РµРЅРёРµ С‚Р°С‡РµРј Рё РјС‹С€СЊСЋ (РїР»Р°РІРЅРѕРµ РѕРіСЂР°РЅРёС‡РµРЅРёРµ РїРѕ РІСЂРµРјРµРЅРё)
        mousewheel: {
            forceToAxis: true,
            thresholdDelta: 40,
            thresholdTime: 400,
            sensitivity: 1,
        }
    });

    // Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅР°СЏ РїР»Р°РІРЅР°СЏ РѕСЃС‚Р°РЅРѕРІРєР° Р°РІС‚РѕРїСЂРѕРєСЂСѓС‚РєРё РїСЂРё РЅР°РІРµРґРµРЅРёРё РЅР° РєР°СЂС‚РѕС‡РєРё
    const sliderWrap = document.querySelector('.gear-slider-container');
    if (sliderWrap) {
        sliderWrap.addEventListener('mouseenter', () => {
            gearSwiper.autoplay.stop();
        });
        sliderWrap.addEventListener('mouseleave', () => {
            gearSwiper.autoplay.start();
        });
    }
});


/* ===================================================
   SWIPER 3D COVERFLOW: ARTISTS & REVIEWS SLIDER
   =================================================== */
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Swiper === 'undefined') return;

    const reviewsSwiperEl = document.querySelector('.reviews-swiper');
    if (!reviewsSwiperEl) return;

    const reviewsSwiper = new Swiper('.reviews-swiper', {
        effect: 'coverflow',
        grabCursor: true,
        centeredSlides: true,
        slidesPerView: 'auto',
        initialSlide: 0,
        loop: true,
        loopAdditionalSlides: 2,
        loopPreventsSliding: true,
        watchSlidesProgress: true,
        slideToClickedSlide: true,
        speed: 650,

        // 3D РЅР°СЃС‚СЂРѕР№РєРё СЃ РєСЂР°СЃРёРІС‹Рј Р±РёСЂСЋР·РѕРІРѕ-РЅРµРѕРЅРѕРІС‹Рј РІР°Р№Р±РѕРј
        coverflowEffect: {
            rotate: 20,
            stretch: 10,
            depth: 170,
            modifier: 1,
            slideShadows: false,
        },

        // РђРІС‚РѕРїСЂРѕРєСЂСѓС‚РєР°
        autoplay: {
            delay: 3600,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
        },

        // РќР°РІРёРіР°С†РёСЏ
        navigation: {
            nextEl: '#reviews-next-btn',
            prevEl: '#reviews-prev-btn',
        },

        // РџР°РіРёРЅР°С†РёСЏ
        pagination: {
            el: '.reviews-pagination',
            clickable: true,
        },

        keyboard: {
            enabled: true,
            onlyInViewport: true,
        },

        mousewheel: {
            forceToAxis: true,
            thresholdDelta: 40,
            thresholdTime: 400,
            sensitivity: 1,
        }
    });

    // РћСЃС‚Р°РЅРѕРІРєР° Р°РІС‚РѕРїСЂРѕРєСЂСѓС‚РєРё РїСЂРё РЅР°РІРµРґРµРЅРёРё
    const reviewsContainer = document.querySelector('.reviews-slider-container');
    if (reviewsContainer) {
        reviewsContainer.addEventListener('mouseenter', () => reviewsSwiper.autoplay.stop());
        reviewsContainer.addEventListener('mouseleave', () => reviewsSwiper.autoplay.start());
    }

    // ==========================================
    // РџР»РµРµСЂ РґР»СЏ РєР°СЂС‚РѕС‡РєРё M1klussshevskiy - РўРўР“
    // ==========================================
    const m1kAudio = document.getElementById('m1k-global-audio');
    const toastEl = document.getElementById('m1k-toast');
    let toastTimeout = null;

    function showM1kToast(msg) {
        if (!toastEl) return;
        if (msg) {
            const msgSpan = toastEl.querySelector('.m1k-toast-msg');
            if (msgSpan) msgSpan.textContent = msg;
        }
        toastEl.classList.add('show');
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastEl.classList.remove('show');
        }, 3800);
    }

    function updateM1kPlayState(isPlaying) {
        const btns = document.querySelectorAll('.m1k-play-btn');
        btns.forEach(btn => {
            const playIcon = btn.querySelector('.m1k-play-icon');
            const pauseIcon = btn.querySelector('.m1k-pause-icon');
            if (isPlaying) {
                btn.classList.add('is-playing');
                btn.setAttribute('title', 'Пауза: M1klussshevskiy - ТТГ');
                if (playIcon) playIcon.style.display = 'none';
                if (pauseIcon) pauseIcon.style.display = 'block';
            } else {
                btn.classList.remove('is-playing');
                btn.setAttribute('title', 'Слушать: M1klussshevskiy - ТТГ');
                if (playIcon) playIcon.style.display = 'block';
                if (pauseIcon) pauseIcon.style.display = 'none';
            }
        });
    }

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.m1k-play-btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        if (!m1kAudio) {
            showM1kToast('Аудиоплеер не инициализирован');
            return;
        }

        if (m1kAudio.paused) {
            const playPromise = m1kAudio.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        updateM1kPlayState(true);
                    })
                    .catch(err => {
                        console.warn('Playback error or file missing:', err);
                        updateM1kPlayState(false);
                        showM1kToast('Добавьте аудиофайл в audio/m1klussshevskiy_ttg.mp3');
                    });
            }
        } else {
            m1kAudio.pause();
            updateM1kPlayState(false);
        }
    });

    if (m1kAudio) {
        m1kAudio.addEventListener('play', () => updateM1kPlayState(true));
        m1kAudio.addEventListener('pause', () => updateM1kPlayState(false));
        m1kAudio.addEventListener('ended', () => updateM1kPlayState(false));
        m1kAudio.addEventListener('error', () => {
            updateM1kPlayState(false);
        });
    }
});


/* ===================================================
   INFINITE 3D GRID MENU (WEBGL2) GALLERY
   =================================================== */
const GALLERY_ITEMS = [
    { image: "images/gallery/studio_entrance.jpg", badge: "STUDIO ENTRANCE • 24/7", title: "Вход в студию", description: "Стильная входная группа с неоновой вывеской и уютной зоной ожидания в историческом центре." },
    { image: "images/gallery/studio_awards.jpg", badge: "AWARDS & CERTIFICATES", title: "Стена наград", description: "Наши золотые и платиновые сертификаты за релизы, собравшие миллионы прослушиваний." },
    { image: "images/gallery/studio_mixing_session.jpg", badge: "ANALOG MIXING • DSP", title: "Процесс сведения", description: "Работа с миксом на аналоговой консоли с применением топового железа от SSL и Neve." },
    { image: "images/gallery/studio_artist_m1klussshevskiy.jpg", badge: "VOCAL RECORDING • ARTIST", title: "M1klussshevskiy", description: "Популярный исполнитель M1klussshevskiy на записи нового сингла в профессиональной изолированной вокальной кабине." },
    { image: "images/gallery/studio_vip_suite.jpg", badge: "VIP LOUNGE & SUITE", title: "VIP Студийный Сьют", description: "Атмосферный зал с фирменным неоновым логотипом Wave, кожаными диванами и премиальным сетапом." },
    { image: "images/gallery/studio_main.jpg", badge: "CONTROL ROOM • 5.1 AUDIO", title: "Главная аппаратная", description: "Флагманская аппаратная с мониторами Genelec, аналоговым сумматором и идеальной акустикой." }
];

// 12-vertex icosahedron antipodal pairs:
// Pairs: (6, 5) -> 0, (7, 4) -> 1, (8, 11) -> 2, (9, 10) -> 3, (0, 3) -> 4, (1, 2) -> 5
const VERTEX_TO_ITEM = [
    4, // Vertex 0 -> Item 4 (VIP Студийный Сьют)
    5, // Vertex 1 -> Item 5 (Главная аппаратная)
    5, // Vertex 2 -> Item 5 (Зеркально противоположная Vertex 1)
    4, // Vertex 3 -> Item 4 (Зеркально противоположная Vertex 0)
    1, // Vertex 4 -> Item 1 (Зеркально противоположная Vertex 7)
    0, // Vertex 5 -> Item 0 (Зеркально противоположная Vertex 6)
    0, // Vertex 6 -> Item 0 (Вход в студию - стартовая точка)
    1, // Vertex 7 -> Item 1 (Стена наград)
    2, // Vertex 8 -> Item 2 (Процесс сведения)
    3, // Vertex 9 -> Item 3 (M1klussshevskiy)
    3, // Vertex 10 -> Item 3 (Зеркально противоположная Vertex 9)
    2  // Vertex 11 -> Item 2 (Зеркально противоположная Vertex 8)
];

const discVertShaderSource = `#version 300 es

uniform mat4 uWorldMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPosition;
uniform vec4 uRotationAxisVelocity;

in vec3 aModelPosition;
in vec3 aModelNormal;
in vec2 aModelUvs;
in mat4 aInstanceMatrix;

out vec2 vUvs;
out float vAlpha;
flat out int vInstanceId;

#define PI 3.141593

void main() {
    vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.);

    vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0., 0., 0., 1.)).xyz;
    float radius = length(centerPos.xyz);

    if (gl_VertexID > 0) {
        vec3 rotationAxis = uRotationAxisVelocity.xyz;
        float rotationVelocity = min(.15, uRotationAxisVelocity.w * 15.);
        if (rotationVelocity > 0.0001) {
            vec3 crossVec = cross(centerPos, rotationAxis);
            float crossLen = length(crossVec);
            if (crossLen > 0.0001) {
                vec3 stretchDir = crossVec / crossLen;
                vec3 relPos = worldPosition.xyz - centerPos;
                float relLen = length(relPos);
                if (relLen > 0.0001) {
                    vec3 relativeVertexPos = relPos / relLen;
                    float strength = dot(stretchDir, relativeVertexPos);
                    float invAbsStrength = min(0., abs(strength) - 1.);
                    strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.);
                    worldPosition.xyz += stretchDir * strength;
                }
            }
        }
    }

    worldPosition.xyz = radius * normalize(worldPosition.xyz);

    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;

    vAlpha = smoothstep(0.2, 1., normalize(worldPosition.xyz).z) * .88 + .12;
    vUvs = aModelUvs;
    vInstanceId = gl_InstanceID;
}
`;

const discFragShaderSource = `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform int uItemCount;
uniform int uAtlasSize;

out vec4 outColor;

in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;

// 12-vertex icosahedron antipodal pairs:
// Pairs: (6, 5) -> 0, (7, 4) -> 1, (8, 11) -> 2, (9, 10) -> 3, (0, 3) -> 4, (1, 2) -> 5
int getMappedItemIndex(int id, int itemCount) {
    if (id == 5 || id == 6) return 0 % itemCount;
    if (id == 4 || id == 7) return 1 % itemCount;
    if (id == 8 || id == 11) return 2 % itemCount;
    if (id == 9 || id == 10) return 3 % itemCount;
    if (id == 0 || id == 3) return 4 % itemCount;
    if (id == 1 || id == 2) return 5 % itemCount;
    return id % itemCount;
}

void main() {
    int itemIndex = getMappedItemIndex(vInstanceId, uItemCount);
    int cellsPerRow = uAtlasSize;
    int cellX = itemIndex % cellsPerRow;
    int cellY = itemIndex / cellsPerRow;
    vec2 cellSize = vec2(1.0) / vec2(float(cellsPerRow));
    vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;

    ivec2 texSize = textureSize(uTex, 0);
    float imageAspect = float(texSize.x) / float(texSize.y);
    float containerAspect = 1.0;
    
    float scale = max(imageAspect / containerAspect, 
                     containerAspect / imageAspect);
    
    vec2 st = vec2(vUvs.x, 1.0 - vUvs.y);
    st = (st - 0.5) * scale + 0.5;
    
    st = clamp(st, 0.0, 1.0);
    
    st = st * cellSize + cellOffset;
    
    outColor = texture(uTex, st);
    outColor.a *= vAlpha;
}
`;

class GalleryFace {
  constructor(a, b, c) {
    this.a = a;
    this.b = b;
    this.c = c;
  }
}

class GalleryVertex {
  constructor(x, y, z) {
    const { vec2, vec3 } = window.glMatrix || {};
    this.position = vec3.fromValues(x, y, z);
    this.normal = vec3.create();
    this.uv = vec2.create();
  }
}

class GalleryGeometry {
  constructor() {
    this.vertices = [];
    this.faces = [];
  }

  addVertex(...args) {
    for (let i = 0; i < args.length; i += 3) {
      this.vertices.push(new GalleryVertex(args[i], args[i + 1], args[i + 2]));
    }
    return this;
  }

  addFace(...args) {
    for (let i = 0; i < args.length; i += 3) {
      this.faces.push(new GalleryFace(args[i], args[i + 1], args[i + 2]));
    }
    return this;
  }

  get lastVertex() {
    return this.vertices[this.vertices.length - 1];
  }

  subdivide(divisions = 1) {
    const midPointCache = {};
    let f = this.faces;

    for (let div = 0; div < divisions; ++div) {
      const newFaces = new Array(f.length * 4);

      f.forEach((face, ndx) => {
        const mAB = this.getMidPoint(face.a, face.b, midPointCache);
        const mBC = this.getMidPoint(face.b, face.c, midPointCache);
        const mCA = this.getMidPoint(face.c, face.a, midPointCache);

        const i = ndx * 4;
        newFaces[i + 0] = new GalleryFace(face.a, mAB, mCA);
        newFaces[i + 1] = new GalleryFace(face.b, mBC, mAB);
        newFaces[i + 2] = new GalleryFace(face.c, mCA, mBC);
        newFaces[i + 3] = new GalleryFace(mAB, mBC, mCA);
      });

      f = newFaces;
    }

    this.faces = f;
    return this;
  }

  spherize(radius = 1) {
    const { vec3 } = window.glMatrix || {};
    this.vertices.forEach(vertex => {
      vec3.normalize(vertex.normal, vertex.position);
      vec3.scale(vertex.position, vertex.normal, radius);
    });
    return this;
  }

  get data() {
    return {
      vertices: this.vertexData,
      indices: this.indexData,
      normals: this.normalData,
      uvs: this.uvData
    };
  }

  get vertexData() {
    return new Float32Array(this.vertices.flatMap(v => Array.from(v.position)));
  }

  get normalData() {
    return new Float32Array(this.vertices.flatMap(v => Array.from(v.normal)));
  }

  get uvData() {
    return new Float32Array(this.vertices.flatMap(v => Array.from(v.uv)));
  }

  get indexData() {
    return new Uint16Array(this.faces.flatMap(f => [f.a, f.b, f.c]));
  }

  getMidPoint(ndxA, ndxB, cache) {
    const cacheKey = ndxA < ndxB ? `k_${ndxB}_${ndxA}` : `k_${ndxA}_${ndxB}`;
    if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) {
      return cache[cacheKey];
    }
    const a = this.vertices[ndxA].position;
    const b = this.vertices[ndxB].position;
    const ndx = this.vertices.length;
    cache[cacheKey] = ndx;
    this.addVertex((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
    return ndx;
  }
}

class GalleryIcosahedronGeometry extends GalleryGeometry {
  constructor() {
    super();
    const t = Math.sqrt(5) * 0.5 + 0.5;
    this.addVertex(
      -1,  t,  0,   1,  t,  0,  -1, -t,  0,   1, -t,  0,
       0, -1,  t,   0,  1,  t,   0, -1, -t,   0,  1, -t,
       t,  0, -1,   t,  0,  1,  -t,  0, -1,  -t,  0,  1
    ).addFace(
      0, 11,  5,   0,  5,  1,   0,  1,  7,   0,  7, 10,   0, 10, 11,
      1,  5,  9,   5, 11,  4,  11, 10,  2,  10,  7,  6,   7,  1,  8,
      3,  9,  4,   3,  4,  2,   3,  2,  6,   3,  6,  8,   3,  8,  9,
      4,  9,  5,   2,  4, 11,   6,  2, 10,   8,  6,  7,   9,  8,  1
    );
  }
}

class GalleryDiscGeometry extends GalleryGeometry {
  constructor(steps = 4, radius = 1) {
    super();
    steps = Math.max(4, steps);

    const alpha = (2 * Math.PI) / steps;

    this.addVertex(0, 0, 0);
    this.lastVertex.uv[0] = 0.5;
    this.lastVertex.uv[1] = 0.5;

    for (let i = 0; i < steps; ++i) {
      const x = Math.cos(alpha * i);
      const y = Math.sin(alpha * i);
      this.addVertex(radius * x, radius * y, 0);
      this.lastVertex.uv[0] = x * 0.5 + 0.5;
      this.lastVertex.uv[1] = y * 0.5 + 0.5;

      if (i > 0) {
        this.addFace(0, i, i + 1);
      }
    }
    this.addFace(0, steps, 1);
  }
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) return shader;
  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

function createProgram(gl, shaderSources, transformFeedbackVaryings, attribLocations) {
  const program = gl.createProgram();
  [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].forEach((type, ndx) => {
    const shader = createShader(gl, type, shaderSources[ndx]);
    if (shader) gl.attachShader(program, shader);
  });
  if (transformFeedbackVaryings) {
    gl.transformFeedbackVaryings(program, transformFeedbackVaryings, gl.SEPARATE_ATTRIBS);
  }
  if (attribLocations) {
    for (const attrib in attribLocations) {
      gl.bindAttribLocation(program, attribLocations[attrib], attrib);
    }
  }
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) return program;
  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
}

function makeVertexArray(gl, bufLocNumElmPairs, indices) {
  const va = gl.createVertexArray();
  gl.bindVertexArray(va);
  for (const [buffer, loc, numElem] of bufLocNumElmPairs) {
    if (loc === -1) continue;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, numElem, gl.FLOAT, false, 0, 0);
  }
  if (indices) {
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  }
  gl.bindVertexArray(null);
  return va;
}

function resizeCanvasToDisplaySize(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const displayWidth = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const displayHeight = Math.max(1, Math.round(canvas.clientHeight * dpr));
  const needResize = canvas.width !== displayWidth || canvas.height !== displayHeight;
  if (needResize) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
  return needResize;
}

function makeBuffer(gl, sizeOrData, usage) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, sizeOrData, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buf;
}

function createAndSetupTexture(gl, minFilter, magFilter, wrapS, wrapT) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
  return texture;
}

class ArcballControl {
  isPointerDown = false;
  rotationVelocity = 0;
  EPSILON = 0.1;

  constructor(canvas, updateCallback) {
    const { quat, vec2, vec3 } = window.glMatrix || {};
    this.canvas = canvas;
    this.updateCallback = updateCallback || (() => null);

    this.orientation = quat.create();
    this.pointerRotation = quat.create();
    this.rotationAxis = vec3.fromValues(1, 0, 0);
    this.snapDirection = vec3.fromValues(0, 0, -1);
    this.snapTargetDirection = null;
    this.IDENTITY_QUAT = quat.create();

    this.pointerPos = vec2.create();
    this.previousPointerPos = vec2.create();
    this._rotationVelocity = 0;
    this._combinedQuat = quat.create();

    canvas.addEventListener('pointerdown', e => {
      const rect = canvas.getBoundingClientRect();
      vec2.set(this.pointerPos, e.clientX - rect.left, e.clientY - rect.top);
      vec2.copy(this.previousPointerPos, this.pointerPos);
      this.isPointerDown = true;
      try { canvas.setPointerCapture(e.pointerId); } catch(err){}
    });

    const onPointerUp = (e) => {
      this.isPointerDown = false;
      try { if (e && e.pointerId) canvas.releasePointerCapture(e.pointerId); } catch(err){}
    };
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('pointerup', onPointerUp);

    canvas.addEventListener('pointermove', e => {
      if (this.isPointerDown) {
        const rect = canvas.getBoundingClientRect();
        vec2.set(this.pointerPos, e.clientX - rect.left, e.clientY - rect.top);
      }
    });

    canvas.style.touchAction = 'none';
  }

  update(deltaTime, targetFrameDuration = 16) {
    const { quat, vec2, vec3 } = window.glMatrix || {};
    const timeScale = deltaTime / targetFrameDuration + 0.00001;
    let angleFactor = timeScale;
    let snapRotation = quat.create();

    if (this.isPointerDown) {
      this.snapTargetDirection = null;
      const INTENSITY = 0.3 * timeScale;
      const ANGLE_AMPLIFICATION = 5 / timeScale;

      const midPointerPos = vec2.sub(vec2.create(), this.pointerPos, this.previousPointerPos);
      vec2.scale(midPointerPos, midPointerPos, INTENSITY);

      if (vec2.sqrLen(midPointerPos) > this.EPSILON) {
        vec2.add(midPointerPos, this.previousPointerPos, midPointerPos);

        const p = this.project(midPointerPos);
        const q = this.project(this.previousPointerPos);
        const a = vec3.normalize(vec3.create(), p);
        const b = vec3.normalize(vec3.create(), q);

        vec2.copy(this.previousPointerPos, midPointerPos);

        angleFactor *= ANGLE_AMPLIFICATION;

        this.quatFromVectors(a, b, this.pointerRotation, angleFactor);
      } else {
        quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY);
      }
    } else {
      const INTENSITY = 0.1 * timeScale;
      quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY);

      if (this.snapTargetDirection) {
        const SNAPPING_INTENSITY = 0.2;
        const a = this.snapTargetDirection;
        const b = this.snapDirection;
        const sqrDist = vec3.squaredDistance(a, b);
        const distanceFactor = Math.max(0.1, 1 - sqrDist * 10);
        angleFactor *= SNAPPING_INTENSITY * distanceFactor;
        this.quatFromVectors(a, b, snapRotation, angleFactor);
      }
    }

    const combinedQuat = quat.multiply(quat.create(), snapRotation, this.pointerRotation);
    this.orientation = quat.multiply(quat.create(), combinedQuat, this.orientation);
    quat.normalize(this.orientation, this.orientation);

    const RA_INTENSITY = 0.8 * timeScale;
    quat.slerp(this._combinedQuat, this._combinedQuat, combinedQuat, RA_INTENSITY);
    quat.normalize(this._combinedQuat, this._combinedQuat);

    const rad = Math.acos(Math.max(-1, Math.min(1, this._combinedQuat[3]))) * 2.0;
    const s = Math.sin(rad / 2.0);
    let rv = 0;
    if (s > 0.000001) {
      rv = rad / (2 * Math.PI);
      this.rotationAxis[0] = this._combinedQuat[0] / s;
      this.rotationAxis[1] = this._combinedQuat[1] / s;
      this.rotationAxis[2] = this._combinedQuat[2] / s;
    }

    const RV_INTENSITY = 0.5 * timeScale;
    this._rotationVelocity += (rv - this._rotationVelocity) * RV_INTENSITY;
    this.rotationVelocity = this._rotationVelocity / timeScale;

    this.updateCallback(deltaTime);
  }

  quatFromVectors(a, b, out, angleFactor = 1) {
    const { quat, vec3 } = window.glMatrix || {};
    const axis = vec3.cross(vec3.create(), a, b);
    vec3.normalize(axis, axis);
    const d = Math.max(-1, Math.min(1, vec3.dot(a, b)));
    const angle = Math.acos(d) * angleFactor;
    quat.setAxisAngle(out, axis, angle);
    return { q: out, axis, angle };
  }

  project(pos) {
    const { vec3 } = window.glMatrix || {};
    const r = 2;
    const w = this.canvas.clientWidth || 300;
    const h = this.canvas.clientHeight || 300;
    const s = Math.max(w, h) - 1;

    const x = (2 * pos[0] - w - 1) / s;
    const y = (2 * pos[1] - h - 1) / s;
    let z = 0;
    const xySq = x * x + y * y;
    const rSq = r * r;

    if (xySq <= rSq / 2.0) {
      z = Math.sqrt(rSq - xySq);
    } else {
      z = rSq / Math.sqrt(xySq);
    }
    return vec3.fromValues(-x, y, z);
  }
}

/* ===================================================
   GHOST FIBERS BACKGROUND (WEBGL2)
   =================================================== */
const ghostVertShaderSource = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const ghostFragShaderSource = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uLayers;
uniform float uWaveAmplitude;
uniform float uWaveFrequency;
uniform float uWaveSpeed;
uniform float uLayerSpeed;
uniform float uTwist;
uniform float uTwistFrequency;
uniform float uTwistSpeed;
uniform float uLineFrequency;
uniform float uLineSpacing;
uniform float uLineSharpness;
uniform float uGlowFalloff;
uniform float uGlowIntensity;
uniform float uBrightness;
uniform float uBlueBoost;
uniform float uVignette;
uniform float uGrain;
uniform float uRotationSpeed;
uniform float uLightMode;
uniform vec3 uLineColor;
uniform vec3 uGlowColor;

out vec4 fragColor;

#define MAX_LAYERS 10

mat2 rotate2d(float angle) {
  float sine = sin(angle);
  float cosine = cos(angle);
  return mat2(cosine, -sine, sine, cosine);
}

float grainHash(vec2 point) {
  point = floor(point);
  float hash = 52.9829189 * fract(dot(point, vec2(0.065, 0.005)));
  return fract(hash);
}

float layeredGrain(vec2 fragmentPixel) {
  vec2 point = mod(fragmentPixel + vec2(uTime * 30.0, -uTime * 21.0), 1024.0);
  vec2 rotated = mat2(0.8, -0.5, 0.5, 0.8) * point;
  float grain = 0.0;
  grain += 0.40 * grainHash(rotated);
  grain += 0.25 * grainHash(rotated * 2.0 + 17.0);
  grain += 0.20 * grainHash(rotated * 4.0 + 47.0);
  grain += 0.10 * grainHash(rotated * 8.0 + 113.0);
  grain += 0.05 * grainHash(rotated * 16.0 + 191.0);
  return grain;
}

void main() {
  vec2 resolution = max(uResolution, vec2(1.0));
  vec2 uv = (2.0 * gl_FragCoord.xy - resolution) / resolution.y;
  float time = uTime * uSpeed;
  vec3 backdrop = mix(vec3(0.035294, 0.011765, 0.078431), vec3(1.0), step(0.5, uLightMode));
  vec3 centerTone = max(uLineColor * 0.85567 - uGlowColor * 0.06186, vec3(0.0));
  vec3 cloudTone = uLineColor * 0.19588 + uGlowColor * 0.2268;
  vec2 p = uv;
  p /= max(uScale, 0.05);
  p = rotate2d(radians(uRotation) + time * uRotationSpeed) * p;
  vec3 color = vec3(0.0);
  float fiberField = 0.0;

  for (int index = 0; index < MAX_LAYERS; index++) {
    float fi = float(index) + 1.0;
    if (fi > uLayers) break;

    p += uWaveAmplitude * sin(p.yx * fi * uWaveFrequency + time * (uWaveSpeed + fi * uLayerSpeed));

    float radius = length(p);
    float polarAngle = atan(p.y, p.x);
    polarAngle += sin(radius * uTwistFrequency - time * uTwistSpeed + fi) * uTwist;
    p = vec2(cos(polarAngle), sin(polarAngle)) * radius;

    float lines = abs(sin(p.x * (uLineFrequency + fi * uLineSpacing) + sin(p.y * 3.0 + time)));
    lines = pow(max(0.0, 1.0 - lines), uLineSharpness);
    fiberField += lines / fi;
    color += uLineColor * lines / fi;

    float glow = exp(-uGlowFalloff * abs(sin(p.x * 3.0 + time + fi)));
    color += uGlowColor * glow * uGlowIntensity / (fi * 2.0);
  }

  float center = exp(-2.2 * dot(uv, uv));
  color += centerTone * center;

  float cloud = exp(-1.5 * length(uv + vec2(sin(time * 0.3) * 0.25, cos(time * 0.25) * 0.18)));
  color += cloudTone * cloud;

  // Aspect-corrected rich vignette
  float aspect = max(1.0, resolution.x / resolution.y);
  vec2 uvAspect = vec2(uv.x / pow(aspect, 0.65), uv.y);
  float vignette = 0.5 - smoothstep(0.35, 1.45, length(uvAspect));
  color *= mix(1.0 - uVignette, 1.0, vignette);
  color = 1.0 - exp(-color * uBrightness);
  color.b *= uBlueBoost;

  vec3 outputColor;
  if (uLightMode > 0.5) {
    float edgeFade = mix(1.0 - uVignette, 1.0, vignette);
    float fibers = pow(smoothstep(0.12, 1.05, fiberField) * edgeFade, 1.5);
    float atmosphere = (center * 0.025 + cloud * 0.015) * edgeFade;
    vec3 fiberInk = mix(backdrop, uLineColor, 0.52);
    vec3 airColor = mix(backdrop, uGlowColor, 0.16);

    outputColor = mix(backdrop, airColor, atmosphere);
    outputColor = mix(outputColor, fiberInk, fibers * 0.3);
  } else {
    outputColor = backdrop + color;
  }

  float noise = (layeredGrain(gl_FragCoord.xy) - 0.5) * uGrain;
  outputColor = clamp(outputColor + noise, 0.0, 1.0);
  fragColor = vec4(outputColor, 1.0);
}
`;

class GhostFibersBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!this.gl) return;

    this.speed = 0.24;
    this.baseScale = 0.87;
    this.rotation = 8.0;
    this.rotationSpeed = 0.25;
    this.layers = 7.0;
    this.waveAmplitude = 0.01;
    this.waveFrequency = 2.95;
    this.waveSpeed = 0.9;
    this.layerSpeed = 0.08;
    this.twist = 0.5;
    this.twistFrequency = 12.0;
    this.twistSpeed = 0.45;
    this.lineFrequency = 10.0;
    this.lineSpacing = 4.0;
    this.lineSharpness = 16.0;
    this.glowFalloff = 9.0;
    this.glowIntensity = 2.4;
    this.brightness = 1.5;
    this.blueBoost = 0.86;
    this.vignette = 1.0;
    this.grain = 0.0;
    this.lightMode = 0.0;
    this.lineColor = new Float32Array([0.164706, 0.090196, 0.470588]); // #2a1778
    this.glowColor = new Float32Array([0.176471, 0.070588, 0.356863]); // #2d125b

    this.init();
  }

  init() {
    const gl = this.gl;
    if (!gl) return;

    this.program = createProgram(gl, [ghostVertShaderSource, ghostFragShaderSource]);
    if (!this.program) return;

    this.uniforms = {
      uResolution: gl.getUniformLocation(this.program, 'uResolution'),
      uTime: gl.getUniformLocation(this.program, 'uTime'),
      uSpeed: gl.getUniformLocation(this.program, 'uSpeed'),
      uScale: gl.getUniformLocation(this.program, 'uScale'),
      uRotation: gl.getUniformLocation(this.program, 'uRotation'),
      uRotationSpeed: gl.getUniformLocation(this.program, 'uRotationSpeed'),
      uLayers: gl.getUniformLocation(this.program, 'uLayers'),
      uWaveAmplitude: gl.getUniformLocation(this.program, 'uWaveAmplitude'),
      uWaveFrequency: gl.getUniformLocation(this.program, 'uWaveFrequency'),
      uWaveSpeed: gl.getUniformLocation(this.program, 'uWaveSpeed'),
      uLayerSpeed: gl.getUniformLocation(this.program, 'uLayerSpeed'),
      uTwist: gl.getUniformLocation(this.program, 'uTwist'),
      uTwistFrequency: gl.getUniformLocation(this.program, 'uTwistFrequency'),
      uTwistSpeed: gl.getUniformLocation(this.program, 'uTwistSpeed'),
      uLineFrequency: gl.getUniformLocation(this.program, 'uLineFrequency'),
      uLineSpacing: gl.getUniformLocation(this.program, 'uLineSpacing'),
      uLineSharpness: gl.getUniformLocation(this.program, 'uLineSharpness'),
      uGlowFalloff: gl.getUniformLocation(this.program, 'uGlowFalloff'),
      uGlowIntensity: gl.getUniformLocation(this.program, 'uGlowIntensity'),
      uBrightness: gl.getUniformLocation(this.program, 'uBrightness'),
      uBlueBoost: gl.getUniformLocation(this.program, 'uBlueBoost'),
      uVignette: gl.getUniformLocation(this.program, 'uVignette'),
      uGrain: gl.getUniformLocation(this.program, 'uGrain'),
      uLightMode: gl.getUniformLocation(this.program, 'uLightMode'),
      uLineColor: gl.getUniformLocation(this.program, 'uLineColor'),
      uGlowColor: gl.getUniformLocation(this.program, 'uGlowColor')
    };

    const triangleData = new Float32Array([-1, -1, 3, -1, -1, 3]);
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, triangleData, gl.STATIC_DRAW);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const posLoc = gl.getAttribLocation(this.program, 'position');
    if (posLoc !== -1) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.resize();
  }

  resize() {
    const gl = this.gl;
    if (!gl) return;
    const dpr = 1.0;
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  render(timeSeconds, visualScale = 1.0) {
    const gl = this.gl;
    if (!gl || !this.program) return;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.uniform2f(this.uniforms.uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(this.uniforms.uTime, timeSeconds);
    gl.uniform1f(this.uniforms.uSpeed, this.speed);

    // Dynamic scale based on sphere activity:
    // At rest -> visualScale is ~1.0 -> dynamicScale is baseScale (0.87, enlarged)
    // When rotating/dragging -> visualScale drops to ~0.55 -> dynamicScale gently contracts to ~0.75 without creating black gaps
    const normalizedZoom = Math.max(0.0, Math.min(1.0, (visualScale - 0.45) / 0.55));
    const dynamicScale = this.baseScale * (0.85 + 0.15 * normalizedZoom);
    gl.uniform1f(this.uniforms.uScale, dynamicScale);

    gl.uniform1f(this.uniforms.uRotation, this.rotation);
    gl.uniform1f(this.uniforms.uRotationSpeed, this.rotationSpeed);
    gl.uniform1f(this.uniforms.uLayers, this.layers);
    gl.uniform1f(this.uniforms.uWaveAmplitude, this.waveAmplitude);
    gl.uniform1f(this.uniforms.uWaveFrequency, this.waveFrequency);
    gl.uniform1f(this.uniforms.uWaveSpeed, this.waveSpeed);
    gl.uniform1f(this.uniforms.uLayerSpeed, this.layerSpeed);
    gl.uniform1f(this.uniforms.uTwist, this.twist);
    gl.uniform1f(this.uniforms.uTwistFrequency, this.twistFrequency);
    gl.uniform1f(this.uniforms.uTwistSpeed, this.twistSpeed);
    gl.uniform1f(this.uniforms.uLineFrequency, this.lineFrequency);
    gl.uniform1f(this.uniforms.uLineSpacing, this.lineSpacing);
    gl.uniform1f(this.uniforms.uLineSharpness, this.lineSharpness);
    gl.uniform1f(this.uniforms.uGlowFalloff, this.glowFalloff);
    gl.uniform1f(this.uniforms.uGlowIntensity, this.glowIntensity);
    gl.uniform1f(this.uniforms.uBrightness, this.brightness);
    gl.uniform1f(this.uniforms.uBlueBoost, this.blueBoost);
    gl.uniform1f(this.uniforms.uVignette, this.vignette);
    gl.uniform1f(this.uniforms.uGrain, this.grain);
    gl.uniform1f(this.uniforms.uLightMode, this.lightMode);
    gl.uniform3fv(this.uniforms.uLineColor, this.lineColor);
    gl.uniform3fv(this.uniforms.uGlowColor, this.glowColor);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);

    // Keep canvas full bleed without shrinking margins
    this.canvas.style.transform = 'none';
  }
}

class InfiniteGridMenu {
  TARGET_FRAME_DURATION = 1000 / 60;
  SPHERE_RADIUS = 2;

  time = 0;
  deltaTime = 0;
  deltaFrames = 0;
  frames = 0;

  nearestVertexIndex = null;
  smoothRotationVelocity = 0;
  scaleFactor = 1.0;
  movementActive = false;

  constructor(canvas, items, onActiveItemChange, onMovementChange, onInit = null, scale = 1.0) {
    const { mat4, vec3 } = window.glMatrix || {};
    this.canvas = canvas;
    this.items = items || [];
    this.onActiveItemChange = onActiveItemChange || (() => {});
    this.onMovementChange = onMovementChange || (() => {});
    this.scaleFactor = scale;

    const ghostCanvas = document.getElementById('ghost-fibers-canvas');
    if (ghostCanvas) {
      this.ghostFibers = new GhostFibersBackground(ghostCanvas);
    }

    this.camera = {
      matrix: mat4.create(),
      near: 0.1,
      far: 40,
      fov: Math.PI / 4,
      aspect: 1,
      position: vec3.fromValues(0, 0, 3 * scale),
      up: vec3.fromValues(0, 1, 0),
      matrices: {
        view: mat4.create(),
        projection: mat4.create(),
        inversProjection: mat4.create()
      }
    };

    this.init(onInit);
  }

  resize() {
    const { vec2 } = window.glMatrix || {};
    this.viewportSize = vec2.set(this.viewportSize || vec2.create(), this.canvas.clientWidth, this.canvas.clientHeight);
    const gl = this.gl;
    if (!gl) return;
    const needsResize = resizeCanvasToDisplaySize(gl.canvas);
    if (needsResize) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
    const isMobile = window.innerWidth <= 768;
    this.scaleFactor = isMobile ? 1.25 : 1.0;
    this.updateProjectionMatrix(gl);

    if (this.ghostFibers) {
      this.ghostFibers.resize();
    }
  }

  run(time = 0) {
    this.deltaTime = Math.min(32, time - this.time);
    this.time = time;
    this.deltaFrames = this.deltaTime / this.TARGET_FRAME_DURATION;
    this.frames += this.deltaFrames;

    this.animate(this.deltaTime);
    this.render();

    requestAnimationFrame(t => this.run(t));
  }

  init(onInit) {
    const { mat4 } = window.glMatrix || {};
    this.gl = this.canvas.getContext('webgl2', { antialias: true, alpha: true });
    const gl = this.gl;
    if (!gl) {
      console.warn('WebGL2 not supported on this device');
      return;
    }

    const { vec2 } = window.glMatrix || {};
    this.viewportSize = vec2.fromValues(this.canvas.clientWidth, this.canvas.clientHeight);
    this.drawBufferSize = vec2.clone(this.viewportSize);

    this.discProgram = createProgram(gl, [discVertShaderSource, discFragShaderSource], null, {
      aModelPosition: 0,
      aModelNormal: 1,
      aModelUvs: 2,
      aInstanceMatrix: 3
    });

    this.discLocations = {
      aModelPosition: gl.getAttribLocation(this.discProgram, 'aModelPosition'),
      aModelUvs: gl.getAttribLocation(this.discProgram, 'aModelUvs'),
      aInstanceMatrix: gl.getAttribLocation(this.discProgram, 'aInstanceMatrix'),
      uWorldMatrix: gl.getUniformLocation(this.discProgram, 'uWorldMatrix'),
      uViewMatrix: gl.getUniformLocation(this.discProgram, 'uViewMatrix'),
      uProjectionMatrix: gl.getUniformLocation(this.discProgram, 'uProjectionMatrix'),
      uCameraPosition: gl.getUniformLocation(this.discProgram, 'uCameraPosition'),
      uScaleFactor: gl.getUniformLocation(this.discProgram, 'uScaleFactor'),
      uRotationAxisVelocity: gl.getUniformLocation(this.discProgram, 'uRotationAxisVelocity'),
      uTex: gl.getUniformLocation(this.discProgram, 'uTex'),
      uFrames: gl.getUniformLocation(this.discProgram, 'uFrames'),
      uItemCount: gl.getUniformLocation(this.discProgram, 'uItemCount'),
      uAtlasSize: gl.getUniformLocation(this.discProgram, 'uAtlasSize')
    };

    this.discGeo = new GalleryDiscGeometry(56, 1);
    this.discBuffers = this.discGeo.data;
    this.discVAO = makeVertexArray(
      gl,
      [
        [makeBuffer(gl, this.discBuffers.vertices, gl.STATIC_DRAW), this.discLocations.aModelPosition, 3],
        [makeBuffer(gl, this.discBuffers.uvs, gl.STATIC_DRAW), this.discLocations.aModelUvs, 2]
      ],
      this.discBuffers.indices
    );

    this.icoGeo = new GalleryIcosahedronGeometry();
    this.icoGeo.spherize(this.SPHERE_RADIUS);
    this.instancePositions = this.icoGeo.vertices.map(v => v.position);
    this.DISC_INSTANCE_COUNT = this.icoGeo.vertices.length;
    this.initDiscInstances(this.DISC_INSTANCE_COUNT);

    this.worldMatrix = mat4.create();
    this.initTexture();

    this.control = new ArcballControl(this.canvas, deltaTime => this.onControlUpdate(deltaTime));

    this.updateCameraMatrix();
    this.updateProjectionMatrix(gl);
    this.resize();

    if (this.items.length > 0) {
      const initialNearest = this.findNearestVertexIndex();
      const initialItem = VERTEX_TO_ITEM[initialNearest % 12] % this.items.length;
      this.onActiveItemChange(initialItem);
    }

    if (onInit) onInit(this);
  }

  initTexture() {
    const gl = this.gl;
    this.tex = createAndSetupTexture(gl, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);

    const itemCount = Math.max(1, this.items.length);
    this.atlasSize = Math.ceil(Math.sqrt(itemCount));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const cellSize = 512;

    canvas.width = this.atlasSize * cellSize;
    canvas.height = this.atlasSize * cellSize;

    // Fill placeholder
    ctx.fillStyle = '#100520';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);

    Promise.all(
      this.items.map(
        item =>
          new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => {
              const errCanvas = document.createElement('canvas');
              errCanvas.width = 512; errCanvas.height = 512;
              const errCtx = errCanvas.getContext('2d');
              errCtx.fillStyle = '#1c0c2e';
              errCtx.fillRect(0, 0, 512, 512);
              resolve(errCanvas);
            };
            img.src = item.image;
          })
      )
    ).then(images => {
      images.forEach((img, i) => {
        const x = (i % this.atlasSize) * cellSize;
        const y = Math.floor(i / this.atlasSize) * cellSize;

        const iw = img.naturalWidth || img.width || 512;
        const ih = img.naturalHeight || img.height || 512;
        const aspect = iw / ih;
        let sx = 0, sy = 0, sw = iw, sh = ih;
        if (aspect > 1) {
          sw = ih;
          sx = (iw - sw) / 2;
        } else {
          sh = iw;
          sy = (ih - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, x, y, cellSize, cellSize);
      });

      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
    });
  }

  initDiscInstances(count) {
    const { mat4 } = window.glMatrix || {};
    const gl = this.gl;
    this.discInstances = {
      matricesArray: new Float32Array(count * 16),
      matrices: [],
      buffer: gl.createBuffer()
    };
    for (let i = 0; i < count; ++i) {
      const instanceMatrixArray = new Float32Array(this.discInstances.matricesArray.buffer, i * 16 * 4, 16);
      instanceMatrixArray.set(mat4.create());
      this.discInstances.matrices.push(instanceMatrixArray);
    }
    gl.bindVertexArray(this.discVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.discInstances.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.discInstances.matricesArray.byteLength, gl.DYNAMIC_DRAW);
    const mat4AttribSlotCount = 4;
    const bytesPerMatrix = 16 * 4;
    for (let j = 0; j < mat4AttribSlotCount; ++j) {
      const loc = this.discLocations.aInstanceMatrix + j;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, bytesPerMatrix, j * 4 * 4);
      gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
  }

  animate(deltaTime) {
    const { mat4, vec3 } = window.glMatrix || {};
    const gl = this.gl;
    this.control.update(deltaTime, this.TARGET_FRAME_DURATION);

    let positions = this.instancePositions.map(p => vec3.transformQuat(vec3.create(), p, this.control.orientation));
    const isMobile = window.innerWidth <= 768;
    const baseScale = isMobile ? 0.38 : 0.44;
    const SCALE_INTENSITY = 0.42;
    positions.forEach((p, ndx) => {
      const s = (Math.abs(p[2]) / this.SPHERE_RADIUS) * SCALE_INTENSITY + (1 - SCALE_INTENSITY);
      const finalScale = s * baseScale;
      const matrix = mat4.create();
      mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), vec3.negate(vec3.create(), p)));
      mat4.multiply(matrix, matrix, mat4.targetTo(mat4.create(), [0, 0, 0], p, [0, 1, 0]));
      mat4.multiply(matrix, matrix, mat4.fromScaling(mat4.create(), [finalScale, finalScale, finalScale]));
      mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), [0, 0, -this.SPHERE_RADIUS]));

      mat4.copy(this.discInstances.matrices[ndx], matrix);
    });

    gl.bindBuffer(gl.ARRAY_BUFFER, this.discInstances.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.discInstances.matricesArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.smoothRotationVelocity = this.control.rotationVelocity;
  }

  render() {
    if (this.ghostFibers) {
      const currentCameraZ = this.camera.position[2];
      const targetRestZ = 3.0 * this.scaleFactor;
      // When sphere is NOT rotating -> visualScale is 1.0 (enlarged)
      // When sphere IS rotating -> visualScale decreases to ~0.55 (shrunk like the sphere)
      const visualScale = targetRestZ / Math.max(0.1, currentCameraZ);
      this.ghostFibers.render(this.time / 1000, visualScale);
    }

    const gl = this.gl;
    gl.useProgram(this.discProgram);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(this.discLocations.uWorldMatrix, false, this.worldMatrix);
    gl.uniformMatrix4fv(this.discLocations.uViewMatrix, false, this.camera.matrices.view);
    gl.uniformMatrix4fv(this.discLocations.uProjectionMatrix, false, this.camera.matrices.projection);
    gl.uniform3f(
      this.discLocations.uCameraPosition,
      this.camera.position[0],
      this.camera.position[1],
      this.camera.position[2]
    );
    gl.uniform4f(
      this.discLocations.uRotationAxisVelocity,
      this.control.rotationAxis[0],
      this.control.rotationAxis[1],
      this.control.rotationAxis[2],
      this.smoothRotationVelocity * 1.1
    );

    gl.uniform1i(this.discLocations.uItemCount, this.items.length);
    gl.uniform1i(this.discLocations.uAtlasSize, this.atlasSize);

    if (this.discLocations.uFrames) gl.uniform1f(this.discLocations.uFrames, this.frames);
    if (this.discLocations.uScaleFactor) gl.uniform1f(this.discLocations.uScaleFactor, this.scaleFactor);
    gl.uniform1i(this.discLocations.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);

    gl.bindVertexArray(this.discVAO);
    gl.drawElementsInstanced(
      gl.TRIANGLES,
      this.discBuffers.indices.length,
      gl.UNSIGNED_SHORT,
      0,
      this.DISC_INSTANCE_COUNT
    );
  }

  updateCameraMatrix() {
    const { mat4 } = window.glMatrix || {};
    mat4.targetTo(this.camera.matrix, this.camera.position, [0, 0, 0], this.camera.up);
    mat4.invert(this.camera.matrices.view, this.camera.matrix);
  }

  updateProjectionMatrix(gl) {
    const { mat4 } = window.glMatrix || {};
    this.camera.aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const height = this.SPHERE_RADIUS * 0.35;
    const distance = this.camera.position[2];
    if (this.camera.aspect > 1) {
      this.camera.fov = 2 * Math.atan(height / distance);
    } else {
      this.camera.fov = 2 * Math.atan(height / this.camera.aspect / distance);
    }
    mat4.perspective(
      this.camera.matrices.projection,
      this.camera.fov,
      this.camera.aspect,
      this.camera.near,
      this.camera.far
    );
    mat4.invert(this.camera.matrices.inversProjection, this.camera.matrices.projection);
  }

  onControlUpdate(deltaTime) {
    const { vec3 } = window.glMatrix || {};
    const timeScale = deltaTime / this.TARGET_FRAME_DURATION + 0.0001;
    let damping = 5 / timeScale;
    let cameraTargetZ = 3 * this.scaleFactor;

    const isMoving = this.control.isPointerDown || Math.abs(this.smoothRotationVelocity) > 0.008;

    if (isMoving !== this.movementActive) {
      this.movementActive = isMoving;
      this.onMovementChange(isMoving);
    }

    if (!this.control.isPointerDown) {
      const nearestVertexIndex = this.findNearestVertexIndex();
      const itemIndex = VERTEX_TO_ITEM[nearestVertexIndex % 12] % Math.max(1, this.items.length);
      this.onActiveItemChange(itemIndex);
      const snapDirection = vec3.normalize(vec3.create(), this.getVertexWorldPosition(nearestVertexIndex));
      this.control.snapTargetDirection = snapDirection;
    } else {
      this.control.snapTargetDirection = null;
      cameraTargetZ += this.control.rotationVelocity * 80 + 2.5;
      damping = 7 / timeScale;
    }

    this.camera.position[2] += (cameraTargetZ - this.camera.position[2]) / damping;
    this.updateCameraMatrix();
  }

  findNearestVertexIndex() {
    const { quat, vec3 } = window.glMatrix || {};
    const n = this.control.snapDirection;
    const inversOrientation = quat.conjugate(quat.create(), this.control.orientation);
    const nt = vec3.transformQuat(vec3.create(), n, inversOrientation);

    let maxD = -1;
    let nearestVertexIndex = 0;
    for (let i = 0; i < this.instancePositions.length; ++i) {
      const d = vec3.dot(nt, this.instancePositions[i]);
      if (d > maxD) {
        maxD = d;
        nearestVertexIndex = i;
      }
    }
    return nearestVertexIndex;
  }

  getVertexWorldPosition(index) {
    const { vec3 } = window.glMatrix || {};
    const nearestVertexPos = this.instancePositions[index];
    return vec3.transformQuat(vec3.create(), nearestVertexPos, this.control.orientation);
  }
}

// Gallery Lightbox Controller
let galleryLightboxIndex = 0;
function openGalleryLightbox(index) {
    const lb = document.getElementById('gallery-lightbox');
    const lbImg = document.getElementById('lightbox-img');
    const lbTag = document.getElementById('lightbox-tag');
    const lbTitle = document.getElementById('lightbox-title');
    if (!lb || !lbImg) return;

    galleryLightboxIndex = (index + GALLERY_ITEMS.length) % GALLERY_ITEMS.length;
    const item = GALLERY_ITEMS[galleryLightboxIndex];
    lbImg.src = item.image;
    if (lbTag) lbTag.textContent = item.badge;
    if (lbTitle) lbTitle.textContent = item.title;
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeGalleryLightbox() {
    const lb = document.getElementById('gallery-lightbox');
    if (lb) lb.classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
    // Lightbox events
    document.getElementById('lightbox-close-btn')?.addEventListener('click', closeGalleryLightbox);
    document.querySelector('.lightbox-backdrop')?.addEventListener('click', closeGalleryLightbox);
    document.getElementById('lightbox-prev-btn')?.addEventListener('click', () => openGalleryLightbox(galleryLightboxIndex - 1));
    document.getElementById('lightbox-next-btn')?.addEventListener('click', () => openGalleryLightbox(galleryLightboxIndex + 1));
    window.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeGalleryLightbox();
        if (document.getElementById('gallery-lightbox')?.classList.contains('active')) {
            if (e.key === 'ArrowLeft') openGalleryLightbox(galleryLightboxIndex - 1);
            if (e.key === 'ArrowRight') openGalleryLightbox(galleryLightboxIndex + 1);
        }
    });

    // Initialize 3D Infinite Grid Menu
    const canvas = document.getElementById('infinite-grid-menu-canvas');
    if (!canvas) return;

    let activeItemIndex = 0;
    const titleBox = document.getElementById('gallery-title-box');
    const descBox = document.getElementById('gallery-desc-box');
    const actionBtn = document.getElementById('gallery-action-btn');
    const badgeEl = document.getElementById('gallery-face-badge');
    const titleEl = document.getElementById('gallery-face-title');
    const descEl = document.getElementById('gallery-face-desc');

    const handleActiveItem = (index) => {
        const itemIndex = index % GALLERY_ITEMS.length;
        activeItemIndex = itemIndex;
        const item = GALLERY_ITEMS[itemIndex];
        if (!item) return;

        if (badgeEl) badgeEl.textContent = item.badge;
        if (titleEl) titleEl.textContent = item.title;
        if (descEl) descEl.textContent = item.description;
    };

    const handleMovementChange = (isMoving) => {
        if (isMoving) {
            if (titleBox) { titleBox.classList.remove('active'); titleBox.classList.add('inactive'); }
            if (descBox) { descBox.classList.remove('active'); descBox.classList.add('inactive'); }
            if (actionBtn) { actionBtn.classList.remove('active'); actionBtn.classList.add('inactive'); }
        } else {
            if (titleBox) { titleBox.classList.remove('inactive'); titleBox.classList.add('active'); }
            if (descBox) { descBox.classList.remove('inactive'); descBox.classList.add('active'); }
            if (actionBtn) { actionBtn.classList.remove('inactive'); actionBtn.classList.add('active'); }
        }
    };

    if (actionBtn) {
        actionBtn.addEventListener('click', () => {
            openGalleryLightbox(activeItemIndex);
        });
    }

    const isMobile = window.innerWidth <= 768;
    const sketch = new InfiniteGridMenu(
        canvas,
        GALLERY_ITEMS,
        handleActiveItem,
        handleMovementChange,
        sk => sk.run(),
        isMobile ? 1.25 : 1.0
    );

    const handleResize = () => {
        if (sketch) sketch.resize();
    };

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);

    // Also resize when gallery section enters viewport
    const gallerySec = document.getElementById('gallery');
    if (gallerySec && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    handleResize();
                }
            });
        }, { threshold: 0.1 });
        observer.observe(gallerySec);
    }
});

// FAQ Accordion Script
document.addEventListener('DOMContentLoaded', () => {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const btn = item.querySelector('.faq-question');
        if (btn) {
            btn.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                // Close all other items for a clean accordion effect
                faqItems.forEach(otherItem => {
                    otherItem.classList.remove('active');
                });
                
                // Toggle current item
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        }
    });
});




