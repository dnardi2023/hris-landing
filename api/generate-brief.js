// api/generate-brief.js
// Función serverless de Vercel que recibe el input del formulario,
// arma el prompt, llama a la API de Anthropic y devuelve, en JSON:
//   1) el MATCH: qué creador de nuestra red ficticia comunica mejor la búsqueda
//   2) el BRIEF: ángulo narrativo, ideas de contenido, KPIs y cronograma del piloto
//
// Requiere la variable de entorno ANTHROPIC_API_KEY configurada en Vercel.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido' });
  }

  const { role, seniority, culture, context, audience } = req.body || {};

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

  // ── Red de creadores (perfiles ficticios del MVP) ────────────────────────────
  // Claude debe elegir EXACTAMENTE UNO de estos tres para cada búsqueda.
  const roster = `
PERFIL A — id "farma"
Nombre: Rocío Belén Álvarez (@rochi.enlaindustria)
Plataforma: Instagram + LinkedIn · ~34.000 seguidores
Nicho: industria farmacéutica y laboratorios — control de calidad, asuntos regulatorios, buenas prácticas de manufactura y día a día en planta.
Audiencia: estudiantes y jóvenes profesionales de farmacia, bioquímica, biotecnología y química.
Ideal para: búsquedas en laboratorios e industria farma/biotech, calidad, regulatorio, producción farmacéutica.

PERFIL B — id "tecnico"
Nombre: Tobías "el Nato" Ferreyra (@nato.entaller)
Plataforma: Instagram + TikTok · ~58.000 seguidores
Nicho: oficios técnicos, mecánica industrial y automotriz, mantenimiento — muestra el trabajo real en taller y planta, herramientas y resolución de problemas.
Audiencia: jóvenes técnicos, estudiantes de escuelas técnicas, mecánicos, mantenimiento industrial y operarios calificados.
Ideal para: búsquedas técnicas e industriales, mantenimiento, mecánica, producción y perfiles de escuela técnica.

PERFIL C — id "generalista"
Nombre: Melina "Meli" Sosa (@meli.primertrabajo)
Plataforma: Instagram + TikTok · ~26.000 seguidores
Nicho: primer empleo y vida de oficina — roles administrativos y analista junior, entrevistas, onboarding y cómo es trabajar en una PyME.
Audiencia: Gen Z buscando su primer trabajo formal, perfiles administrativos y analistas junior, recién recibidos.
Ideal para: búsquedas administrativas, analista junior, atención al cliente, primer empleo y PyMEs.
`;

  const audienceNote = audience === 'agency'
    ? 'Quien carga el brief es una agencia o consultora de RRHH que atiende a varias empresas cliente. Hablale como socio experto que le va a permitir ofrecer este servicio a sus propios clientes.'
    : 'Quien carga el brief es un área interna de Recursos Humanos / Talent Acquisition de una empresa.';

  const prompt = `Sos el asistente de HR Influence Strategy, un estudio especializado en traducir aquello que una empresa necesita comunicar a la voz de creadores de contenido con credibilidad genuina entre el talento joven (Gen Z), curados por niche profesional y NO por cantidad de seguidores.

${audienceNote}

Cargaron esta búsqueda para el servicio "Atracción con Influencia":

Rol a cubrir: ${role}
Seniority objetivo: ${seniorityLabel}
Qué queremos comunicar del rol y de la cultura: ${culture}
${context ? 'Contexto o desafío adicional: ' + context : ''}

PASO 1 — MATCH. Revisá nuestra red de creadores y decidí si alguno comunica bien esta búsqueda:
${roster}

PASO 2 — BRIEF. Generá un brief estructurado y accionable alrededor de ese creador.

RESPONDÉ SOLO EN JSON VÁLIDO, sin texto previo ni markdown ni backticks, con esta estructura exacta:

{
  "influencerMatch": {
    "id": "farma | tecnico | generalista | a_curar",
    "lead": "Si elegiste un creador de la red: 'El creador que seleccionamos para comunicar esto es'. Si el id es a_curar: 'Esta búsqueda pide una voz que todavía no está en nuestra red. Este es el perfil que saldríamos a curar'",
    "name": "nombre y apellido del creador elegido, tal como figura en la red",
    "handle": "@handle tal como figura en la red",
    "platform": "plataforma tal como figura en la red",
    "followers": "seguidores tal como figuran en la red",
    "niche": "nicho del creador en una frase",
    "audience": "a quién llega, en una frase",
    "whyMatch": "2 a 3 frases, en lenguaje de HR, explicando por qué ESTE creador comunica mejor ESTA búsqueda: conexión entre su audiencia y el perfil buscado, y por qué genera confianza donde un aviso corporativo no lo lograría"
  },
  "narrativeAngle": "el ángulo narrativo central en una frase concreta, pensado para la voz de ese creador",
  "contentIdeas": [
    {"title": "título pegadizo", "format": "formato concreto y nativo de la plataforma", "hook": "gancho de apertura textual, en la voz del creador"},
    {"title": "...", "format": "...", "hook": "..."},
    {"title": "...", "format": "...", "hook": "..."}
  ],
  "talentKPIs": ["KPI de talento 1", "KPI 2", "KPI 3"],
  "pilotTimeline": {
    "week1": "qué pasa en la semana 1",
    "week2": "semana 2",
    "week3": "semana 3",
    "week4": "semana 4"
  }
}

Reglas críticas sobre el match:
- Si un creador de la red encaja bien, elegí ESE y copiá name, handle, platform y followers EXACTAMENTE como figuran. No inventes ni combines dos.
- Si la búsqueda encaja solo parcialmente pero la audiencia es la correcta, elegilo igual y explicá el matiz con honestidad en "whyMatch".
- Si NINGUNO encaja de verdad (por ejemplo, un perfil directivo, un nicho profesional muy distinto o una audiencia que ninguno alcanza), usá el id "a_curar". En ese caso:
  * NUNCA inventes un nombre propio, un arroba ni una cantidad de seguidores. Poné name: "Perfil a curar", handle: "", followers: "A definir en la curaduría".
  * En "platform", "niche" y "audience" describí el perfil que habría que buscar: en qué plataforma vive esa comunidad, qué nicho profesional cubre y a quién llega.
  * En "whyMatch" explicá con qué criterios lo curaríamos: qué credibilidad tiene que tener, qué tipo de contenido debería producir y por qué un creador genérico o de gran alcance no serviría.
- Nunca presentes un perfil inventado como si ya fuera parte de nuestra red.
- Evitá lenguaje de marketing (impresiones, CPM, alcance, interacción). Usá los indicadores de gestión de la casa: calidad del flujo de candidatos, conversión de interés a postulación, percepción de marca empleadora, costo por contratación y tiempo de cobertura de la búsqueda.
- Las ideas de contenido deben ser concretas, observables y distintas entre sí, no genéricas.
- Tomá el mensaje que el equipo quiere comunicar como el ángulo narrativo central; no lo repitas textual en las ideas: traducilo a formatos nativos que generen confianza en la audiencia joven.
- Español rioplatense neutro.
- Sé conciso: cada campo de texto, como máximo 2 o 3 frases. El JSON completo tiene que cerrar correctamente.
- No agregues ningún texto fuera del JSON.`;

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
        max_tokens: 4000,
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

    // Limpieza tolerante: saca cercos de markdown y se queda con el bloque
    // que va desde la primera llave hasta la última, por si el modelo
    // agregó texto antes o después.
    let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const ini = cleaned.indexOf('{');
    const fin = cleaned.lastIndexOf('}');
    if (ini !== -1 && fin !== -1 && fin > ini) {
      cleaned = cleaned.slice(ini, fin + 1);
    }

    let brief;
    try {
      brief = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Error parseando JSON:', parseErr);
      console.error('Motivo de fin de respuesta:', data.stop_reason);
      console.error('Texto recibido (primeros 800):', cleaned.slice(0, 800));
      const truncado = data.stop_reason === 'max_tokens';
      return res.status(502).json({
        success: false,
        error: truncado
          ? 'La respuesta quedó incompleta. Probá de nuevo con una descripción más breve.'
          : 'La respuesta del modelo no fue un JSON válido'
      });
    }

    console.log('Brief generado para:', role, '| Seniority:', seniority, '| Match:', brief.influencerMatch && brief.influencerMatch.id);

    return res.status(200).json({ success: true, brief });
  } catch (err) {
    console.error('Error en generate-brief:', err);
    return res.status(500).json({ success: false, error: err.message || 'Error interno' });
  }
}
