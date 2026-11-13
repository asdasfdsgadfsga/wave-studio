/**
 * WAVE AI CHATBOT WIDGET
 * Профессиональный AI-саунд-продюсер и консультант Wave Studio
 * Режимы общения:
 *  1) Pro — Студийный звукорежиссёр и саунд-продюсер Wave Studio
 *  2) Вась — Пацан с посёлка из ТикТока (базарит строго по понятиям, но шарит в звуке)
 * Позиция кнопки: ЛЕВЫЙ НИЖНИЙ УГОЛ (bottom: 24px; left: 24px;)
 * Изоляция стилей: Shadow DOM
 */
(function () {
  'use strict';

  if (window.__WAVE_CHAT_WIDGET_INITIALIZED__) return;
  window.__WAVE_CHAT_WIDGET_INITIALIZED__ = true;

  const currentScript = document.currentScript || (function () {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  let apiUrl = isLocalhost ? 'http://localhost:3005/api/chat' : '/api/chat';
  if (currentScript && currentScript.dataset.api) {
    if (isLocalhost && currentScript.dataset.api === '/api/chat') {
      apiUrl = 'http://localhost:3005/api/chat';
    } else {
      apiUrl = currentScript.dataset.api;
    }
  } else if (!isLocalhost && currentScript && currentScript.src && currentScript.src.startsWith('http')) {
    try {
      const u = new URL(currentScript.src);
      apiUrl = u.origin + '/api/chat';
    } catch (e) {}
  }

  // Векторные SVG-иконки для интерфейса (вместо системных эмодзи)
  const ICONS = {
    note: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
    cap: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5C7.58 5 4 8.58 4 13h16c0-4.42-3.58-8-8-8zm-8 10v1c0 .55.45 1 1 1h12.5c2.5 0 4.5-1.5 5.5-3H4z"/><circle cx="12" cy="4.2" r="1.2"/></svg>',
    headphones: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>',
    streetCap: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5C7.58 5 4 8.58 4 13h16c0-4.42-3.58-8-8-8zm-8 10v1c0 .55.45 1 1 1h12.5c2.5 0 4.5-1.5 5.5-3H4z"/><circle cx="12" cy="4.2" r="1.2"/></svg>',
    wave: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 10h2v4H3v-4zm4-4h2v12H7V6zm4-3h2v18h-2V3zm4 5h2v10h-2V8zm4 3h2v4h-2v-4z"/></svg>',
    sliders: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><circle cx="4" cy="12" r="2" fill="currentColor"></circle><circle cx="12" cy="10" r="2" fill="currentColor"></circle><circle cx="20" cy="14" r="2" fill="currentColor"></circle></svg>',
    piano: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6c-.55 0-1-.45-1-1V5h2v9h2V5h2v9h2V5h2v13c0 .55-.45 1-1 1z"/></svg>',
    mic: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>',
    tag: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>',
    fire: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-4.97 0-9-3.8-9-8.5C3 8.35 9.17 2.22 9.53 2.02a1 1 0 0 1 1.05.12c.3.26.42.67.3 1.05-.53 1.63-.33 3.4.52 4.75.29.47.78.78 1.33.86.55.08 1.1-.08 1.5-.47 1.28-1.28 2.05-2.87 2.22-4.6a1 1 0 0 1 1.6-.68C19.78 6.45 21 10.42 21 14.5c0 4.7-4.03 8.5-9 8.5z"/></svg>'
  };

  const PRO_CHIPS = [
    { icon: ICONS.wave, text: 'Плотный 808 бас' },
    { icon: ICONS.sliders, text: 'Как свести вокал под бит?' },
    { icon: ICONS.piano, text: 'Как зайти в онлайн DAW?' },
    { icon: ICONS.mic, text: 'Микрофон для записи дома' },
    { icon: ICONS.tag, text: 'Стоимость услуг студии' }
  ];

  const STREET_CHIPS = [
    { icon: ICONS.fire, text: 'Жирный 808, вась' },
    { icon: ICONS.sliders, text: 'Сведение вокала по понятиям' },
    { icon: ICONS.piano, text: 'Чё за халявная Web DAW?' },
    { icon: ICONS.mic, text: 'Микрофон для пацанов' },
    { icon: ICONS.tag, text: 'Скока стоит студия?' }
  ];

  const widgetStyles = `
    *,*::before,*::after {
      box-sizing:border-box;
      margin:0;
      padding:0
    }
    :host {
      font-family: var(--font-main, 'Montserrat', sans-serif);
      color:#f4f1fa;
      color-scheme:dark;
      --wave-bg: var(--color-bg-base, #05010a);
      --wave-border: rgba(199, 125, 255, .24);
      --wave-accent: #c77dff;
    }
    button,textarea {
      font:inherit
    }
    button {
      cursor:pointer;
      -webkit-tap-highlight-color:transparent
    }
    button:focus-visible {
      outline:2px solid #c4a2ff;
      outline-offset:3px
    }
    .chat-launcher-btn {
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 1000000;
      min-height: 54px;
      padding: 0 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 11px;
      border: 1px solid rgba(199, 125, 255, .32);
      border-radius: 30px;
      background: rgba(22, 12, 34, .94);
      color: #eee3ff;
      box-shadow: 0 6px 24px #0005, inset 0 1px 0 #ffffff08;
      transition: background .2s, border-color .2s, box-shadow .2s, transform .2s, opacity .2s, visibility .2s;
      min-width: 180px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .chat-launcher-btn:hover {
      background: #2a183e;
      border-color: #bd96ee;
      box-shadow: 0 6px 24px #0005, 0 0 22px #ac72ed26;
      transform: translateY(-2px);
    }
    .chat-launcher-btn:active { transform: translateY(0); }
    .chat-launcher-btn.is-open {
      background: rgba(36, 18, 56, .96);
      border-color: rgba(199, 125, 255, .5);
    }
    .launcher-collapse { display: none; width: 22px; height: 22px; }
    .chat-launcher-btn.is-open .launcher-wave,
    .chat-launcher-btn.is-open .launcher-chat { display: none; }
    .chat-launcher-btn.is-open .launcher-collapse { display: block; }
    .launcher-label {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 1px;
      white-space: nowrap;
      text-transform: uppercase;
    }
    .launcher-wave { width: 24px; height: 24px; color: #c8a2f6; }
    .launcher-chat { display: none; width: 24px; height: 24px; color: #d1b2f7; }
    .chat-window {
      position:fixed;
      bottom:96px;
      left:24px;
      z-index:999999;
      width:420px;
      max-width:calc(100vw - 48px);
      height:650px;
      max-height:calc(100dvh - 120px);
      display:flex;
      flex-direction:column;
      overflow:hidden;
      background: radial-gradient(ellipse at 10% 0%, rgba(58, 16, 120, .18), transparent 65%), var(--wave-bg);
      border: 1px solid var(--wave-border);
      border-radius: 22px;
      box-shadow: 0 24px 70px rgba(0, 0, 0, .6), 0 0 35px rgba(58, 16, 120, .12);
      opacity:0;
      visibility:hidden;
      transform:translateY(12px) scale(.98);
      transform-origin:bottom left;
      transition:opacity .22s,transform .22s,visibility .22s
    }
    .chat-window.is-open {
      opacity:1;
      visibility:visible;
      transform:none
    }
    .chat-header {
      padding:22px 22px 16px;
      background: rgba(18, 4, 36, .58);
      border-bottom: 1px solid rgba(199, 125, 255, .12);
      flex-shrink:0
    }
    .chat-header-top,.chat-header-info {
      display:flex;
      align-items:center;
      gap:12px;
      min-width:0
    }
    .chat-header-top {
      justify-content:space-between
    }
    .chat-header-info {
      flex:1
    }
    .chat-avatar {
      width:44px;
      height:44px;
      display:grid;
      place-items:center;
      flex-shrink:0;
      border-radius: 50%;
      background: rgba(157, 78, 221, .08);
      border: 1px solid var(--wave-border);
      color: var(--wave-accent)
    }
    .chat-avatar svg {
      width:23px;
      height:23px
    }
    .chat-header-text {
      min-width:0
    }
    .chat-name {
      display:block;
      font-size:12px;
      font-weight: 500;
      letter-spacing: 1.7px;
      color:#f5efff
    }
    .chat-status {
      display:flex;
      align-items:center;
      gap:6px;
      margin-top:6px;
      font-size:10px;
      color:#b6adbf
    }
    .status-dot {
      width:5px;
      height:5px;
      background: var(--wave-accent);
      border-radius:50%;
      flex-shrink:0
    }
    .chat-close-btn {
      width:32px;
      height:32px;
      flex-shrink:0;
      display:grid;
      place-items:center;
      background:transparent;
      border:none;
      border-radius:10px;
      color:#aca2b9
    }
    .chat-close-btn:hover {
      background:#ffffff0c;
      color:white
    }
    .chat-header-mode-bar {
      margin-top:20px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px
    }
    .mode-bar-label {
      font-size:10px;
      color:#aba1b7
    }
    .persona-switcher {
      display:flex;
      padding:3px;
      gap:3px;
      border: 1px solid rgba(199, 125, 255, .16);
      background: rgba(5, 1, 10, .6);
      border-radius: 20px
    }
    .persona-btn {
      display:flex;
      align-items:center;
      gap:6px;
      padding:7px 13px;
      border:none;
      border-radius: 16px;
      background:transparent;
      color:#a99db8;
      font-size:11px;
      font-weight:600;
      transition:background .2s,color .2s
    }
    .persona-btn:hover {
      color:#f5efff
    }
    .persona-btn.active {
      background: rgba(157, 78, 221, .2);
      color: #f4e9ff;
      box-shadow: inset 0 0 0 1px rgba(199, 125, 255, .22)
    }
    .persona-btn:disabled {
      opacity:.55;
      cursor:wait
    }
    .chat-messages {
      flex:1;
      min-height:0;
      overflow-y:auto;
      overscroll-behavior:contain;
      padding:24px 22px;
      display:flex;
      flex-direction:column;
      gap:16px;
      scrollbar-width:thin;
      scrollbar-color:#46374f transparent
    }
    .welcome {
      padding:4px 0 2px;
      flex-shrink:0
    }
    .welcome-eyebrow {
      font-size:9px;
      letter-spacing:2px;
      font-weight: 500;
      color: var(--wave-accent);
      display:flex;
      align-items:center;
      gap:9px
    }
    .welcome-eyebrow::before {
      content:'';
      width:18px;
      height:1px;
      background: var(--wave-accent)
    }
    .welcome h2 {
      font-size: 30px;
      line-height: 1.35;
      letter-spacing: 1.5px;
      font-weight: 300;
      margin:16px 0 12px;
      color:#f5efff;
      text-transform: uppercase;
    }
    .welcome p {
      font-size:12px;
      line-height:1.8;
      color: #afa0be;
      max-width:310px
    }
    .message-bubble {
      max-width:91%;
      padding:14px 16px;
      font-size:12px;
      line-height:1.8;
      border-radius:16px;
      overflow-wrap:anywhere;
      white-space:pre-wrap;
      flex-shrink:0;
      animation:bubbleIn .2s ease
    }
    @keyframes bubbleIn {
      from {
        opacity:0;
        transform:translateY(5px)
      }
      to {
        opacity:1;
        transform:none
      }
    }
    .message-bubble.assistant {
      align-self:flex-start;
      background: rgba(18, 4, 36, .75);
      border: 1px solid rgba(199, 125, 255, .12);
      color:#e3dcea;
      border-bottom-left-radius:5px
    }
    .message-bubble.assistant::before {
      content:'WAVE AI';
      display:block;
      margin-bottom:6px;
      color:#bca0e2;
      font-size:8px;
      font-weight:700;
      letter-spacing:1.3px
    }
    .message-bubble.user {
      align-self:flex-end;
      background: rgba(58, 16, 120, .5);
      border: 1px solid var(--wave-border);
      color:#faf5ff;
      border-bottom-right-radius:5px
    }
    .message-time {
      margin-top:7px;
      text-align:right;
      font-size:9px;
      color:#b9aaca;
      line-height:1
    }
    .message-bubble.system-note {
      align-self:center;
      padding:4px 8px;
      font-size:10px;
      line-height:1.6;
      text-align:center;
      color:#b6a3cc
    }
    .message-bubble.system-error {
      align-self:center;
      background:#472634;
      border:1px solid #f6a5bb33;
      color:#ffbdce;
      font-size:11px
    }
    .quick-chips {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:8px;
      margin:4px 0;
      flex-shrink:0
    }
    .quick-chip {
      display:flex;
      align-items:flex-start;
      text-align:left;
      gap:9px;
      min-width:0;
      padding:13px 12px;
      min-height:59px;
      border-radius: 14px;
      background: rgba(18, 4, 36, .35);
      border: 1px solid rgba(199, 125, 255, .17);
      color: #d4c7e0;
      font-size: 11px;
      line-height:1.6;
      transition:background .2s,border-color .2s,transform .2s
    }
    .quick-chip:last-child {
      grid-column:1/-1;
      min-height:43px;
      align-items:center
    }
    .quick-chip svg {
      width:15px;
      height:15px;
      flex-shrink:0;
      color:#b59ad9;
      margin-top:1px
    }
    .quick-chip:hover {
      background: rgba(38, 9, 74, .5);
      border-color: rgba(199, 125, 255, .42);
      transform:translateY(-1px);
      color:#f3eaff
    }
    .typing-box {
      display:flex;
      align-items:center;
      gap:5px;
      align-self:flex-start;
      padding:16px;
      border-radius:14px;
      background: rgba(18, 4, 36, .75)
    }
    .typing-dot {
      width:5px;
      height:5px;
      background:#b59ad9;
      border-radius:50%;
      animation:bounceDot 1.3s infinite
    }
    .typing-dot:nth-child(2) {
      animation-delay:.15s
    }
    .typing-dot:nth-child(3) {
      animation-delay:.3s
    }
    @keyframes bounceDot {
      0%,70%,100% {
        opacity:.35;
        transform:none
      }
      35% {
        opacity:1;
        transform:translateY(-3px)
      }
    }
    .chat-footer {
      display:flex;
      flex-wrap:wrap;
      align-items:flex-end;
      gap:0;
      margin:0 16px 14px;
      padding:6px;
      border-radius: 20px;
      background: rgba(18, 4, 36, .65);
      border: 1px solid rgba(199, 125, 255, .24);
      flex-shrink:0;
      transition:border-color .2s
    }
    .chat-footer:focus-within {
      border-color:#b18ae488
    }
    .chat-input-box {
      flex:1;
      min-width:0;
      padding:9px 8px 8px 9px
    }
    .chat-input {
      display:block;
      width:100%;
      background:transparent;
      border:none;
      outline:none;
      color:#f5efff;
      font-size:12px;
      line-height:1.6;
      resize:none;
      max-height:90px;
      min-height:22px
    }
    .chat-input::placeholder {
      color:#a297b0
    }
    .chat-send-btn {
      display:grid;
      place-items:center;
      width:36px;
      height:36px;
      margin:2px;
      border-radius: 50%;
      background: rgba(157, 78, 221, .25);
      border: 1px solid rgba(199, 125, 255, .35);
      color: #e0aaff;
      transition:background .2s,opacity .2s
    }
    .chat-send-btn:hover:not(:disabled) {
      background: rgba(157, 78, 221, .45)
    }
    .chat-send-btn:disabled {
      opacity:.35;
      cursor:default
    }
    .chat-send-btn svg {
      width:18px;
      height:18px;
      fill:currentColor
    }
    .composer-hint {
      width:100%;
      text-align:center;
      padding:6px 2px 2px;
      color:#a297b0;
      font-size:8px;
      letter-spacing:.15px
    }
    @media(max-width:600px) {
      .chat-launcher-btn {
        bottom: max(18px, env(safe-area-inset-bottom));
        left: max(18px, env(safe-area-inset-left));
        width: 52px;
        min-width: 52px;
        height: 52px;
        min-height: 52px;
        padding: 0;
        border-radius: 18px;
      }
      .launcher-label, .launcher-wave { display: none; }
      .launcher-chat { display: block; }
      .chat-window {
        top:0;
        left:0;
        right:0;
        bottom:0;
        width:100%;
        max-width:100%;
        height:100dvh;
        max-height:100dvh;
        border:none;
        border-radius:0;
        padding-bottom: 86px
      }
      .chat-header {
        padding-top:max(20px,env(safe-area-inset-top))
      }
      .chat-footer {
        margin-bottom:max(14px,env(safe-area-inset-bottom))
      }
      .chat-input {
        font-size:16px
      }
      .composer-hint {
        font-size:9px
      }
      .chat-name {
        letter-spacing:1px
      }
    }
    @media(prefers-reduced-motion:reduce) {
      *,*::before,*::after {
        animation:none!important;
        transition:none!important;
        scroll-behavior:auto!important
      }
    }
  `;

  // HTML структура виджета
  const widgetHtml = `
    <button type="button" class="chat-launcher-btn" id="launcher-btn" aria-expanded="false" aria-controls="chat-window" aria-label="Спросить AI — открыть чат Wave Studio">
      <svg class="launcher-wave" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
        <path d="M3 10v4M7.5 6v12M12 3v18M16.5 7v10M21 10v4"/>
      </svg>
      <span class="launcher-label" id="launcher-label">Спросить AI</span>
      <svg class="launcher-collapse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      <svg class="launcher-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 11.5a8 8 0 0 1-8 8H4l1.5-4A8 8 0 1 1 20 11.5Z"/>
        <path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" stroke-width="2.5"/>
      </svg>
    </button>

    <div class="chat-window" id="chat-window" role="region" aria-label="AI-консультант Wave Studio" inert>
      <!-- Шапка диалога (двухуровневая) -->
      <div class="chat-header">
        <div class="chat-header-top">
          <div class="chat-header-info">
            <div class="chat-avatar" id="chat-avatar">
              ${ICONS.wave}
            </div>
            <div class="chat-header-text">
              <span class="chat-name" id="chat-name">WAVE AI PRODUCER</span>
              <span class="chat-status" id="chat-status">
                <span class="status-dot"></span>
                <span id="chat-status-text">Помощник по звуку</span>
              </span>
            </div>
          </div>

          <button class="chat-close-btn" id="close-btn" aria-label="Закрыть окно чата" title="Закрыть">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div class="chat-header-mode-bar">
          <span class="mode-bar-label">Стиль общения</span>
          <div class="persona-switcher" id="persona-switcher" title="Сменить характер общения">
            <button type="button" class="persona-btn active" data-mode="pro" id="btn-mode-pro" aria-pressed="true">
              ${ICONS.headphones}
              <span>Pro</span>
            </button>
            <button type="button" class="persona-btn" data-mode="street" id="btn-mode-street" aria-pressed="false">
              ${ICONS.streetCap}
              <span>Вась</span>
            </button>
          </div>
        </div>
      </div>

      <div class="chat-messages" id="messages-container" role="log" aria-label="Сообщения" aria-live="polite" aria-relevant="additions"><div class="welcome"><div class="welcome-eyebrow">WAVEMUSIC / AI-АССИСТЕНТ</div><h2>Поймаем<br>твой звук.</h2><p>От первой идеи до финального мастера. Помогу с битами, вокалом и работой в студии.</p></div></div>

      <div class="chat-footer">
        <div class="chat-input-box">
          <textarea
            class="chat-input"
            id="chat-input"
            aria-label="Ваше сообщение" placeholder="Что создаём сегодня?"
            rows="1"
          ></textarea>
        </div>
        <button class="chat-send-btn" id="send-btn" aria-label="Отправить сообщение" disabled>
          <svg viewBox="0 0 24 24">
            <path d="M11 20V7.83l-4.59 4.58L5 11l7-7 7 7-1.41 1.41L13 7.83V20z"/>
          </svg>
        </button>
        <div class="composer-hint">Wave AI · Ответы могут быть неточными</div>
      </div>
    </div>
  `;

  function mountWidget() {
    const hostEl = document.createElement('div');
    hostEl.id = 'wave-ai-chat-root';
    document.body.appendChild(hostEl);

    const shadowRoot = hostEl.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = widgetStyles;
    shadowRoot.appendChild(styleEl);

    const template = document.createElement('div');
    template.innerHTML = widgetHtml;
    while (template.firstChild) {
      shadowRoot.appendChild(template.firstChild);
    }

    const launcherBtn = shadowRoot.getElementById('launcher-btn');
    const launcherLabel = shadowRoot.getElementById('launcher-label');
    const chatWindow = shadowRoot.getElementById('chat-window');
    const closeBtn = shadowRoot.getElementById('close-btn');
    const messagesContainer = shadowRoot.getElementById('messages-container');
    const chatInput = shadowRoot.getElementById('chat-input');
    const sendBtn = shadowRoot.getElementById('send-btn');
    const chatName = shadowRoot.getElementById('chat-name');
    const chatStatus = shadowRoot.getElementById('chat-status');
    const chatStatusText = shadowRoot.getElementById('chat-status-text');
    const chatAvatar = shadowRoot.getElementById('chat-avatar');
    const btnModePro = shadowRoot.getElementById('btn-mode-pro');
    const btnModeStreet = shadowRoot.getElementById('btn-mode-street');

    let isOpen = false;
    let isWaitingResponse = false;
    let currentMode = 'pro'; // 'pro' | 'street'
    const history = [];

    // Переключение характера
    function setPersonaMode(newMode) {
      if (newMode === currentMode) return;
      if (isWaitingResponse) return;
      currentMode = newMode;
      btnModePro.setAttribute('aria-pressed', String(currentMode === 'pro'));
      btnModeStreet.setAttribute('aria-pressed', String(currentMode === 'street'));

      if (currentMode === 'street') {
        btnModeStreet.classList.add('active');
        btnModePro.classList.remove('active');
        if (chatAvatar) chatAvatar.innerHTML = ICONS.cap;
        chatName.textContent = 'ВАСЯ ПО ПОНЯТИЯМ';
        if (chatStatusText) {
          chatStatusText.textContent = 'Пацан с посёлка онлайн';
        }

        chatInput.placeholder = 'Слышь, вась, чё по битам?...';

        appendMessage('system-note', 'Включён режим: «Пацан с посёлка» (TikTok meme). Базарим по понятиям, вась!');
        appendMessage('assistant', 'Слышь, вась, здорово, бля! Раскидаю за любой бит, 808-й бас и сведение чисто по понятиям, нахуй. Чё интересует, ёпта?');
        renderQuickChips(STREET_CHIPS);
      } else {
        btnModePro.classList.add('active');
        btnModeStreet.classList.remove('active');
        if (chatAvatar) chatAvatar.innerHTML = ICONS.wave;
        chatName.textContent = 'WAVE AI PRODUCER';
        if (chatStatusText) {
          chatStatusText.textContent = 'Саунд-продюсер онлайн';
        }

        chatInput.placeholder = 'Что создаём сегодня?';

        appendMessage('system-note', 'Включён режим: «Студийный саунд-продюсер Wave Studio».');
        appendMessage('assistant', 'Включен профессиональный студийный режим. Готов разобрать структуру трека, сведение, 808-й бас или работу в онлайн Web DAW.');
        renderQuickChips(PRO_CHIPS);
      }
    }

    btnModePro.addEventListener('click', () => setPersonaMode('pro'));
    btnModeStreet.addEventListener('click', () => setPersonaMode('street'));

    function updateLauncherPosition() {
      if (isOpen && window.innerWidth <= 600) {
        const viewport = window.visualViewport;
        const viewportBottom = viewport ? viewport.height + viewport.offsetTop : window.innerHeight;
        launcherBtn.style.bottom = Math.max(18, window.innerHeight - viewportBottom + 18) + 'px';
      } else {
        launcherBtn.style.bottom = '';
      }
    }

    function toggleChat(forceState) {
      isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
      launcherBtn.classList.toggle('is-open', isOpen);
      chatWindow.classList.toggle('is-open', isOpen);
      chatWindow.inert = !isOpen;
      launcherBtn.setAttribute('aria-expanded', String(isOpen));
      launcherLabel.textContent = isOpen ? 'Свернуть чат' : 'Спросить AI';
      launcherBtn.setAttribute('aria-label', isOpen ? 'Свернуть чат Wave Studio' : 'Спросить AI — открыть чат Wave Studio');
      updateLauncherPosition();

      if (isOpen) {
        if (window.innerWidth > 600) {
          chatInput.focus({ preventScroll: true });
        } else {
          closeBtn.focus({ preventScroll: true });
        }
        if (window.visualViewport && window.innerWidth <= 600) {
          chatWindow.style.height = `${window.visualViewport.height}px`;
        }
        scrollToBottom();
      } else {
        chatWindow.style.height = '';
        launcherBtn.focus();
      }
    }

    // Поддержка виртуальной клавиатуры и динамического вьюпорта на смартфонах (iOS / Android)
    if (window.visualViewport) {
      const handleViewportChange = () => {
        updateLauncherPosition();
        if (window.innerWidth <= 600 && isOpen) {
          chatWindow.style.height = `${window.visualViewport.height}px`;
          scrollToBottom();
        } else if (!isOpen) {
          chatWindow.style.height = '';
        }
      };

      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }

    window.addEventListener('resize', updateLauncherPosition);

    chatInput.addEventListener('focus', () => {
      if (window.innerWidth <= 600) {
        setTimeout(() => {
          if (window.visualViewport) {
            chatWindow.style.height = `${window.visualViewport.height}px`;
          }
          scrollToBottom();
        }, 280);
      }
    });

    launcherBtn.addEventListener('click', () => toggleChat());
    closeBtn.addEventListener('click', () => toggleChat(false));
    shadowRoot.addEventListener('keydown', event => {
      if (event.key === 'Escape' && isOpen) toggleChat(false);
    });

    function appendMessage(role, text) {
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble ' + role;

      let cleanedText = typeof text === 'string' ? text : '';
      if (cleanedText) {
        cleanedText = cleanedText.replaceAll('**', '');
      }
      bubble.textContent = cleanedText;

      if (role !== 'system-note') {
        const timeEl = document.createElement('div');
        timeEl.className = 'message-time';
        const now = new Date();
        timeEl.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        bubble.appendChild(timeEl);
      }

      messagesContainer.appendChild(bubble);
      scrollToBottom();
      return bubble;
    }

    function renderQuickChips(customSuggestions) {
      // Удаляем старые чипсы, если есть
      const oldChips = messagesContainer.querySelectorAll('.quick-chips');
      oldChips.forEach(c => c.remove());

      const chipsContainer = document.createElement('div');
      chipsContainer.className = 'quick-chips';

      const promptSuggestions = customSuggestions || PRO_CHIPS;

      promptSuggestions.forEach(item => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'quick-chip';

        const isObj = typeof item === 'object' && item !== null;
        const iconSvg = isObj && item.icon ? item.icon : '';
        const labelText = isObj ? item.text : item;

        chip.innerHTML = iconSvg + '<span>' + labelText + '</span>';
        chip.addEventListener('click', () => {
          chatInput.value = labelText;
          handleSendMessage();
        });
        chipsContainer.appendChild(chip);
      });

      messagesContainer.appendChild(chipsContainer);
      scrollToBottom();
    }

    let typingEl = null;
    function showTypingIndicator() {
      if (typingEl) return;
      typingEl = document.createElement('div');
      typingEl.className = 'typing-box';
      typingEl.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
      messagesContainer.appendChild(typingEl);
      scrollToBottom();
    }

    function hideTypingIndicator() {
      if (typingEl && typingEl.parentNode) {
        typingEl.parentNode.removeChild(typingEl);
      }
      typingEl = null;
    }

    function scrollToBottom() {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 90) + 'px';
      sendBtn.disabled = !chatInput.value.trim() || isWaitingResponse;
    });

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        if (!sendBtn.disabled) {
          handleSendMessage();
        }
      }
    });

    sendBtn.addEventListener('click', () => {
      if (!sendBtn.disabled) {
        handleSendMessage();
      }
    });

    async function handleSendMessage() {
      const userText = chatInput.value.trim();
      if (!userText || isWaitingResponse) return;

      chatInput.value = '';
      chatInput.style.height = 'auto';
      sendBtn.disabled = true;
      isWaitingResponse = true;
      btnModePro.disabled = true;
      btnModeStreet.disabled = true;
      messagesContainer.querySelectorAll('.quick-chips, .welcome').forEach(el => el.remove());

      appendMessage('user', userText);
      showTypingIndicator();

      try {
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: userText,
            history: history,
            mode: currentMode
          })
        });

        hideTypingIndicator();

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error || ('HTTP ' + resp.status));
        }

        const data = await resp.json();
        const replyText = data.reply || 'К сожалению, не удалось получить ответ.';

        history.push({ role: 'user', content: userText });
        history.push({ role: 'assistant', content: replyText });

        appendMessage('assistant', replyText);

      } catch (err) {
        hideTypingIndicator();
        console.error('[Chat Widget Error]:', err);
        appendMessage('system-error', 'Не удалось связаться с сервером чата (' + err.message + '). Пожалуйста, попробуйте позже.');
      } finally {
        isWaitingResponse = false;
        btnModePro.disabled = false;
        btnModeStreet.disabled = false;
        sendBtn.disabled = !chatInput.value.trim();
        if (window.innerWidth > 600) {
          setTimeout(() => chatInput.focus(), 50);
        }
      }
    }

    // Стартовые вопросы под приветствием
    renderQuickChips(PRO_CHIPS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWidget);
  } else {
    mountWidget();
  }
})();
