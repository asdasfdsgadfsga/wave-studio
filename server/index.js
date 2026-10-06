const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Загрузка переменных окружения (сначала из server/.env, затем из ../.env)
const envPath = fs.existsSync(path.resolve(__dirname, '.env'))
  ? path.resolve(__dirname, '.env')
  : path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3005;
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || 30000;

// Чтение и выбор системного промпта (режимы: pro / street)
const proPromptPath = process.env.SYSTEM_PROMPT_PATH
  ? path.resolve(__dirname, process.env.SYSTEM_PROMPT_PATH)
  : path.resolve(__dirname, 'system_prompt.txt');

const streetPromptPath = path.resolve(__dirname, 'street_prompt.txt');

function getSystemPrompt(mode = 'pro') {
  const isStreet = mode === 'street' || mode === 'poselok';
  const targetPath = isStreet ? streetPromptPath : proPromptPath;

  try {
    if (fs.existsSync(targetPath)) {
      return fs.readFileSync(targetPath, 'utf8').trim();
    }
    if (fs.existsSync(proPromptPath)) {
      return fs.readFileSync(proPromptPath, 'utf8').trim();
    }
  } catch (err) {
    console.warn(`[WARN] Не удалось прочитать ${targetPath}:`, err.message);
  }

  return 'Ты — AI-саунд-продюсер студии звукозаписи Wave Studio.';
}

// Настройка CORS
const rawAllowedOrigin = process.env.ALLOWED_ORIGIN || '*';
const allowedOrigins = rawAllowedOrigin === '*' ? '*' : rawAllowedOrigin.split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins === '*' || !origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));

// Статическая раздача виджета (чтобы виджет можно было подключить напрямую с сервера)
const widgetDir = path.resolve(__dirname, '../widget');
if (fs.existsSync(widgetDir)) {
  app.use('/widget', express.static(widgetDir));
  app.get('/chat-widget.js', (req, res) => {
    res.sendFile(path.join(widgetDir, 'chat-widget.js'));
  });
  app.get('/widget.css', (req, res) => {
    res.sendFile(path.join(widgetDir, 'widget.css'));
  });
}

// Инициализация клиента OpenAI / OpenRouter / DeepSeek
const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const temperature = parseFloat(process.env.TEMPERATURE) || 0.7;
const maxTokens = parseInt(process.env.MAX_TOKENS, 10) || 380;

let openai = null;
if (apiKey && apiKey !== 'your_api_key_here') {
  openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL
  });
}

// Эндпоинт проверки здоровья сервиса
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    llmConfigured: Boolean(openai),
    model: modelName,
    baseURL: baseURL,
    uptime: process.uptime()
  });
});

// Вызов Google Gemini API
async function callGemini(geminiKey, systemInstruction, history, userMessage) {
  const geminiContents = [];
  if (Array.isArray(history)) {
    history.slice(-8).forEach(h => {
      if (h && typeof h.content === 'string') {
        geminiContents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content.trim() }]
        });
      }
    });
  }
  geminiContents.push({
    role: 'user',
    parts: [{ text: userMessage.trim() }]
  });

  const payload = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: geminiContents,
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: 280
    }
  };

  const models = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];
  for (const m of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          return { reply: text.trim(), model: m };
        }
      }
    } catch (e) {
      console.warn(`[Gemini local ${m} warn]:`, e.message);
    }
  }
  return null;
}

