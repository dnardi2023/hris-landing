// api/generate-brief.js
// Función serverless de Vercel que recibe el input del formulario,
// arma el prompt, llama a la API de Anthropic y devuelve el brief en JSON.
//
// Requiere la variable de entorno ANTHROPIC_API_KEY configurada en Vercel.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido' });
  }

  const { role, seniority, culture, context } = req.body || {};

  if (!role || !seniority || !culture) {
    return res.status(400).json({ success: false, error: 'Faltan campos requeridos (role, seniority, culture)' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'ANTHROPIC_API_KEY no configurada en el servidor' });
  }

  const seniorityLabels = {
    early: 'Early Career (0-3 años)',
    semi: 'Semi-Senior (3-7 años)',
    senior: 'Senior (7+ años)'
  };

  const seniorityLabel = seniorityLabels[seniority] || seniority;

  const prompt = `Sos el asistente de HR Influence Strategy, un estudio especializado en traducir cultura organizacional al idioma de Gen Z y Gen Alpha vía creadores de contenido curados por niche profesional.

El equipo de HR de una empresa cargó este pedido de piloto de atracción de talento:

Rol a cubrir: ${role}
Seniority objetivo: ${seniorityLabel}
Qué queremos comunicar del rol y de la cultura: ${culture}
${context ? 'Contexto o desafío adicional: ' + context : ''}

Generá un brief estructurado y accionable. RESPONDÉ SOLO EN JSON VÁLIDO, sin texto previo ni markdown ni backticks, con esta estructura exacta:

{
  "creatorProfile": {
    "niche": "niche específico del creador, ej: Data Scientist Jr que postea en LinkedIn sobre su día a día",
    "platform": "plataforma principal",
    "style": "estilo de comunicación breve",
    "rationale": "por qué este niche y no un macro-influencer"
  },
  "narrativeAngle": "el ángulo narrativo central en una frase concreta",
  "contentIdeas": [
    {"title": "título pegadizo", "format": "formato concreto", "hook": "gancho de apertura textual"},
    {"title": "...", "format": "...", "hook": "..."},
    {"title": "...", "format": "...", "hook": "..."}
  ],
  "talentKPIs": ["KPI 1", "KPI 2", "KPI 3"],
  "pilotTimeline": {
    "week1": "qué pasa en la semana 1",
    "week2": "semana 2",
    "week3": "semana 3",
    "week4": "semana 4"
  }
}

Reglas críticas:
- Evitá lenguaje de marketing (impresiones, CPM, engagement rate). Usá lenguaje de HR (quality applicants, calidad del pipeline, sentiment cultural, retención temprana, fit cultural).
- El creador recomendado debe ser niche-específico con entre 5.000 y 80.000 seguidores, NO macro-influencer.
- Las ideas de contenido deben ser concretas, observables y distintas entre sí, no genéricas.
- Tomá el mensaje que el equipo quiere comunicar como el ángulo narrativo central, no lo repitas textual en las ideas: traducilo a formatos nativos que generen confianza en la audiencia joven.
- Español rioplatense neutro.`;

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error('Anthropic API error:', errText);
      return res.status(502).json({ success: false, error: 'Error al contactar la API de Anthropic' });
    }

    const data = await anthropicResponse.json();
    const text = (data.content || [])
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('')
      .trim();

    const cleaned = text.replace(/^```json\s*|\s*```$/g, '').trim();

    let brief;
    try {
      brief = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Error parseando JSON:', parseErr, 'Texto recibido:', cleaned);
      return res.status(502).json({ success: false, error: 'La respuesta del modelo no fue un JSON válido' });
    }

    // Opcional: loguear el brief para análisis posterior (se ve en los logs de Vercel)
    console.log('Brief generado para:', role, '| Seniority:', seniority);

    return res.status(200).json({ success: true, brief });
  } catch (err) {
    console.error('Error en generate-brief:', err);
    return res.status(500).json({ success: false, error: err.message || 'Error interno' });
  }
}
