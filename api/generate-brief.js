// api/generate-brief.js
// ---------------------------------------------------------------------------
// Devuelve DOS cosas distintas segun quien pregunta:
//
//   PUBLICO (cualquiera, sin login)
//     - el brief reescrito y afilado
//     - 3 perfiles COMPATIBLES, anonimos (arquetipo, audiencia, por que)
//     - los criterios con los que se hizo el match
//
//   PRIVADO (solo con golden ticket canjeado)
//     - todo lo anterior
//     - UN perfil curado en profundidad
//     - las piezas concretas que se producirian
//     - indicadores de talento y plan de 30 dias
//
// El control es ACA, en el servidor. Nunca se manda al navegador algo que
// despues se oculta con CSS: lo que no corresponde al nivel, no se genera.
//
// Los nombres propios del roster NO SALEN NUNCA de este archivo, ni siquiera
// en el nivel privado. El creador se revela cuando se firma, no antes.
//
// Variables de entorno: ANTHROPIC_API_KEY (obligatoria).
// ---------------------------------------------------------------------------

const SUPABASE_URL  = process.env.SUPABASE_URL  || 'https://phidhsvahnaggcjaizvv.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWRoc3ZhaG5hZ2djamFpenZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNTI2MDQsImV4cCI6MjEwODYyODYwNH0.Zq0etL5vD6N5l2uzjF2WGGxMLhzVjsZl7cEYywl3Lbo';

// Origenes desde los que aceptamos pedidos. Evita que alguien cuelgue el
// formulario en otro sitio y nos queme el credito de la API.
const ORIGENES_OK = [
  'https://hrinfluencestrategy.com.ar',
  'https://www.hrinfluencestrategy.com.ar'
];

