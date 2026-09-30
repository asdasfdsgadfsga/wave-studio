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
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    /* --- ПЛАВАЮЩАЯ КНОПКА (ЛЕВЫЙ НИЖНИЙ УГОЛ) --- */
    .chat-launcher-btn {
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 999999;
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(38, 9, 74, 0.94) 0%, rgba(18, 4, 36, 0.98) 100%);
      border: 1px solid rgba(199, 125, 255, 0.35);
      outline: none;
      cursor: pointer;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.65), 
                  0 0 25px rgba(157, 78, 221, 0.28), 
                  inset 0 1px 1px rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), 
                  box-shadow 0.28s ease, 
                  border-color 0.28s ease;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    .chat-launcher-btn::before {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(199, 125, 255, 0.35) 0%, transparent 70%);
      z-index: -1;
      animation: launcherAura 3.2s infinite ease-in-out;
      pointer-events: none;
    }

    @keyframes launcherAura {
      0%, 100% { transform: scale(1); opacity: 0.35; }
      50% { transform: scale(1.22); opacity: 0.8; }
    }

    .chat-launcher-btn:hover {
      transform: scale(1.08) translateY(-2px);
      border-color: rgba(199, 125, 255, 0.6);
      box-shadow: 0 14px 35px rgba(0, 0, 0, 0.75), 
                  0 0 35px rgba(199, 125, 255, 0.45), 
                  inset 0 1px 2px rgba(255, 255, 255, 0.3);
    }

    .chat-launcher-btn:active {
      transform: scale(0.95);
    }

    .wave-bars {
      display: flex;
      align-items: center;
      gap: 3px;
      height: 22px;
      transition: transform 0.25s ease;
    }

    .wave-bar {
      width: 3.5px;
      background: linear-gradient(180deg, #ffffff 0%, #c77dff 100%);
      border-radius: 2px;
      box-shadow: 0 0 6px rgba(199, 125, 255, 0.8);
      animation: waveBounce 1.4s infinite ease-in-out alternate;
    }

    .wave-bar:nth-child(1) { height: 10px; animation-delay: 0.1s; }
    .wave-bar:nth-child(2) { height: 18px; animation-delay: 0.3s; }
    .wave-bar:nth-child(3) { height: 22px; animation-delay: 0.0s; }
    .wave-bar:nth-child(4) { height: 15px; animation-delay: 0.4s; }
    .wave-bar:nth-child(5) { height: 8px;  animation-delay: 0.2s; }

    @keyframes waveBounce {
      0% { transform: scaleY(0.4); opacity: 0.6; }
      100% { transform: scaleY(1.05); opacity: 1; }
    }

    .icon-close { 
      display: none; 
      width: 22px; 
      height: 22px; 
      fill: #ffffff;
      transition: transform 0.25s ease;
    }

    .chat-launcher-btn.is-open .wave-bars { display: none; }
    .chat-launcher-btn.is-open .icon-close { 
      display: block; 
      transform: rotate(90deg);
    }

    .launcher-badge {
      position: absolute;
      top: 1px;
      right: 1px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #10b981;
      border: 2px solid #120424;
      box-shadow: 0 0 8px #10b981;
    }

    .launcher-tooltip {
      position: absolute;
      left: 70px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(18, 10, 32, 0.92);
      border: 1px solid rgba(199, 125, 255, 0.25);
      border-radius: 20px;
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: #e0aaff;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.5), 0 0 15px rgba(157, 78, 221, 0.2);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.25s ease, transform 0.25s ease, visibility 0.25s;
    }

    .chat-launcher-btn:hover .launcher-tooltip {
      opacity: 1;
      visibility: visible;
      transform: translateY(-50%) translateX(4px);
    }

    /* --- ОКНО ДИАЛОГА --- */
    .chat-window {
      position: fixed;
      bottom: 96px;
      left: 24px;
      z-index: 999999;
      width: 395px;
      max-width: calc(100vw - 48px);
      height: 575px;
      max-height: calc(100vh - 120px);
      background: rgba(13, 7, 23, 0.92);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1px solid rgba(199, 125, 255, 0.22);
      border-radius: 22px;
      box-shadow: 0 25px 65px rgba(0, 0, 0, 0.85), 
                  0 0 40px rgba(121, 40, 202, 0.18),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      visibility: hidden;
      transform: translateY(18px) scale(0.96);
      transform-origin: bottom left;
      transition: opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1), 
                  transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), 
                  visibility 0.28s;
      color-scheme: dark;
    }

    .chat-window::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent 5%, rgba(199, 125, 255, 0.45) 50%, transparent 95%);
      z-index: 10;
      pointer-events: none;
    }

    .chat-window.is-open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }

    /* Шапка диалога (двухуровневая: текст свободен и не перекрывается тумблером) */
    .chat-header {
      padding: 14px 16px 12px 16px;
      background: linear-gradient(180deg, rgba(28, 9, 56, 0.85) 0%, rgba(18, 6, 36, 0.7) 100%);
      border-bottom: 1px solid rgba(199, 125, 255, 0.12);
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 2;
      gap: 10px;
    }

    .chat-header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 10px;
    }

    .chat-header-info {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }

    .chat-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(123, 44, 191, 0.45) 0%, rgba(58, 16, 120, 0.75) 100%);
      border: 1px solid rgba(199, 125, 255, 0.35);
      box-shadow: 0 0 16px rgba(157, 78, 221, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      flex-shrink: 0;
      transition: all 0.3s ease;
    }

    .chat-header-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }

    .chat-name {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.4px;
      background: linear-gradient(90deg, #ffffff 0%, #e0aaff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chat-status {
      font-size: 11px;
      color: #10b981;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
      font-weight: 500;
      white-space: nowrap;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
      animation: pulseDot 2s infinite;
    }

    @keyframes pulseDot {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }

    .chat-close-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #c77dff;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }

    .chat-close-btn:hover {
      background: rgba(199, 125, 255, 0.2);
      border-color: rgba(199, 125, 255, 0.4);
      color: #ffffff;
      transform: scale(1.05);
    }

    /* Нижняя строка шапки: Переключатель характера (Pro / Вась) */
    .chat-header-mode-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding-top: 8px;
      border-top: 1px solid rgba(199, 125, 255, 0.1);
      gap: 8px;
    }

    .mode-bar-label {
      font-size: 11px;
      font-weight: 500;
      color: rgba(224, 170, 255, 0.6);
      letter-spacing: 0.3px;
      white-space: nowrap;
    }

    .persona-switcher {
      display: inline-flex;
      background: rgba(14, 6, 26, 0.85);
      border: 1px solid rgba(199, 125, 255, 0.25);
      border-radius: 20px;
      padding: 2px;
      gap: 2px;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
    }

    .persona-btn {
      background: transparent;
      border: none;
      outline: none;
      color: rgba(224, 170, 255, 0.65);
      font-size: 11px;
      font-weight: 600;
      padding: 5px 12px;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      gap: 6px;
      user-select: none;
      white-space: nowrap;
    }

    .persona-btn svg {
      flex-shrink: 0;
    }

    .persona-btn:hover:not(.active) {
      color: #ffffff;
      background: rgba(199, 125, 255, 0.15);
    }

    .persona-btn.active {
      background: linear-gradient(135deg, #7b2cbf 0%, #9d4edd 100%);
      color: #ffffff;
      box-shadow: 0 0 12px rgba(157, 78, 221, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25);
    }

    /* Лента сообщений */
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scroll-behavior: smooth;
    }

    .chat-messages::-webkit-scrollbar {
      width: 5px;
    }
    .chat-messages::-webkit-scrollbar-thumb {
      background: rgba(199, 125, 255, 0.2);
      border-radius: 4px;
    }
    .chat-messages::-webkit-scrollbar-thumb:hover {
      background: rgba(199, 125, 255, 0.4);
    }

    .message-bubble {
      max-width: 86%;
      padding: 12px 15px;
      font-size: 13.5px;
      line-height: 1.55;
      border-radius: 18px;
      word-wrap: break-word;
      white-space: pre-wrap;
      animation: bubbleIn 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes bubbleIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message-bubble.assistant {
      align-self: flex-start;
      background: rgba(26, 16, 44, 0.75);
      border: 1px solid rgba(199, 125, 255, 0.16);
      color: #ededfa;
      border-bottom-left-radius: 4px;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
    }

    .message-bubble.user {
      align-self: flex-end;
      background: linear-gradient(135deg, #7b2cbf 0%, #5a189a 100%);
      border: 1px solid rgba(199, 125, 255, 0.28);
      color: #ffffff;
      border-bottom-right-radius: 4px;
      box-shadow: 0 4px 18px rgba(90, 24, 154, 0.35);
    }

    .message-bubble.system-note {
      align-self: center;
      background: rgba(157, 78, 221, 0.14);
      border: 1px solid rgba(199, 125, 255, 0.25);
      color: #e0aaff;
      font-size: 11.5px;
      text-align: center;
      max-width: 92%;
      padding: 6px 14px;
      border-radius: 14px;
    }

    .message-bubble.system-error {
      align-self: center;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      font-size: 12px;
      text-align: center;
      max-width: 90%;
    }

    .message-time {
      font-size: 10px;
      color: rgba(224, 170, 255, 0.55);
      margin-top: 5px;
      text-align: right;
      letter-spacing: 0.3px;
    }

    /* Блок быстрых подсказок (Chips) */
    .quick-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-top: 10px;
      margin-bottom: 4px;
    }

    .quick-chip {
      background: rgba(157, 78, 221, 0.12);
      border: 1px solid rgba(199, 125, 255, 0.22);
      color: #e0aaff;
      border-radius: 16px;
      padding: 6px 12px;
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.22s ease;
      user-select: none;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .quick-chip svg {
      flex-shrink: 0;
      color: #c77dff;
      transition: color 0.2s ease;
    }

    .quick-chip:hover {
      background: rgba(157, 78, 221, 0.28);
      border-color: #c77dff;
      color: #ffffff;
      box-shadow: 0 0 12px rgba(199, 125, 255, 0.35);
      transform: translateY(-1px);
    }

    .quick-chip:hover svg {
      color: #ffffff;
    }

    .quick-chip:active {
      transform: translateY(0);
    }

    /* Индикатор набора (Typing indicator) */
    .typing-box {
      align-self: flex-start;
      padding: 10px 14px;
      background: rgba(26, 16, 44, 0.75);
      border: 1px solid rgba(199, 125, 255, 0.16);
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      display: flex;
      align-items: center;
      gap: 5px;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
    }

    .typing-dot {
      width: 6px;
      height: 6px;
      background: #c77dff;
      border-radius: 50%;
      animation: bounceDot 1.4s infinite ease-in-out both;
    }
    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes bounceDot {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.35; }
      40% { transform: scale(1.2); opacity: 1; }
    }

    /* Поле ввода сообщения */
    .chat-footer {
      padding: 12px 14px;
      background: rgba(16, 7, 32, 0.98);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-top: 1px solid rgba(199, 125, 255, 0.22);
      box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: flex-end;
      gap: 10px;
      position: relative;
      z-index: 10;
      flex-shrink: 0;
    }

    .chat-input-box {
      flex: 1;
      background: rgba(40, 20, 72, 0.85);
      border: 1.5px solid rgba(199, 125, 255, 0.45);
      border-radius: 20px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      transition: all 0.22s ease;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.25);
    }

    .chat-input-box:hover {
      border-color: rgba(199, 125, 255, 0.7);
      background: rgba(48, 24, 86, 0.92);
    }

    .chat-input-box:focus-within {
      border-color: #c77dff;
      background: rgba(52, 26, 92, 0.98);
      box-shadow: 0 0 18px rgba(199, 125, 255, 0.38), inset 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    .chat-input {
      width: 100%;
      background: transparent;
      border: none;
      outline: none;
      color: #ffffff;
      font-size: 14.5px;
      line-height: 1.45;
      resize: none;
      max-height: 90px;
      min-height: 22px;
    }

    .chat-input::placeholder {
      color: rgba(235, 215, 255, 0.82);
      font-size: 13.5px;
      font-weight: 400;
    }

    .chat-send-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #8a2be2 0%, #a855f7 100%);
      border: 1.5px solid rgba(220, 180, 255, 0.6);
      outline: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      flex-shrink: 0;
      box-shadow: 0 0 18px rgba(168, 85, 247, 0.5);
      transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
    }

    .chat-send-btn:hover:not(:disabled) {
      transform: scale(1.08);
      box-shadow: 0 0 24px rgba(199, 125, 255, 0.7);
    }

    .chat-send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      box-shadow: none;
      border-color: rgba(199, 125, 255, 0.25);
      background: rgba(90, 40, 140, 0.4);
    }

    .chat-send-btn svg {
      width: 17px;
      height: 17px;
      fill: #ffffff;
      transform: translateX(1px);
    }

    /* Мобильная адаптивность (< 600px) */
    @media (max-width: 600px) {
      .chat-launcher-btn {
        bottom: 18px;
        left: 18px;
        width: 52px;
        height: 52px;
      }
      .chat-window {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        width: 100vw;
        height: 100%;
        height: 100vh;
        height: 100dvh;
        max-width: 100%;
        max-height: 100dvh;
        border-radius: 0;
        border: none;
      }
      .chat-header {
        padding-top: max(16px, env(safe-area-inset-top, 16px));
      }
      .chat-footer {
        padding-left: 12px;
        padding-right: 12px;
        padding-top: 10px;
        padding-bottom: max(14px, calc(10px + env(safe-area-inset-bottom, 14px)));
      }
      .chat-input {
        font-size: 16px; /* Предотвращает авто-зум на iOS Safari */
      }
    }
  `;

  // HTML структура виджета
  const widgetHtml = `
    <button class="chat-launcher-btn" id="launcher-btn" aria-label="Открыть AI-чат Wave Studio" title="AI Саунд-продюсер онлайн">
      <span class="launcher-badge"></span>
      <span class="launcher-tooltip" id="launcher-tooltip">AI САУНД-ПРОДЮСЕР</span>
      
      <div class="wave-bars">
        <span class="wave-bar"></span>
        <span class="wave-bar"></span>
        <span class="wave-bar"></span>
        <span class="wave-bar"></span>
        <span class="wave-bar"></span>
      </div>

      <svg class="icon-close" viewBox="0 0 24 24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>

    <div class="chat-window" id="chat-window">
      <!-- Шапка диалога (двухуровневая) -->
      <div class="chat-header">
        <div class="chat-header-top">
          <div class="chat-header-info">
            <div class="chat-avatar" id="chat-avatar">
              ${ICONS.note}
            </div>
            <div class="chat-header-text">
              <span class="chat-name" id="chat-name">WAVE AI PRODUCER</span>
              <span class="chat-status" id="chat-status">
                <span class="status-dot"></span>
                <span id="chat-status-text">Саунд-продюсер онлайн</span>
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
          <span class="mode-bar-label">Режим:</span>
          <div class="persona-switcher" id="persona-switcher" title="Сменить характер общения">
            <button type="button" class="persona-btn active" data-mode="pro" id="btn-mode-pro">
              ${ICONS.headphones}
              <span>Pro</span>
            </button>
            <button type="button" class="persona-btn" data-mode="street" id="btn-mode-street">
              ${ICONS.streetCap}
              <span>Вась</span>
            </button>
          </div>
        </div>
      </div>

      <div class="chat-messages" id="messages-container"></div>

      <div class="chat-footer">
        <div class="chat-input-box">
          <textarea 
            class="chat-input" 
            id="chat-input" 
            placeholder="Спросите о сведении, битах, 808..." 
            rows="1"
          ></textarea>
        </div>
        <button class="chat-send-btn" id="send-btn" aria-label="Отправить сообщение" disabled>
          <svg viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
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
    const launcherTooltip = shadowRoot.getElementById('launcher-tooltip');
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
      currentMode = newMode;

      if (currentMode === 'street') {
        btnModeStreet.classList.add('active');
        btnModePro.classList.remove('active');
        if (chatAvatar) chatAvatar.innerHTML = ICONS.cap;
        chatName.textContent = 'ВАСЯ ПО ПОНЯТИЯМ';
        if (chatStatusText) {
          chatStatusText.textContent = 'Пацан с посёлка онлайн';
        }
        launcherTooltip.textContent = 'ВАСЯ (ПО ПОНЯТИЯМ)';
        chatInput.placeholder = 'Слышь, вась, чё по битам?...';

        appendMessage('system-note', 'Включён режим: «Пацан с посёлка» (TikTok meme). Базарим по понятиям, вась!');
        appendMessage('assistant', 'Слышь, вась, здорово, бля! Раскидаю за любой бит, 808-й бас и сведение чисто по понятиям, нахуй. Чё интересует, ёпта?');
        renderQuickChips(STREET_CHIPS);
      } else {
        btnModePro.classList.add('active');
        btnModeStreet.classList.remove('active');
        if (chatAvatar) chatAvatar.innerHTML = ICONS.note;
        chatName.textContent = 'WAVE AI PRODUCER';
        if (chatStatusText) {
          chatStatusText.textContent = 'Саунд-продюсер онлайн';
        }
        launcherTooltip.textContent = 'AI САУНД-ПРОДЮСЕР';
        chatInput.placeholder = 'Спросите о сведении, битах, 808...';

        appendMessage('system-note', 'Включён режим: «Студийный саунд-продюсер Wave Studio».');
        appendMessage('assistant', 'Включен профессиональный студийный режим. Готов разобрать структуру трека, сведение, 808-й бас или работу в онлайн Web DAW.');
        renderQuickChips(PRO_CHIPS);
      }
    }

    btnModePro.addEventListener('click', () => setPersonaMode('pro'));
    btnModeStreet.addEventListener('click', () => setPersonaMode('street'));

    function toggleChat(forceState) {
      isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
      launcherBtn.classList.toggle('is-open', isOpen);
      chatWindow.classList.toggle('is-open', isOpen);

      if (isOpen) {
        if (window.innerWidth > 600) {
          setTimeout(() => chatInput.focus(), 250);
        }
        if (window.visualViewport && window.innerWidth <= 600) {
          chatWindow.style.height = `${window.visualViewport.height}px`;
        }
        scrollToBottom();
      } else {
        chatWindow.style.height = '';
      }
    }

    // Поддержка виртуальной клавиатуры и динамического вьюпорта на смартфонах (iOS / Android)
    if (window.visualViewport) {
      const handleViewportChange = () => {
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
      if (e.key === 'Enter' && !e.shiftKey) {
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
        sendBtn.disabled = !chatInput.value.trim();
        if (window.innerWidth > 600) {
          setTimeout(() => chatInput.focus(), 50);
        }
      }
    }

    // Приветственное сообщение
    appendMessage(
      'assistant',
      'Салют! Я AI-саунд-продюсер студии Wave Studio. Помогу с битмейкингом, плотным 808-м басом, сведением вокала, микрофонами или подскажу, как пользоваться нашей бесплатной онлайн Web DAW прямо в браузере. Вы можете переключить мой характер на поселкового пацана кнопкой «Вась» в шапке чата!'
    );
    renderQuickChips(PRO_CHIPS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWidget);
  } else {
    mountWidget();
  }
})();
