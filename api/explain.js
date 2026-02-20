export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { type, rashiHe, rashiEn, pasukHe, pasukEn, parasha, aliyah, instruction } = req.body;
  
  const clean = (s) => {
    if (!s) return '';
    if (typeof s !== 'string') s = String(s);
    return s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
  };
  const cPasukHe = clean(pasukHe);
  const cPasukEn = clean(pasukEn);
  const cRashiHe = clean(rashiHe);
  const cRashiEn = clean(rashiEn);

  const systemPrompt = `You are a Torah tutor for a frum Yid doing his weekly Maavara Sedra.

CRITICAL RULES:
- Be CONCISE. 2-4 sentences max unless asked for depth.
- When you reference Hebrew terms (Hashem, Mishkan, korban, etc), ALWAYS write them in Hebrew with nekudos. Examples: הַקָּדוֹשׁ בָּרוּךְ הוּא instead of "Hakadosh Baruch Hu", מִשְׁכָּן instead of "Mishkan", הַשֵּׁם instead of "Hashem", מֹשֶׁה רַבֵּנוּ instead of "Moshe Rabbeinu", בְּנֵי יִשְׂרָאֵל instead of "Bnei Yisroel", קָרְבָּן instead of "korban"
- Write in English but embed Hebrew words in nekudos naturally
- Don't repeat the Rashi Hebrew text back — the user already sees it
- Don't add introductions or sign-offs
- Get straight to the point`;

  let userMsg = '';
  let maxTokens = 250;
  
  if (type === 'explain_pasuk') {
    userMsg = `Parshas ${parasha}, ${aliyah}.\nPasuk: ${cPasukHe}\nMeaning: ${cPasukEn}\n\nExplain what's happening in this pasuk in 2-3 sentences. Straight to the point.`;
    maxTokens = 200;
  } else if (type === 'review_aliyah') {
    userMsg = `Parshas ${parasha}, ${aliyah}.\n\nText: ${cPasukEn}\n\n${instruction || 'Summarize this aliyah in 4-5 sentences. What happened, key themes, one interesting point.'}`;
    maxTokens = 350;
  } else if (type === 'whats_the_question') {
    userMsg = `Parshas ${parasha}, ${aliyah}.\nPasuk: ${cPasukEn}\nRashi: ${cRashiHe}\n\nIn 2-3 sentences: What BOTHERED Rashi in the pasuk? What's the textual difficulty he noticed? Then what's his answer? Focus on the QUESTION — what made Rashi feel he needed to comment here.`;
    maxTokens = 250;
  } else if (type === 'explain_simply') {
    userMsg = `Parshas ${parasha}, ${aliyah}.\nPasuk: ${cPasukEn}\nRashi: ${cRashiHe}${cRashiEn ? '\nTranslation: ' + cRashiEn : ''}\n\nIn 2-3 sentences: What is Rashi saying here? Give me the bottom line simply. No need to explain what bothered him — just what his explanation IS.`;
    maxTokens = 200;
  } else if (type === 'deeper') {
    userMsg = `Parshas ${parasha}, ${aliyah}.\nPasuk: ${cPasukEn}\nRashi: ${cRashiHe}${cRashiEn ? '\nTranslation: ' + cRashiEn : ''}\n\nGo deeper: What Torah principle is at play? Are there other meforshim who disagree? Any halachic or hashkafic implications? 4-6 sentences.`;
    maxTokens = 400;
  } else if (type === 'weekly_summary') {
    userMsg = `Parshas ${parasha}. Brief 2-3 sentence summary of the parasha's key themes.`;
    maxTokens = 200;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Claude API error:', JSON.stringify(data));
      return res.status(200).json({ text: `API error: ${data.error?.message || JSON.stringify(data)}` });
    }
    const text = data.content?.[0]?.text || 'Could not generate explanation.';
    res.status(200).json({ text });
  } catch (err) {
    console.error('AI error:', err);
    res.status(500).json({ error: 'AI request failed' });
  }
}
