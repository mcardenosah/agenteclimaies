// =====================================================
// Agente Clima IES v2.3
// calculations.js
// Motor de cálculo termohigrométrico
// =====================================================

function calculateMedian(values) {

    if (!values.length) return 0;

    const sorted = [...values].sort((a, b) => a - b);

    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
}

// -----------------------------------------------------
// Clave de día (AAAA-MM-DD) en hora local.
// Debe usarse siempre junto a getHours(), que también
// es hora local, para no mezclar días distintos.
// -----------------------------------------------------

function localDateKey(fecha) {

    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// -----------------------------------------------------
// Índice de Disconfort de Thom
// -----------------------------------------------------

// -----------------------------------------------------
// Horario lectivo
//
// Si está activo, los tiempos de exposición, ETA27, el
// cumplimiento del RD 486/1997 y la severidad se evalúan
// solo dentro de este horario. Las medias, mínimos y
// máximos se calculan siempre sobre todo el periodo.
// days: 0 = domingo ... 6 = sábado (como Date.getDay()).
// -----------------------------------------------------

const scheduleConfig = {
    enabled: true,
    days: [1, 2, 3, 4, 5],
    start: "08:00",
    end: "15:00"
};

function timeToMinutes(texto) {

    const partes = String(texto).split(":");

    return Number(partes[0]) * 60 + Number(partes[1] || 0);
}

function isInSchedule(fecha) {

    if (!scheduleConfig.days.includes(fecha.getDay())) {
        return false;
    }

    const minutos =
        fecha.getHours() * 60 + fecha.getMinutes();

    return (
        minutos >= timeToMinutes(scheduleConfig.start) &&
        minutos < timeToMinutes(scheduleConfig.end)
    );
}

function describeSchedule() {

    if (!scheduleConfig.enabled) {
        return "todo el periodo registrado (24 h, todos los días)";
    }

    const nombres = ["D", "L", "M", "X", "J", "V", "S"];

    const dias =
        [1, 2, 3, 4, 5, 6, 0]
            .filter(d => scheduleConfig.days.includes(d))
            .map(d => nombres[d])
            .join(" ");

    return `horario lectivo (${dias}, de ${scheduleConfig.start} a ${scheduleConfig.end})`;
}

function calculateThomIndex(temperatura, humedad) {

    return (
        temperatura -
        (0.55 - 0.0055 * humedad) *
        (temperatura - 14.5)
    );
}

// -----------------------------------------------------
// Clasificación del DI
// Tabla única de umbrales (metodologia.md, apdo. 4.3)
// -----------------------------------------------------

const DI_LEVELS = [
    { max: 21, category: "Confortable", className: "di-confortable", color: "#86efac" },
    { max: 24, category: "Ligero disconfort", className: "di-ligero", color: "#fef08a" },
    { max: 27, category: "Disconfort moderado", className: "di-moderado", color: "#fbbf24" },
    { max: 29, category: "Disconfort severo", className: "di-severo", color: "#f97316" },
    { max: 32, category: "Estrés térmico intenso", className: "di-intenso", color: "#dc2626" },
    { max: Infinity, category: "Estrés térmico extremo", className: "di-extremo", color: "#7e22ce" }
];

function classifyThomInfo(di) {

    if (!Number.isFinite(di)) {
        return null;
    }

    for (const nivel of DI_LEVELS) {
        if (di < nivel.max) {
            return nivel;
        }
    }

    return null;
}

function classifyThom(di) {

    const info = classifyThomInfo(di);

    return info ? info.category : "";
}

// -----------------------------------------------------
// Clasificación de severidad
//
// eta27Semanal: ETA27 normalizado a una semana de
// registro (°C·h por cada 168 h con datos), para que el
// resultado no dependa de la duración de la campaña.
// -----------------------------------------------------

function calculateSeverity(
    eta27Semanal,
    porcentajeBajo17,
    porcentajeHRFuera
) {

    const impacto =
        porcentajeBajo17 +
        porcentajeHRFuera;

    if (eta27Semanal === 0 && impacto === 0) {
        return "Verde";
    }

    if (eta27Semanal < 5 && impacto < 5) {
        return "Amarillo";
    }

    if (eta27Semanal < 20 && impacto < 20) {
        return "Naranja";
    }

    return "Rojo";
}

// -----------------------------------------------------
// Procesamiento principal
// -----------------------------------------------------

function processClassroomData(aula, registros) {

    if (!registros || registros.length < 2) {

        return {
            aula,
            estado: "No evaluable"
        };
    }

    // =====================================
    // Intervalo típico
    // =====================================

    const intervalos = [];

    for (let i = 0; i < registros.length - 1; i++) {

        const dtMin =
            (registros[i + 1].timestamp - registros[i].timestamp) /
            (1000 * 60);

        if (dtMin > 0) {
            intervalos.push(dtMin);
        }
    }

    const intervaloMediano = calculateMedian(intervalos);

    const umbralHueco = intervaloMediano * 3;

    // =====================================
    // Estadísticos básicos
    // Se calculan sobre TODOS los registros,
    // cada uno contado una sola vez.
    // =====================================

    let tMin = Infinity;
    let tMax = -Infinity;
    let tSum = 0;

    let hrMin = Infinity;
    let hrMax = -Infinity;
    let hrSum = 0;

    let diMin = Infinity;
    let diMax = -Infinity;
    let diSum = 0;

    let hiMin = Infinity;
    let hiMax = -Infinity;
    let hiSum = 0;
    let hiCount = 0;

    const diPorRegistro = new Array(registros.length);

    for (let i = 0; i < registros.length; i++) {

        const r = registros[i];

        tMin = Math.min(tMin, r.temp);
        tMax = Math.max(tMax, r.temp);
        tSum += r.temp;

        hrMin = Math.min(hrMin, r.hum);
        hrMax = Math.max(hrMax, r.hum);
        hrSum += r.hum;

        const di = calculateThomIndex(r.temp, r.hum);

        diPorRegistro[i] = di;

        diMin = Math.min(diMin, di);
        diMax = Math.max(diMax, di);
        diSum += di;

        const hi = calculateHeatIndex(r.temp, r.hum);

        if (Number.isFinite(hi)) {
            hiMin = Math.min(hiMin, hi);
            hiMax = Math.max(hiMax, hi);
            hiSum += hi;
            hiCount++;
        }
    }

    const tMedia = tSum / registros.length;
    const hrMedia = hrSum / registros.length;
    const diMedia = diSum / registros.length;

    const hiMedia = hiCount > 0 ? hiSum / hiCount : NaN;

    if (hiCount === 0) {
        hiMin = NaN;
        hiMax = NaN;
    }

    // =====================================
    // Tiempos de exposición
    // Cada registro se mantiene hasta el
    // siguiente; los huecos no se evalúan.
    // =====================================

    const horarioActivo = scheduleConfig.enabled;

    // Horas con datos válidos en todo el periodo
    let horasRegistradas = 0;

    // Horas con datos válidos dentro del horario evaluado
    let horasEvaluadas = 0;

    let horasMenos17 = 0;
    let horasMas27 = 0;

    let eta27 = 0;

    let horasHRBaja = 0;
    let horasHRAlta = 0;

    let horasDI24 = 0;
    let horasDI27 = 0;

    // Horas en cada franja de temperatura:
    // < 17, 17–25, 25–27, 27–30 y > 30 °C
    const horasBandas = [0, 0, 0, 0, 0];

    for (let i = 0; i < registros.length - 1; i++) {

        const actual = registros[i];

        const dtMin =
            (registros[i + 1].timestamp - actual.timestamp) /
            (1000 * 60);

        if (dtMin > umbralHueco) {
            continue;
        }

        const dtHoras = dtMin / 60;

        horasRegistradas += dtHoras;

        if (
            horarioActivo &&
            !isInSchedule(actual.timestamp)
        ) {
            continue;
        }

        horasEvaluadas += dtHoras;

        horasBandas[
            actual.temp < 17 ? 0
            : actual.temp <= 25 ? 1
            : actual.temp <= 27 ? 2
            : actual.temp <= 30 ? 3
            : 4
        ] += dtHoras;

        if (actual.temp < 17) {
            horasMenos17 += dtHoras;
        }

        if (actual.temp > 27) {
            horasMas27 += dtHoras;
            eta27 += (actual.temp - 27) * dtHoras;
        }

        if (actual.hum < 30) {
            horasHRBaja += dtHoras;
        }

        if (actual.hum > 70) {
            horasHRAlta += dtHoras;
        }

        if (diPorRegistro[i] > 24) {
            horasDI24 += dtHoras;
        }

        if (diPorRegistro[i] > 27) {
            horasDI27 += dtHoras;
        }
    }

    // =====================================
    // Porcentajes
    // =====================================

    const porcentaje = horas =>
        horasEvaluadas > 0
        ? (horas / horasEvaluadas) * 100
        : 0;

    const porcentajeBajo17 = porcentaje(horasMenos17);
    const porcentajeSobre27 = porcentaje(horasMas27);
    const porcentajeHRFueraRango = porcentaje(horasHRBaja + horasHRAlta);
    const porcentajeDI24 = porcentaje(horasDI24);
    const porcentajeDI27 = porcentaje(horasDI27);

    // ETA27 por semana natural de registro: exceso acumulado
    // dentro del horario evaluado, repartido entre las semanas
    // (168 h con datos) que ha durado la medición.

    // Con el horario activo puede no haber ningún dato lectivo
    const sinDatosLectivos =
        horarioActivo && horasEvaluadas === 0;

    const eta27Semanal =
        horasEvaluadas > 0
        ? (eta27 / horasRegistradas) * 168
        : 0;

    // =====================================
    // Cumplimiento RD486
    // =====================================

    const cumpleTemperatura =
        horasMenos17 === 0 &&
        horasMas27 === 0;

    const cumpleHumedad =
        horasHRBaja === 0 &&
        horasHRAlta === 0;

    const cumpleRD =
        cumpleTemperatura &&
        cumpleHumedad;

    const severidad =
        calculateSeverity(
            eta27Semanal,
            porcentajeBajo17,
            porcentajeHRFueraRango
        );

    return {

        aula,

        estado: "Evaluable",

        horarioLectivo: horarioActivo,
        sinDatosLectivos,
        horasRegistradas,

        registros: registros.length,

        intervaloMediano,
        umbralHueco,
        horasEvaluadas,

        tMin,
        tMedia,
        tMax,

        horasMenos17,
        porcentajeBajo17,

        horasMas27,
        porcentajeSobre27,

        eta27,
        eta27Semanal,

        horasBandas,

        hrMin,
        hrMedia,
        hrMax,

        horasHRBaja,
        horasHRAlta,
        porcentajeHRFueraRango,

        diMin,
        diMedia,
        diMax,

        horasDI24,
        horasDI27,
        porcentajeDI24,
        porcentajeDI27,

        categoriaConfort: classifyThom(diMedia),

        cumpleTemperatura,
        cumpleHumedad,
        cumpleRD: sinDatosLectivos ? null : cumpleRD,

        severidad: sinDatosLectivos ? "Sin datos" : severidad,

        hiMin,
        hiMedia,
        hiMax,
        hiResult: classifyHeatIndex(hiMedia),
        hiMaxResult: classifyHeatIndex(hiMax)
    };
}