// ── Red de creadores ────────────────────────────────────────────────────────
// Material de trabajo del modelo. Los nombres y arrobas se usan para razonar
// el match, pero el JSON de salida tiene prohibido incluirlos.
// Las 17 verticales. Fuente: verticales.json (documento metodologico del
// TFG). NO son personas: son tipos de voz con su campo, su publico y las
// senales que prueban que alguien puede hablar de ese oficio.
const VERTICALES = `
[energia_no_convencional] Campo y yacimiento no convencional — Oil & gas, servicios especiales, Vaca Muerta
  Publico: Tecnicos y operarios de 20 a 35 con secundario tecnico o terciario, que evaluan irse a la cuenca; y estudiantes de escuelas tecnicas de Neuquen, Rio Negro y La Pampa.
  Tono: Directo, sin epica. Habla de turnos, distancias, frio y plata con la misma naturalidad.  |  Tecnicismo: alto
  Valores: Premian a quien dice lo que cuesta: el regimen 14x14, estar lejos de la familia, el ritmo. Castigan la postal de la torre al atardecer.
  Idoneidad: Trabajo o trabaja en yacimiento, planta o servicio especial. Puede nombrar equipos, procedimientos y normas de seguridad sin que le suenen prestados. Tiene curso de induccion vigente o certificacion del rubro.
  Descalifica: Nunca piso un yacimiento. Muestra operaciones sin el equipo de proteccion que el procedimiento exige. Promete sueldos como gancho sin mencionar el regimen.

[mantenimiento_industrial] Mantenimiento y oficio industrial — Industria, plantas, mantenimiento, metalurgica
  Publico: Jovenes de escuela tecnica, mecanicos, electricistas industriales y operarios calificados que buscan donde estar mejor.
  Tono: Didactico sobre la maquina. Muestra el problema y como lo resolvio, no el resultado.  |  Tecnicismo: alto
  Valores: Premian la destreza demostrada y la seguridad bien hecha. Castigan al que improvisa frente a camara.
  Idoneidad: Ejerce el oficio. Muestra la intervencion completa, no solo el antes y el despues. Si hay riesgo electrico o mecanico, se ve el procedimiento correcto.
  Descalifica: Vende cursos de un oficio que no practica. Trabaja sin proteccion y lo presenta como destreza.

[automotriz] Taller y posventa automotriz — Concesionarias, talleres, posventa, autopartes
  Publico: Mecanicos jovenes, estudiantes de tecnicaturas automotrices y aspirantes a asesor de servicio.
  Tono: De taller: diagnostico en voz alta, humor seco, cero solemnidad.  |  Tecnicismo: alto
  Valores: Premian el diagnostico correcto y la honestidad sobre lo que no sabe. Castigan al que habla de marcas que no toco.
  Idoneidad: Trabaja en taller o posventa. Diagnostica frente a camara con herramienta real. Conoce el sistema de garantias y el trato con el cliente.
  Descalifica: Reseña autos sin haber trabajado nunca sobre uno. Da consejos de reparacion que comprometen la seguridad.

[salud_asistencial] Enfermeria y cuidado asistencial — Clinicas, sanatorios, geriatricos, salud domiciliaria
  Publico: Estudiantes de enfermeria y tecnicaturas de la salud, auxiliares que evaluan licenciarse, y profesionales que piensan en irse del sistema.
  Tono: Sereno y preciso. Cuenta el turno real, incluida la carga emocional, sin dramatizar.  |  Tecnicismo: alto
  Valores: Premian a quien respeta el secreto profesional y no expone pacientes. Castigan cualquier contenido grabado en sala con gente identificable.
  Idoneidad: Matricula vigente, verificada. Ejerce. Nunca muestra pacientes ni datos clinicos. Distingue con claridad lo que es su experiencia de lo que seria consejo medico.
  Descalifica: Sin matricula en un campo que la exige por ley. Graba en area asistencial con pacientes reconocibles. Da indicaciones clinicas a su audiencia.
  CUIDADO: Vertical regulada. La verificacion de matricula es condicion de entrada, no un punto mas de la rubrica.

[logistica] Logistica, deposito y ultima milla — Operadores logisticos, e-commerce, distribucion, transporte
  Publico: Jovenes de 18 a 30 en su primer empleo formal, repartidores que quieren pasar a relacion de dependencia, operarios de deposito.
  Tono: Ritmo de jornada. Cuenta el dia por tramos y con numeros propios.  |  Tecnicismo: medio
  Valores: Premian la transparencia sobre carga fisica y horarios. Castigan la promesa de flexibilidad que despues no existe.
  Idoneidad: Trabaja o trabajo en deposito, reparto o planificacion. Conoce la diferencia entre monotributo y relacion de dependencia y la explica bien.
  Descalifica: Promociona esquemas de contratacion irregular. Muestra manejo o carga en condiciones inseguras.

[construccion] Obra y oficios de la construccion — Constructoras, desarrolladoras, instaladoras
  Publico: Jovenes que entran a la obra, estudiantes de maestro mayor, oficiales que quieren pasar a capataz.
  Tono: A pie de obra, con el casco puesto. Explica el porque del procedimiento.  |  Tecnicismo: alto
  Valores: Premian la seguridad visible y el oficio bien terminado. Castigan al que sube a un andamio sin arnes para el video.
  Idoneidad: Ejerce en obra. Cumple y muestra las normas de seguridad e higiene. Puede explicar un procedimiento completo, no un truco.
  Descalifica: Trabaja en altura sin proteccion. Enseña atajos que comprometen la estructura o a la persona.

[agro] Agro y agroindustria — Produccion agropecuaria, agroindustria, maquinaria, acopio
  Publico: Jovenes de pueblos del interior, estudiantes de agronomia y tecnicaturas agropecuarias, hijos de productores que evaluan quedarse o irse.
  Tono: De campo, estacional, con el calendario productivo como estructura.  |  Tecnicismo: alto
  Valores: Premian el conocimiento del ciclo real y el cuidado del recurso. Castigan al que habla de rindes sin haber estado en la cosecha.
  Idoneidad: Trabaja en produccion, servicio o agroindustria. Conoce el ciclo completo de su cultivo o actividad. Si habla de fitosanitarios, tiene la formacion que corresponde.
  Descalifica: Recomienda aplicaciones de agroquimicos sin habilitacion. Presenta como propia una produccion que no maneja.

[gastronomia] Cocina y salon — Restaurantes, hoteleria, cadenas gastronomicas, catering
  Publico: Cocineros jovenes, estudiantes de gastronomia, personal de salon que busca crecer a encargado.
  Tono: De servicio: el ritmo de la cocina en hora pico, sin estetizar.  |  Tecnicismo: medio
  Valores: Premian a quien cuenta la realidad del horario y la presion. Castigan la cocina de autor presentada como si fuera el trabajo diario.
  Idoneidad: Trabaja o trabajo en cocina o salon profesional, no solo en su casa. Conoce manipulacion de alimentos y la aplica frente a camara.
  Descalifica: Contenido de cocina casera presentado como experiencia profesional. Malas practicas de higiene a la vista.

[retail_sucursal] Retail, comercio y gestion de local — Cadenas, franquicias, supermercados, comercio minorista
  Publico: Gen Z en su primer empleo formal y jovenes que pasan de vendedor a encargado.
  Tono: Cercano y concreto. El mostrador como escuela de gestion.  |  Tecnicismo: bajo
  Valores: Premian al que muestra el crecimiento real con sus tiempos. Castigan la promesa de carrera meteorica.
  Idoneidad: Trabaja o trabajo en piso de venta o gestion de local. Puede hablar de caja, stock, equipo y cliente dificil con detalle propio.
  Descalifica: Nunca atendio publico. Presenta como propio un recorrido de otro.

[tecnologia] Sistemas y producto digital — Software, servicios de TI, areas de sistemas
  Publico: Estudiantes de carreras de sistemas, egresados de bootcamps, perfiles junior buscando el primer puesto formal.
  Tono: Tecnico pero accesible. Muestra codigo, decisiones y errores.  |  Tecnicismo: alto
  Valores: Premian la honestidad sobre el mercado real y el nivel exigido. Castigan la promesa de sueldo en dolares en seis meses.
  Idoneidad: Trabaja en la industria, no solo enseña sobre ella. Muestra trabajo propio verificable. Habla del mercado con datos y no con expectativas.
  Descalifica: Vive de vender cursos prometiendo insercion garantizada. Nunca trabajo en un equipo de producto real.

[farma_laboratorio] Industria farmaceutica y laboratorio — Laboratorios, biotecnologia, control de calidad, regulatorio
  Publico: Estudiantes y jovenes profesionales de farmacia, bioquimica, biotecnologia y quimica.
  Tono: Riguroso y ordenado. El procedimiento como protagonista.  |  Tecnicismo: alto
  Valores: Premian el apego a la norma y la trazabilidad. Castigan cualquier afirmacion sobre eficacia de productos.
  Idoneidad: Trabaja en planta, laboratorio o area regulatoria. Entiende buenas practicas de manufactura. Respeta la confidencialidad de lo que no se puede mostrar.
  Descalifica: Habla de eficacia o seguridad de medicamentos sin ser profesional habilitado. Expone informacion confidencial de su empleador.
  CUIDADO: Vertical regulada. Toda afirmacion sanitaria queda fuera del alcance del contenido de marca empleadora.

[alimentos] Industria alimenticia — Plantas de alimentos y bebidas, frigorificos, lacteos
  Publico: Operarios jovenes, tecnicos en alimentos, estudiantes de bromatologia e ingenieria en alimentos.
  Tono: De planta: linea, turno y control.  |  Tecnicismo: medio
  Valores: Premian la inocuidad bien explicada. Castigan el contenido que banaliza el control.
  Idoneidad: Trabaja en planta o control de calidad. Conoce y aplica las normas de inocuidad. Explica el proceso sin exponer formulas propias.
  Descalifica: Muestra practicas que violan inocuidad. Expone informacion reservada del proceso.

[contacto_cliente] Atencion al cliente y contact center — Contact centers, servicios compartidos, atencion telefonica y digital
  Publico: Jovenes de 18 a 28 en su primer empleo, muchos estudiando en paralelo.
  Tono: Honesto sobre la carga emocional del puesto. Humor como herramienta.  |  Tecnicismo: bajo
  Valores: Premian a quien nombra el desgaste sin resignarse a el. Castigan el relato de que todo es facil.
  Idoneidad: Trabajo en atencion. Puede hablar de metricas, scripts y clientes dificiles desde adentro.
  Descalifica: Expone llamadas o datos de clientes reales. Ridiculiza a los usuarios.

[mineria] Mineria y gran obra remota — Mineria, proyectos remotos, campamentos
  Publico: Tecnicos y operarios dispuestos a trabajar por regimen, en San Juan, Catamarca, Santa Cruz y Jujuy.
  Tono: Sobrio. El campamento y el regimen contados sin adorno.  |  Tecnicismo: alto
  Valores: Premian la franqueza sobre el aislamiento y el impacto familiar. Castigan la postal de aventura.
  Idoneidad: Trabajo en operacion minera o proyecto remoto. Conoce el regimen, la induccion y los protocolos del sitio.
  Descalifica: Nunca estuvo en operacion. Minimiza riesgos ambientales o de seguridad.

[seguros_financiero] Seguros y servicios financieros — Aseguradoras, productores, bancos, fintech
  Publico: Jovenes profesionales de administracion y comercializacion, aspirantes a productor asesor.
  Tono: Claro y pedagogico. Traduce lo que suena complicado.  |  Tecnicismo: medio
  Valores: Premian la explicacion que no vende. Castigan la promesa de ingresos.
  Idoneidad: Ejerce en el sector. Si asesora, tiene la matricula que corresponde. Distingue educacion de recomendacion.
  Descalifica: Recomienda instrumentos concretos sin habilitacion. Promete rentabilidades.
  CUIDADO: Vertical regulada. Ninguna pieza puede incluir recomendacion de inversion ni promesa de retorno.

[educacion] Educacion y formacion profesional — Instituciones educativas, centros de formacion, areas de capacitacion
  Publico: Estudiantes de profesorado, docentes jovenes, formadores tecnicos.
  Tono: De aula real, con sus limitaciones a la vista.  |  Tecnicismo: medio
  Valores: Premian a quien muestra el oficio docente con sus dificultades. Castigan la idealizacion.
  Idoneidad: Ejerce la docencia o la formacion. Titulo habilitante cuando el nivel lo exige. No expone alumnos menores.
  Descalifica: Muestra menores identificables sin autorizacion. Sin titulo en niveles que lo requieren.
  CUIDADO: Si hay menores en el entorno, no se graban. Sin excepcion.

[primer_empleo] Primer empleo y mundo administrativo — Transversal: administracion, back office, analista junior, pasantias
  Publico: Gen Z sin experiencia formal, recien recibidos, quienes buscan su primer trabajo en blanco.
  Tono: Par a par. Cuenta el proceso completo, incluidos los rechazos.  |  Tecnicismo: bajo
  Valores: Premian la honestidad sobre la busqueda. Castigan el consejo de coach que nunca busco trabajo.
  Idoneidad: Atraveso o esta atravesando la insercion laboral formal. Habla desde su caso, no desde una teoria.
  Descalifica: Vende metodos infalibles de insercion. Nunca trabajo en relacion de dependencia pero asesora sobre ella.
`;

