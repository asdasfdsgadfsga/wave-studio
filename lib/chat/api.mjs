/** AI provider service shared by Hono on Pages and local Node.js. */

import { PRO_PROMPT, STREET_PROMPT } from './prompts.mjs';

function cleanPlainReply(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  let lines = rawText.split('\n');
  let resultLines = [];

  for (let line of lines) {
    let trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (/^\|[-:\s|]+\|$/.test(trimmed)) continue;
      let cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => c.trim())
        .filter(c => c.length > 0);
      if (cells.length > 0) {
        resultLines.push(cells.join('. '));
      }
      continue;
    }
    resultLines.push(line);
  }

  let text = resultLines.join('\n');
  text = text.replaceAll('**', '');
  text = text.replace(/^[ \t]*#{1,6}[ \t]+/gm, '');
  text = text.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

export async function handleChat(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  };

  try {
    const { request, env } = context;
    const body = context.input ?? await request.json().catch(() => ({}));
    const { message, history = [], mode = 'pro' } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return new Response(JSON.stringify({ error: 'Поле message обязательно' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const isStreet = mode === 'street' || mode === 'poselok';
    const systemPrompt = isStreet ? STREET_PROMPT : PRO_PROMPT;

    const messages = [{ role: 'system', content: systemPrompt }];
    if (Array.isArray(history)) {
      history.slice(-10).forEach(h => {
        if (h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string') {
          messages.push({ role: h.role, content: h.content.trim() });
        }
      });
    }
    messages.push({ role: 'user', content: message.trim() });

    // 1. Попытка вызова Google Gemini (основной быстрый и мощный провайдер)
    const geminiKey = env?.GEMINI_API_KEY;

    if (geminiKey) {
      const geminiContents = [];
      if (Array.isArray(history)) {
        history.slice(-8).forEach(h => {
          if (h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string') {
            geminiContents.push({
              role: h.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: h.content.trim() }]
            });
          }
        });
      }
      geminiContents.push({
        role: 'user',
        parts: [{ text: message.trim() }]
      });

      const geminiPayload = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: geminiContents,
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 280
        }
      };

      const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];
      for (const gModel of candidateModels) {
        try {
          const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${geminiKey}`;
          const gResp = await fetch(gUrl, {
            method: 'POST',
            signal: AbortSignal.timeout(15000),
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
          });
          if (gResp.ok) {
            const gData = await gResp.json();
            const gText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (gText && gText.trim()) {
              return new Response(JSON.stringify({ reply: cleanPlainReply(gText.trim()), provider: 'gemini' }), {
                status: 200,
                headers: corsHeaders,
              });
            }
          }
        } catch (gErr) {
          console.warn('Gemini provider unavailable');
        }
      }
    }

    // 2. Резервный вызов Groq / OpenAI (если Gemini недоступен)
    const apiKey = env?.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'AI-консультант временно недоступен.' }, { status: 503 });
    }
    const baseUrl = env?.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1';
    const model = env?.OPENAI_MODEL || 'qwen/qwen3.8-27b';

    let groqResp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 380,
      }),
    });

    // При лимите 429 автоматически переключаемся на резервную модель
    if (groqResp.status === 429) {
      groqResp = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: messages,
          temperature: 0.7,
          max_tokens: 380,
        }),
      });
    }

    if (!groqResp.ok) {
      throw new Error('LLM provider unavailable');
    }

    const data = await groqResp.json();
    const rawReply = data.choices?.[0]?.message?.content || 'К сожалению, не удалось получить ответ.';
    const cleanReply = cleanPlainReply(rawReply);

    return new Response(JSON.stringify({ reply: cleanReply, provider: 'groq' }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error('Chat provider request failed');
    return new Response(JSON.stringify({ error: 'AI-консультант временно недоступен. Попробуйте позже.' }), {
      status: 502,
      headers: corsHeaders,
    });
  }
}
