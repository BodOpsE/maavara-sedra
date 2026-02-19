export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { type, rashiHe, rashiEn, pasukHe, pasukEn, parasha, aliyah, instruction } = req.body;

  const systemPrompt = `You are a warm, patient Torah tutor helping a frum Yid with his weekly Maavara Sedra (Shnayim Mikra V'Echad Targum). 

Guidelines:
- Explain in simple, clear English
- Use frum terminology: Hashem (not God), Moshe Rabbeinu, Bnei Yisroel, klal Yisroel, etc.
- For Rashi questions: start by identifying WHAT BOTHERED RASHI — what question is he answering?
- Then explain Rashi's answer simply
- Use relatable analogies when helpful
- Refer to the student's parasha context when relevant
- Keep explanations concise and conversational
- Never be condescending
- When quoting Hebrew, keep it brief and relevant`;

  let userMsg = '';
  
  if (type === 'explain_pasuk') {
    userMsg = `Parashat ${parasha}, Aliyah ${aliyah}.\n\nPasuk (Hebrew): ${pasukHe}\nPasuk (English): ${pasukEn}\n\n${instruction || 'Explain this pasuk simply in 2-3 sentences.'}`;
  } else if (type === 'review_aliyah') {
    userMsg = `Parashat ${parasha}, Aliyah ${aliyah}.\n\nFull text: ${pasukEn}\n\n${instruction || 'Summarize this aliyah in 4-6 sentences.'}`;
  } else if (type === 'whats_the_question') {
    userMsg = `The student is learning Parashat ${parasha}, Aliyah ${aliyah}.\n\nPasuk (Hebrew): ${pasukHe}\nPasuk (English): ${pasukEn}\n\nRashi (Hebrew): ${rashiHe}\nRashi (English): ${rashiEn || 'No English translation available'}\n\nExplain: What bothered Rashi in this pasuk? What's his question, and what's his answer? Keep it simple and clear — this is for a beginner.`;
  } else if (type === 'explain_simply') {
    userMsg = `The student is learning Parashat ${parasha}, Aliyah ${aliyah}.\n\nRashi (Hebrew): ${rashiHe}\nRashi (English): ${rashiEn || 'No English translation available'}\n\nOn this pasuk:\nHebrew: ${pasukHe}\nEnglish: ${pasukEn}\n\nGive a simple, clear explanation of what Rashi is saying here. Assume the student is a beginner.`;
  } else if (type === 'deeper') {
    userMsg = `The student wants to go deeper on this Rashi from Parashat ${parasha}, Aliyah ${aliyah}.\n\nPasuk: ${pasukHe} — ${pasukEn}\nRashi: ${rashiHe} — ${rashiEn || ''}\n\nGive a more in-depth explanation. What's the underlying Torah principle? Are there other opinions? How does this connect to the broader sugya or halachic implications? Still keep it accessible for a motivated beginner.`;
  } else if (type === 'weekly_summary') {
    userMsg = `The student just finished (or is finishing) Parashat ${parasha} for their weekly Maavara Sedra.\n\nGive a brief, encouraging 2-3 sentence summary of the key themes of this parasha and one interesting Rashi to look out for. Be warm and motivating.`;
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
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || 'Could not generate explanation.';
    res.status(200).json({ text });
  } catch (err) {
    console.error('AI error:', err);
    res.status(500).json({ error: 'AI request failed' });
  }
}