const IDS_VERTICALES = ["energia_no_convencional", "mantenimiento_industrial", "automotriz", "salud_asistencial", "logistica", "construccion", "agro", "gastronomia", "retail_sucursal", "tecnologia", "farma_laboratorio", "alimentos", "contacto_cliente", "mineria", "seguros_financiero", "educacion", "primer_empleo"];

// Resumen de la rubrica de idoneidad. Fuente: rubrica.json.
const RUBRICA = `
Dimensiones con las que verificamos a una voz (0 a 3 cada una, ingresa con 18 de 24):
  - Ejercicio real del oficio: ¿Hace el trabajo del que habla, o habla del trabajo?
  - Antiguedad verificable en el campo: ¿Cuanto tiempo lleva adentro y se puede comprobar?
  - Credencial o matricula cuando el campo la exige: ¿Tiene la habilitacion que su rubro requiere, y esta vigente?
  - Muestra el trabajo o solo lo relata: ¿Se ve el oficio sucediendo, o se escucha a alguien contandolo?
  - Consistencia entre lo que dice y lo que hace: ¿Su practica confirma su discurso?
  - Profundidad de nicho: ¿Cubre un campo con hondura o toca muchos sin entrar en ninguno?
  - Criterio para aceptar trabajo pagado: ¿Elige con quien trabaja, y lo declara?
  - Trato con su comunidad: ¿Como responde cuando le preguntan o cuando se equivoca?

NO son criterio, a proposito: cantidad de seguidores, tasa de interaccion, calidad de produccion audiovisual, frecuencia de publicacion, simpatia o carisma.
Motivo: Son las metricas del marketing de influencers. Miden difusion, no legitimidad. Una voz con 8.000 seguidores que ejerce el oficio mueve mas postulaciones calificadas que una de 200.000 que lo comenta desde afuera, y el area de RRHH lo ve en la calidad del flujo de candidatos, no en el alcance.
`;

