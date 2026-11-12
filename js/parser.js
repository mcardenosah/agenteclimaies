// =====================================================
// Agente Clima IES v2.3
// parser.js
// Lectura e importación de CSV
// =====================================================

let rawData = {};
let processedStats = [];

// Avisos generados durante la última importación
let importWarnings = [];

// -----------------------------------------------------
// Configuración de la interfaz
// -----------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {

    const dropZone =
        document.getElementById("drop-zone");

    const fileInput =
        document.getElementById("file-input");

    // -----------------------------------------
    // Selección mediante clic
    // -----------------------------------------

    dropZone.addEventListener("click", () => {

        fileInput.click();

    });

    // -----------------------------------------
    // Selección mediante teclado (Intro o Espacio)
    // -----------------------------------------

    dropZone.addEventListener("keydown", (e) => {

        if (e.key === "Enter" || e.key === " ") {

            e.preventDefault();

            fileInput.click();
        }
    });

    // -----------------------------------------
    // Selección mediante explorador
    // -----------------------------------------

    fileInput.addEventListener("change", (e) => {

        if (e.target.files.length > 0) {

            processFiles(
                Array.from(e.target.files)
            );

            e.target.value = "";
        }
    });

    // -----------------------------------------
    // Drag & Drop
    // -----------------------------------------

    dropZone.addEventListener(
        "dragover",
        (e) => {

            e.preventDefault();

            dropZone.classList.add(
                "drag-active"
            );
        }
    );

    dropZone.addEventListener(
        "dragleave",
        () => {

            dropZone.classList.remove(
                "drag-active"
            );
        }
    );

    dropZone.addEventListener(
        "drop",
        (e) => {

            e.preventDefault();

            dropZone.classList.remove(
                "drag-active"
            );

            const files =
                Array.from(
                    e.dataTransfer.files
                );

            processFiles(files);
        }
    );
});

// -----------------------------------------------------
// Procesamiento de archivos
// -----------------------------------------------------

async function processFiles(files) {

    document
        .getElementById("processing-status")
        .classList.remove("hidden");

    rawData = {};

    processedStats = [];

    importWarnings = [];

    let procesados = 0;

    const alTerminar = () => {

        procesados++;

        if (procesados === files.length) {

            // Varios archivos de una misma aula se unen
            Object.keys(rawData).forEach(aula => {
                rawData[aula] =
                    sortAndDeduplicate(rawData[aula]);
            });

            finishProcessing();
        }
    };

    files.forEach(file => {

        Papa.parse(file, {

            skipEmptyLines: true,

            complete: function(results) {

                try {

                    const aula =
                        file.name.split("_")[0];

                    const resultado =
                        parseCSVData(
                            results.data
                        );

                    resultado.avisos.forEach(aviso => {
                        importWarnings.push(
                            `${file.name}: ${aviso}`
                        );
                    });

                    rawData[aula] =
                        (rawData[aula] || [])
                            .concat(resultado.registros);

                } catch (error) {

                    console.error(
                        "Error procesando archivo:",
                        file.name,
                        error
                    );

                    importWarnings.push(
                        `${file.name}: no se ha podido procesar el archivo.`
                    );
                }

                alTerminar();
            },

            error: function(error) {

                console.error(
                    "Error leyendo CSV:",
                    error
                );

                importWarnings.push(
                    `${file.name}: no se ha podido leer el archivo.`
                );

                alTerminar();
            }
        });
    });
}

// -----------------------------------------------------
// Números: admite coma o punto decimal
// -----------------------------------------------------

function parseNumber(valor) {

    if (typeof valor === "number") {
        return valor;
    }

    return parseFloat(
        String(valor)
            .trim()
            .replace(",", ".")
    );
}

// -----------------------------------------------------
// Fechas
//
// Formatos con el año al principio (2025-06-05 10:00,
// 2025/06/05 10:00, ISO 8601) se leen directamente.
//
// Formatos con el año al final (05/06/2025 10:00,
// 5-6-25 10:00:00, 05.06.2025...) son ambiguos: el
// orden día/mes se decide para todo el archivo con
// detectDayFirst().
// -----------------------------------------------------