// Функция очистки ответа от markdown-таблиц, звёздочек жирного шрифта и решёток
function cleanPlainReply(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  const lines = rawText.split('\n');
  const cleanedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // 1. Пропускаем разделители таблиц: |---|---|:---:|
    if (/^\|[-:\s|]+\|$/.test(trimmed)) {
      continue;
    }

    // 2. Преобразуем строки таблиц | col1 | col2 | в понятный текст
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => c.trim())
        .filter(Boolean);

      if (cells.length > 0) {
        cleanedLines.push('• ' + cells.join(' — '));
        continue;
      }
    }

    cleanedLines.push(lines[i]);
  }

  let text = cleanedLines.join('\n');

  // 3. Убираем markdown-заголовки с решётками (### Заголовок -> Заголовок)
  text = text.replace(/^#{1,6}\s+/gm, '');

  // 4. Убираем горизонтальные линии маркдауна (---, ___)
  text = text.replace(/^[-*_]{3,}\s*$/gm, '');

  // 5. Убираем звёздочки жирного шрифта и курсива (**слово** -> слово)
  text = text.replaceAll('**', '');
  text = text.replace(/(^|\s)\*([^\*\n]+)\*(\s|$)/g, '');

  // 6. Схлопываем лишние пустые строки (не более двух подряд)
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

// Основной эндпоинт чата
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, mode } = req.body;

    // 1. Валидация входных данных
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Поле "message" обязательно и не может быть пустым.' });
    }

    if (message.length > 2500) {
      return res.status(400).json({ error: 'Длина сообщения превышает допустимый лимит (2500 символов).' });
    }

    // 2. Валидация и фильтрация истории сообщений (сохранение контекста)
    const validHistory = [];
    if (Array.isArray(history)) {
      // Ограничиваем историю последними 10 сообщениями для контроля токенов
      const recentHistory = history.slice(-10);
      for (const item of recentHistory) {
        if (item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string') {
          validHistory.push({
            role: item.role,
            content: String(item.content).slice(0, 3000)
          });
        }
      }
    }

    // 3. Проверка настройки API-ключа
    if (!openai) {
      return res.status(503).json({
        error: 'Сервер чат-бота запущен, но API-ключ LLM не настроен в .env файле.',
        hint: 'Укажите OPENAI_API_KEY в файле .env для включения генерации ответов.'
      });
    }

    // 4. Сборка контекста диалога
    const systemInstruction = getSystemPrompt(mode);

    // 4.1 Проверяем наличие ключа Google Gemini (приоритетный движок)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const geminiResult = await callGemini(geminiKey, systemInstruction, validHistory, message);
        if (geminiResult && geminiResult.reply) {
          return res.json({
            reply: cleanPlainReply(geminiResult.reply),
            model: geminiResult.model,
            provider: 'gemini'
          });
        }
      } catch (geminiErr) {
        console.warn('[Gemini Error, falling back to OpenAI/Groq]:', geminiErr.message);
      }
    }

    const messages = [
      { role: 'system', content: systemInstruction },
      ...validHistory,
      { role: 'user', content: message.trim() }
    ];

    // 5. Вызов LLM с таймаутом
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const completion = await openai.chat.completions.create(
        {
          model: modelName,
          messages: messages,
          temperature: temperature,
          max_tokens: maxTokens
        },
        {
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      const replyContent = completion.choices?.[0]?.message?.content;
      if (!replyContent) {
        throw new Error('Пустой ответ от LLM провайдера');
      }

      return res.json({
        reply: cleanPlainReply(replyContent),
        model: completion.model || modelName,
        usage: completion.usage || null
      });

    } catch (llmError) {
      clearTimeout(timeoutId);

      // Обработка таймаута
      if (llmError.name === 'AbortError' || controller.signal.aborted) {
        console.error('[TIMEOUT] Превышено время ожидания ответа от LLM');
        return res.status(504).json({ error: 'Превышено время ожидания ответа от языковой модели.' });
      }

      // Обработка типичных ошибок API
      if (llmError.status === 401) {
        console.error('[AUTH ERROR] Недействительный API ключ');
        return res.status(401).json({ error: 'Ошибка авторизации API: проверьте правильность OPENAI_API_KEY и соответствие OPENAI_BASE_URL провайдеру.' });
      }

      if (llmError.status === 402 || (llmError.message && llmError.message.includes('Insufficient Balance'))) {
        console.error('[BALANCE ERROR] На аккаунте LLM закончились средства');
        return res.status(402).json({ 
          error: 'На аккаунте LLM закончился баланс (Insufficient Balance). Пополните баланс на сайте провайдера или укажите бесплатный ключ Groq / OpenRouter.' 
        });
      }

      if (llmError.status === 429) {
        console.error('[RATE LIMIT] Превышен лимит запросов LLM');
        return res.status(429).json({ error: 'Превышен лимит запросов к AI провайдеру. Пожалуйста, повторите попытку чуть позже.' });
      }

      console.error('[LLM ERROR]:', llmError.message);
      return res.status(502).json({
        error: 'Ошибка при взаимодействии с языковой моделью.',
        details: llmError.message
      });
    }

  } catch (err) {
    console.error('[SERVER ERROR]:', err);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера чат-бота.' });
  }
});

// Запуск сервера
const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🤖 AI Chatbot Service успешно запущен на порту ${PORT}`);
  console.log(`📡 URL API: http://localhost:${PORT}/api/chat`);
  console.log(`🩺 Health:  http://localhost:${PORT}/api/health`);
  console.log(`📦 Виджет:  http://localhost:${PORT}/chat-widget.js`);
  console.log(`⚙️  Модель:  ${modelName} (${baseURL})`);
  console.log(`===============================================`);
});

module.exports = { app, server };