const SENIORITY = {
  early: 'Early Career (0-3 anios)',
  semi:  'Semi-Senior (3-7 anios)',
  senior:'Senior (7+ anios)'
};

// Los cuatro formatos de la casa. El nivel privado arma las piezas sobre estos.
const FORMATOS = `
1. "Unboxing organizacional" — el dia real adentro, sin folleto: horarios, lugares, lo que nadie cuenta.
2. "Meet your team" — quienes son las personas con las que se trabaja, con nombre y recorrido.
3. "Leaders' talk" — quien lidera y como, respondiendo preguntas incomodas sin ensayo.
4. "Wealth check" — los numeros sin vueltas: banda salarial, beneficios que se usan, capacitaciones, como se crece.
`;

// ── Nivel de acceso ─────────────────────────────────────────────────────────
// Le preguntamos a Supabase con el token de la persona. Si el token es falso
// o vencido, PostgREST lo rechaza. Si es valido, RLS hace que solo pueda ver
// su propia fila. No necesitamos ninguna clave secreta para esto.
async function nivelDeAcceso(req) {
  const cabecera = req.headers.authorization || '';
  if (!cabecera.startsWith('Bearer ')) return { nivel: 'publico' };

  const token = cabecera.slice(7).trim();
  if (!token) return { nivel: 'publico' };

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/leads?select=acceso,email`, {
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });
    if (!r.ok) return { nivel: 'publico' };
    const filas = await r.json();
    const fila = Array.isArray(filas) ? filas[0] : null;
    if (fila && fila.acceso === true) {
      return { nivel: 'privado', email: fila.email || null };
    }
    return { nivel: 'publico', email: fila ? fila.email : null };
  } catch (e) {
    console.error('No se pudo verificar el acceso:', e.message);
    return { nivel: 'publico' };
  }
}

// ── Prompts ─────────────────────────────────────────────────────────────────
function promptPublico({ role, seniorityLabel, culture, context, notaAudiencia }) {
  return `Sos el asistente de HR Influence Strategy, un estudio que traduce lo que una empresa necesita comunicar a la voz de creadores de contenido con credibilidad genuina entre el talento joven, curados por nicho profesional y NO por cantidad de seguidores.

${notaAudiencia}

Cargaron esta busqueda:

Rol a cubrir: ${role}
Seniority objetivo: ${seniorityLabel}
Que quieren comunicar del rol y de la cultura: ${culture}
${context ? 'Contexto o desafio adicional: ' + context : ''}

Nuestras verticales curadas:
${VERTICALES}

Con que verificamos que una voz es idonea:
${RUBRICA}

Tu tarea tiene tres partes.

1. REESCRIBIR EL BRIEF. Tomá lo que escribieron y devolveles la version afilada: que es lo que en realidad necesitan comunicar, dicho mejor de lo que ellos lo dijeron. Esta es la prueba de que los entendimos. Si lo que escribieron es vago, nombrá con precision lo que esta en juego detras.

2. TRES PERFILES COMPATIBLES. Elegí las TRES verticales mas afines a esta busqueda y convertí cada una en un arquetipo de voz concreto para ESTE caso. Ordenalos del mas al menos afin. El arquetipo no es el nombre de la vertical: es como se llamaria esa voz puesta a comunicar esta busqueda en particular.

3. LOS CRITERIOS. Con que criterios se hizo ese match. Sacalos de las dimensiones de la rubrica, puestos en lenguaje de esta busqueda.

RESPONDE SOLO EN JSON VALIDO, sin texto previo, sin markdown, sin backticks:

{
  "briefReformulado": {
    "titular": "una frase que nombre el verdadero desafio de comunicacion de esta busqueda",
    "cuerpo": "2 o 3 frases: que necesitan comunicar realmente, por que su mensaje actual no esta llegando, y que tendria que cambiar. Lenguaje de RRHH, cero marketing."
  },
  "perfilesCompatibles": [
    {
      "arquetipo": "nombre del tipo de voz, 2 a 4 palabras, descriptivo y no generico",
      "audiencia": "a quien le habla, en una frase",
      "porQue": "una o dos frases sobre por que esta voz comunica bien ESTA busqueda"
    },
    { "arquetipo": "...", "audiencia": "...", "porQue": "..." },
    { "arquetipo": "...", "audiencia": "...", "porQue": "..." }
  ],
  "criterios": ["criterio 1", "criterio 2", "criterio 3"]
}

Reglas que no se negocian:
- PROHIBIDO escribir nombres propios de personas, arrobas, handles o cantidades de seguidores. Ni inventados ni reales. Hablamos de ARQUETIPOS de voz, no de personas. Si se te escapa un nombre, la respuesta es invalida.
- Los tres arquetipos tienen que salir de TRES verticales distintas, y ser realmente distintos entre si, no el mismo dicho de tres maneras.
- Si la busqueda cae en una vertical con CUIDADO marcado, tenelo presente al describir la voz.
- Nada de lenguaje de marketing (impresiones, CPM, alcance, engagement). Los indicadores de la casa son: calidad del flujo de candidatos, conversion de interes a postulacion, percepcion de marca empleadora, costo por contratacion, tiempo de cobertura.
- Espaniol rioplatense neutro, voseo.
- Cada campo de texto, maximo 3 frases.
- Ningun texto fuera del JSON.`;
}

function promptPrivado({ role, seniorityLabel, culture, context, notaAudiencia }) {
  return `Sos el asistente de HR Influence Strategy, un estudio que traduce lo que una empresa necesita comunicar a la voz de creadores de contenido con credibilidad genuina entre el talento joven, curados por nicho profesional y NO por cantidad de seguidores.

${notaAudiencia}

Esta empresa esta DENTRO del piloto: canjeo su golden ticket. Le entregamos el trabajo completo, no una muestra.

Cargaron esta busqueda:

Rol a cubrir: ${role}
Seniority objetivo: ${seniorityLabel}
Que quieren comunicar del rol y de la cultura: ${culture}
${context ? 'Contexto o desafio adicional: ' + context : ''}

Nuestras verticales curadas:
${VERTICALES}

Con que verificamos que una voz es idonea:
${RUBRICA}

Nuestros cuatro formatos de pieza:
${FORMATOS}

RESPONDE SOLO EN JSON VALIDO, sin texto previo, sin markdown, sin backticks:

{
  "briefReformulado": {
    "titular": "una frase que nombre el verdadero desafio de comunicacion de esta busqueda",
    "cuerpo": "2 o 3 frases: que necesitan comunicar realmente, por que su mensaje actual no esta llegando, y que tendria que cambiar"
  },
  "perfilesCompatibles": [
    {"arquetipo": "...", "audiencia": "...", "porQue": "..."},
    {"arquetipo": "...", "audiencia": "...", "porQue": "..."},
    {"arquetipo": "...", "audiencia": "...", "porQue": "..."}
  ],
  "criterios": ["criterio 1", "criterio 2", "criterio 3"],
  "perfilElegido": {
    "estado": "en_red | a_curar",
    "arquetipo": "el tipo de voz elegido, 2 a 4 palabras",
    "plataforma": "donde vive esa comunidad",
    "alcance": "banda de alcance, por ejemplo 'entre 25.000 y 60.000 seguidores'. Nunca un numero exacto.",
    "audiencia": "composicion de la audiencia en una o dos frases: quienes son, en que momento de su carrera estan",
    "tono": "como habla y por que eso genera confianza, en una frase",
    "porQueEste": "2 o 3 frases explicando por que ESTE perfil y no los otros dos. Tiene que ser una decision argumentada, no un elogio.",
    "comoLoCuramos": ["3 verificaciones CONCRETAS que haríamos sobre un candidato a esta voz, sacadas de las senales de idoneidad de su vertical. Nada generico: si la vertical pide matricula, decilo; si pide mostrar el procedimiento completo, decilo."],
    "aTenerEnCuenta": "una advertencia honesta: que limite tiene esta eleccion o que habria que cuidar al ejecutarla"
  },
  "piezas": [
    {
      "formato": "uno de los cuatro formatos de la casa, con su nombre exacto",
      "titulo": "titulo concreto de ESTA pieza para ESTA busqueda",
      "que": "que se ve y que se cuenta, en una o dos frases",
      "gancho": "la frase de apertura textual, en la voz del creador",
      "porQue": "que objeción del candidato desarma esta pieza"
    },
    { "formato": "...", "titulo": "...", "que": "...", "gancho": "...", "porQue": "..." },
    { "formato": "...", "titulo": "...", "que": "...", "gancho": "...", "porQue": "..." }
  ],
  "talentKPIs": ["indicador 1", "indicador 2", "indicador 3"],
  "pilotTimeline": {
    "week1": "que pasa en la semana 1",
    "week2": "semana 2",
    "week3": "semana 3",
    "week4": "semana 4"
  }
}

Reglas que no se negocian:
- PROHIBIDO escribir nombres propios de personas, arrobas, handles o cantidades exactas de seguidores, aca tampoco. Trabajamos con el PERFIL; la persona se presenta cuando se firma. Si se te escapa un nombre, la respuesta es invalida.
- "alcance" va siempre como banda, nunca como cifra cerrada. No inventamos precision que no tenemos.
- El perfil elegido tiene que salir de UNA de las verticales. Si ninguna cubre bien esta busqueda, poné estado "a_curar" y describí la vertical nueva que habria que abrir y con que criterios. Es una respuesta legitima y honesta, no un fracaso.
- "comoLoCuramos" sale de las senales de idoneidad de la vertical elegida, no de generalidades. Es la respuesta a "¿y como se que no es cualquiera?".
- Si la vertical tiene CUIDADO marcado (campo regulado, menores), eso va si o si en "aTenerEnCuenta".
- Las tres piezas tienen que usar formatos DISTINTOS de los cuatro de la casa, y ser especificas de esta busqueda. Nada que sirva igual para cualquier empresa.
- El campo "aTenerEnCuenta" no es un adorno: escribí ahi la objecion real que le haria un director de RRHH escéptico.
- Nada de lenguaje de marketing (impresiones, CPM, alcance publicitario, engagement). Indicadores de la casa: calidad del flujo de candidatos, conversion de interes a postulacion, percepcion de marca empleadora, costo por contratacion, tiempo de cobertura.
- Espaniol rioplatense neutro, voseo.
- Cada campo de texto, maximo 3 frases. El JSON tiene que cerrar correctamente.
- Ningun texto fuera del JSON.`;
}

// Red de seguridad: si al modelo se le escapa un arroba o una cifra cerrada de
// seguidores, no lo dejamos salir. El prompt ya lo prohibe; esto es el cinturon.
// Desde que las verticales no tienen personas adentro, no hay nombres propios
// que filtrar: el riesgo que queda es que el modelo invente uno.
const PROHIBIDAS = [
  /@[a-z0-9._]{3,}/gi,                                      // arrobas
  /\b\d{1,3}(?:[.,]\d{3})+\s*(?:seguidores|followers)\b/gi,  // "26.000 seguidores"
  // Nombres de pila argentinos frecuentes. Deja afuera a proposito los que
  // tambien son topónimos (Santiago, Rosario, Victoria, Mercedes, Belen,
  // Concepcion, Juan, Pedro, Pablo, Nicolas) y nunca pisa un "San X" ni un
  // "Santa X", para no tapar texto legitimo como "San Juan" o "Santa Cruz".
  new RegExp('(?<!San )(?<!Santa )\\b(?:' + [
    'Melina','Melisa','Sofia','Sofía','Martina','Valentina','Camila','Lucia','Lucía',
    'Julieta','Agustina','Micaela','Rocio','Rocío','Brenda','Ayelen','Ayelén','Milagros',
    'Florencia','Carolina','Daniela','Gabriela','Romina','Soledad','Vanesa','Yamila',
    'Mateo','Benjamin','Benjamín','Bautista','Thiago','Facundo','Tomas','Tomás','Joaquin',
    'Joaquín','Lautaro','Nicolas','Nicolás','Matias','Matías','Federico','Gonzalo',
    'Ignacio','Agustin','Agustín','Emiliano','Rodrigo','Tobias','Tobías','Ezequiel',
    'Leandro','Maximiliano','Sebastian','Sebastián','Diego','Ramiro','Ariel'
  ].join('|') + ')\\b', 'g')
];

let huboFuga = false;

function limpiar(valor) {
  if (typeof valor === 'string') {
    let s = valor;
    for (const re of PROHIBIDAS) {
      if (re.test(s)) huboFuga = true;
      re.lastIndex = 0;
      s = s.replace(re, '—');
    }
    return s;
  }
  if (Array.isArray(valor)) return valor.map(limpiar);
  if (valor && typeof valor === 'object') {
    const o = {};
    for (const k of Object.keys(valor)) o[k] = limpiar(valor[k]);
    return o;
  }
  return valor;
}

// ── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Metodo no permitido' });
  }

  const origen = req.headers.origin;
  if (origen && !ORIGENES_OK.includes(origen)) {
    return res.status(403).json({ success: false, error: 'Origen no permitido' });
  }

  const { role, seniority, culture, context, audience } = req.body || {};
  if (!role || !seniority || !culture) {
    return res.status(400).json({ success: false, error: 'Faltan campos requeridos (role, seniority, culture)' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'ANTHROPIC_API_KEY no configurada en el servidor' });
  }

  const { nivel, email } = await nivelDeAcceso(req);

  const datos = {
    role,
    seniorityLabel: SENIORITY[seniority] || seniority,
    culture,
    context,
    notaAudiencia: audience === 'agency'
      ? 'Quien carga el brief es una agencia o consultora de RRHH que atiende a varias empresas cliente. Hablale como socio experto que le va a permitir ofrecer este servicio a sus propios clientes.'
      : 'Quien carga el brief es un area interna de Recursos Humanos o Talent Acquisition de una empresa.'
  };

  const prompt = nivel === 'privado' ? promptPrivado(datos) : promptPublico(datos);

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: nivel === 'privado' ? 4000 : 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!r.ok) {
      console.error('Anthropic API error:', await r.text());
      return res.status(502).json({ success: false, error: 'Error al contactar la API de Anthropic' });
    }

    const data = await r.json();
    const texto = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim();

    let limpio = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
    const ini = limpio.indexOf('{');
    const fin = limpio.lastIndexOf('}');
    if (ini !== -1 && fin !== -1 && fin > ini) limpio = limpio.slice(ini, fin + 1);

    let brief;
    try {
      brief = JSON.parse(limpio);
    } catch (e) {
      console.error('JSON invalido:', e.message, '| stop_reason:', data.stop_reason);
      console.error('Texto (800):', limpio.slice(0, 800));
      return res.status(502).json({
        success: false,
        error: data.stop_reason === 'max_tokens'
          ? 'La respuesta quedo incompleta. Probá de nuevo con una descripcion mas breve.'
          : 'La respuesta del modelo no fue un JSON valido'
      });
    }

    huboFuga = false;
    brief = limpiar(brief);
    if (huboFuga) {
      // Si esto aparece en los logs de Vercel, el prompt necesita ajuste:
      // el modelo intento sacar un nombre, un arroba o una cifra cerrada.
      console.warn('[fuga] el modelo escribio algo que no debia; quedo tapado. Rol:', role);
    }

    // Cinturon final: aunque el modelo haya generado de mas, al navegador
    // publico solo le viajan los tres campos publicos.
    if (nivel !== 'privado') {
      brief = {
        briefReformulado:   brief.briefReformulado,
        perfilesCompatibles:(brief.perfilesCompatibles || []).slice(0, 3),
        criterios:          brief.criterios || []
      };
    }

    console.log('Brief', nivel, '| rol:', role, '| seniority:', seniority, email ? '| ' + email : '');
    return res.status(200).json({ success: true, nivel, brief });

  } catch (err) {
    console.error('Error en generate-brief:', err);
    return res.status(500).json({ success: false, error: err.message || 'Error interno' });
  }
}