const DATE_YEAR_LAST =
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})(?:[ T,;]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?)?\s*$/;

function detectDayFirst(rows) {

    let primeroMayor12 = false;
    let segundoMayor12 = false;
    let coincidencias = 0;

    rows.forEach(row => {

        if (!row || row.length < 1) {
            return;
        }

        const m =
            String(row[0]).trim().match(DATE_YEAR_LAST);

        if (!m) {
            return;
        }

        coincidencias++;

        if (Number(m[1]) > 12) primeroMayor12 = true;
        if (Number(m[2]) > 12) segundoMayor12 = true;
    });

    return {

        // Si no hay evidencia se asume día/mes/año
        dayFirst: primeroMayor12 || !segundoMayor12,

        ambiguo:
            coincidencias > 0 &&
            !primeroMayor12 &&
            !segundoMayor12
    };
}

function parseTimestamp(texto, dayFirst) {

    const m = texto.match(DATE_YEAR_LAST);

    if (!m) {
        return new Date(texto);
    }

    const dia = Number(dayFirst ? m[1] : m[2]);
    const mes = Number(dayFirst ? m[2] : m[1]);

    let anio = Number(m[3]);

    if (m[3].length === 2) {
        anio += 2000;
    }

    let hora = m[4] !== undefined ? Number(m[4]) : 0;
    const minuto = m[5] !== undefined ? Number(m[5]) : 0;
    const segundo = m[6] !== undefined ? Number(m[6]) : 0;

    if (m[7]) {

        const esPM = /^p/i.test(m[7]);

        if (esPM && hora < 12) hora += 12;
        if (!esPM && hora === 12) hora = 0;
    }

    const fecha =
        new Date(anio, mes - 1, dia, hora, minuto, segundo);

    // Rechazar fechas imposibles (31/02, mes 13...)
    if (
        fecha.getFullYear() !== anio ||
        fecha.getMonth() !== mes - 1 ||
        fecha.getDate() !== dia ||
        hora > 23 ||
        minuto > 59 ||
        segundo > 59
    ) {
        return new Date(NaN);
    }

    return fecha;
}

// -----------------------------------------------------
// Límites de plausibilidad de las lecturas
// -----------------------------------------------------

const TEMP_MIN_VALIDA = -40;
const TEMP_MAX_VALIDA = 70;
const HUM_MIN_VALIDA = 0;
const HUM_MAX_VALIDA = 100;
const HUM_TOLERANCIA = 5;

// -----------------------------------------------------
// Conversión CSV → registros
// Devuelve { registros, avisos }
// -----------------------------------------------------

function parseCSVData(rows) {

    const registros = [];
    const avisos = [];

    const orden = detectDayFirst(rows);

    let sinFecha = 0;
    let sinValores = 0;
    let fueraDeRango = 0;
    let humedadAcotada = 0;

    rows.forEach(row => {

        if (
            !row ||
            row.length < 3
        ) {
            return;
        }

        const fechaTexto =
            String(row[0]).trim();

        const fecha =
            parseTimestamp(
                fechaTexto,
                orden.dayFirst
            );

        // Cabeceras y filas sin fecha reconocible
        if (
            isNaN(
                fecha.getTime()
            )
        ) {
            // Solo cuenta como descarte si la fila tenía datos
            if (/\d/.test(fechaTexto)) {
                sinFecha++;
            }
            return;
        }

        const temperatura =
            parseNumber(row[1]);

        let humedad =
            parseNumber(row[2]);

        if (
            isNaN(temperatura)
            ||
            isNaN(humedad)
        ) {
            sinValores++;
            return;
        }

        if (
            temperatura < TEMP_MIN_VALIDA ||
            temperatura > TEMP_MAX_VALIDA ||
            humedad < HUM_MIN_VALIDA - HUM_TOLERANCIA ||
            humedad > HUM_MAX_VALIDA + HUM_TOLERANCIA
        ) {
            fueraDeRango++;
            return;
        }

        // Pequeños excesos del sensor (p. ej. 100,4 %)
        if (
            humedad < HUM_MIN_VALIDA ||
            humedad > HUM_MAX_VALIDA
        ) {
            humedad =
                Math.min(
                    HUM_MAX_VALIDA,
                    Math.max(HUM_MIN_VALIDA, humedad)
                );
            humedadAcotada++;
        }

        registros.push({

            timestamp: fecha,

            temp: temperatura,

            hum: humedad
        });
    });

    if (sinFecha > 0) {
        avisos.push(
            `${sinFecha} filas descartadas por fecha no reconocida.`
        );
    }

    if (sinValores > 0) {
        avisos.push(
            `${sinValores} filas descartadas por temperatura o humedad no numéricas.`
        );
    }

    if (fueraDeRango > 0) {
        avisos.push(
            `${fueraDeRango} filas descartadas por valores imposibles ` +
            `(temperatura fuera de ${TEMP_MIN_VALIDA} a ${TEMP_MAX_VALIDA} °C ` +
            `o humedad fuera de 0 a 100 %).`
        );
    }

    if (humedadAcotada > 0) {
        avisos.push(
            `${humedadAcotada} lecturas de humedad ligeramente fuera de 0–100 % ajustadas al límite.`
        );
    }

    if (orden.ambiguo && registros.length > 0) {
        avisos.push(
            "el formato de fecha es ambiguo (día y mes ≤ 12 en todas las filas); " +
            "se ha interpretado como día/mes/año."
        );
    }

    if (registros.length === 0) {
        avisos.push(
            "no se ha encontrado ningún registro válido " +
            "(se esperan las columnas fecha, temperatura y humedad, en ese orden)."
        );
    }

    return {
        registros: sortAndDeduplicate(registros),
        avisos
    };
}

// -----------------------------------------------------
// Ordena por fecha y elimina marcas de tiempo repetidas
// -----------------------------------------------------

function sortAndDeduplicate(registros) {

    const ordenados =
        [...registros].sort(
            (a, b) =>
                a.timestamp -
                b.timestamp
        );

    return ordenados.filter(
        (r, i) =>
            i === 0 ||
            r.timestamp.getTime() !==
            ordenados[i - 1].timestamp.getTime()
    );
}

// -----------------------------------------------------
// Finalización
// -----------------------------------------------------

function finishProcessing() {

    processedStats = [];

    for (
        const [aula, registros]
        of Object.entries(rawData)
    ) {

        const stats =
            processClassroomData(
                aula,
                registros
            );

        processedStats.push(stats);
    }

    processedStats.sort(

        (a, b) =>

            (b.eta27 || 0)

            -

            (a.eta27 || 0)
    );

    console.log(
        "Aulas procesadas:",
        processedStats
    );

    updateSummary();

    populateTable();

    createCharts();
    createHeatmaps();

    document
        .getElementById(
            "processing-status"
        )
        .classList.add("hidden");

    document
        .getElementById(
            "results-summary"
        )
        .classList.remove("hidden");

    document
        .getElementById(
            "btn-informe"
        )
        .disabled = false;

    document
        .getElementById(
            "btn-dashboard"
        )
        .disabled = false;
    document
        .getElementById(
            "btn-mapas"
        )
        .disabled = false;

    document
        .getElementById(
            "btn-aula"
        )
        .disabled = false;

    const guardar =
        document.getElementById("btn-guardar");

    if (guardar) {
        guardar.disabled = false;
    }

    // Mostrar la barra del horario evaluado
    const barraHorario =
        document.getElementById("schedule-bar");

    if (barraHorario) {
        barraHorario.classList.remove("is-hidden");
    }

    // Llevar la vista al resumen si se está en Inicio
    const resumen =
        document.getElementById("results-summary");

    const inicio =
        document.getElementById("tab-importar");

    if (
        resumen &&
        resumen.scrollIntoView &&
        inicio &&
        inicio.classList.contains("active")
    ) {
        resumen.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    // Inicializar el selector de aulas
    if (typeof initAulaSelector === "function") {
        initAulaSelector();
    }
}
