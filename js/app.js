// =====================================================
let currentTab = "importar";

function openTab(tabId) {

    currentTab = tabId;

    document
        .querySelectorAll(".tab-content")
        .forEach(tab => {
            tab.classList.remove("active");
        });

    document
        .getElementById(`tab-${tabId}`)
        .classList.add("active");

    // Marcar la pestaña activa en la navegación
    document
        .querySelectorAll(".tab-button")
        .forEach(boton => {

            const activa =
                boton.id === `btn-${tabId}`;

            boton.classList.toggle("active-tab", activa);

            boton.setAttribute(
                "aria-selected",
                activa ? "true" : "false"
            );

            if (activa && boton.scrollIntoView) {
                boton.scrollIntoView({
                    block: "nearest",
                    inline: "nearest"
                });
            }
        });

    updateScheduleNotes();

    window.scrollTo(0, 0);
}

// -----------------------------------------------------
// Datos de ejemplo
//
// Dos semanas de registros inventados (cada 15 minutos)
// de seis aulas en tres plantas, con una ola de calor y
// un hueco de datos. Se generan siempre igual.
// -----------------------------------------------------

// -----------------------------------------------------
// Datos de demostración
//
// Se cargan de data/ejemplo.js solo cuando se piden, para
// no retrasar el arranque. Son registros de 21 aulas con
// nombres ficticios. Si el archivo no está disponible se
// usa un conjunto sintético generado al momento.
// -----------------------------------------------------

function loadSampleData() {

    const estado =
        document.getElementById("processing-status");

    if (estado) {
        estado.classList.remove("hidden");
    }

    const usar = () => {

        const ejemplo = window.AGENTE_CLIMA_EJEMPLO;

        const datos = {};

        Object.keys(ejemplo.aulas).forEach(aula => {

            const serie = ejemplo.aulas[aula];

            let minutos = ejemplo.base;

            datos[aula] = serie.t.map((paso, i) => {

                minutos += paso;

                return {
                    timestamp: new Date(minutos * 60000),
                    temp: serie.T[i] / 10,
                    hum: serie.H[i] / 10
                };
            });
        });

        rawData = datos;

        importWarnings = [
            "estás viendo datos de demostración; los nombres de las aulas son ficticios."
        ];

        // Dejar que se pinte el aviso de «Procesando» antes de calcular
        setTimeout(finishProcessing, 30);
    };

    if (window.AGENTE_CLIMA_EJEMPLO) {
        usar();
        return;
    }

    const script = document.createElement("script");

    script.src = "data/ejemplo.js";

    script.onload = usar;

    script.onerror = () => {
        console.warn("No se ha podido cargar data/ejemplo.js; se usan datos sintéticos.");
        loadSyntheticSample();
    };

    document.head.appendChild(script);
}

// Conjunto sintético de reserva
function loadSyntheticSample() {

    let semilla = 20250602;

    const azar = () => {
        semilla = (semilla * 1664525 + 1013904223) % 4294967296;
        return semilla / 4294967296;
    };

    const aulas = [
        { nombre: "A01", extra: 0.0, amplitud: 2.6 },
        { nombre: "A02", extra: 0.9, amplitud: 3.0 },
        { nombre: "A11", extra: 1.9, amplitud: 3.4 },
        { nombre: "A12", extra: 2.7, amplitud: 4.0 },
        { nombre: "A21", extra: 4.0, amplitud: 4.6 },
        { nombre: "A22", extra: 3.3, amplitud: 4.2 }
    ];

    const inicio = new Date(2025, 5, 2, 0, 0).getTime();
    const dias = 14;
    const paso = 15 * 60 * 1000;

    const datos = {};

    aulas.forEach(aula => {

        const registros = [];

        let ruido = 0;

        for (let i = 0; i < dias * 96; i++) {

            const fecha = new Date(inicio + i * paso);

            const dia = Math.floor(i / 96);

            const hora =
                fecha.getHours() + fecha.getMinutes() / 60;

            // Hueco de datos: sensor del aula A11 parado una mañana
            if (
                aula.nombre === "A11" &&
                dia === 4 &&
                hora >= 6 &&
                hora < 12
            ) {
                continue;
            }

            // Tendencia de fondo y ola de calor (días 9 a 12)
            const fondo =
                20.6 +
                dia * 0.12 +
                (dia >= 8 && dia <= 11 ? 2.8 : 0);

            // Ciclo diario con máximo hacia las 16 h
            const ciclo =
                Math.sin(((hora - 10) / 24) * 2 * Math.PI);

            ruido = ruido * 0.9 + (azar() - 0.5) * 0.25;

            const temp =
                fondo +
                aula.extra +
                aula.amplitud * ciclo +
                ruido;

            const hum =
                Math.min(
                    85,
                    Math.max(
                        22,
                        56 - 2.1 * (temp - 24) + (azar() - 0.5) * 3
                    )
                );

            registros.push({
                timestamp: fecha,
                temp: Math.round(temp * 10) / 10,
                hum: Math.round(hum * 10) / 10
            });
        }

        datos[aula.nombre] = registros;
    });

    rawData = datos;

    importWarnings = [
        "estás viendo datos de ejemplo generados por la aplicación; no son mediciones reales."
    ];

    finishProcessing();
}

// -----------------------------------------------------
// Resumen
// -----------------------------------------------------
function updateSummary() {
const evaluables =
    processedStats.filter(
        s =>
        s.estado === "Evaluable"
    );
const cumplenRD =
    evaluables.filter(
        s =>
        s.cumpleRD
    ).length;
const incumplenRD =
    evaluables.filter(
        s =>
        s.cumpleRD === false
    ).length;
document
    .getElementById(
        "summary-list"
    )
    .innerHTML = `
<li>
<strong>Aulas evaluadas:</strong>
${evaluables.length}
</li>
<li>
<strong>Cumplen RD486:</strong>
${cumplenRD}
</li>
<li>
<strong>No cumplen RD486:</strong>
${incumplenRD}
</li>
`;
// Avisos de la importación (filas descartadas, fechas ambiguas...)
if (
    typeof importWarnings !== "undefined" &&
    importWarnings.length > 0
) {
    const lista =
        document.getElementById("summary-list");
    importWarnings.forEach(aviso => {
        const li = document.createElement("li");
        li.className = "md:col-span-2 lg:col-span-3 text-amber-800";
        li.textContent = "Aviso: " + aviso;
        lista.appendChild(li);
    });
}
}
// -----------------------------------------------------
// Tabla informe
// -----------------------------------------------------

// -----------------------------------------------------
// Horario lectivo (controles de la pestaña Informe)
// -----------------------------------------------------

function syncScheduleUI() {

    const activo =
        document.getElementById("scheduleEnabled");

    if (!activo) return;

    activo.checked = scheduleConfig.enabled;

    document.getElementById("scheduleStart").value =
        scheduleConfig.start;

    document.getElementById("scheduleEnd").value =
        scheduleConfig.end;

    document
        .querySelectorAll(".schedule-day")
        .forEach(casilla => {
            casilla.checked =
                scheduleConfig.days.includes(
                    Number(casilla.value)
                );
        });
}

function updateScheduleNotes() {

    const texto =
        "Horas de exposición, ETA27, porcentajes, severidad y " +
        "cumplimiento del RD 486/1997 evaluados en: " +
        describeSchedule() +
        ". Medias, mínimos y máximos: todo el periodo registrado.";

    document
        .querySelectorAll(".schedule-note")
        .forEach(nota => {
            nota.textContent = texto;
        });

    // Resumen corto (barra común y tarjeta de Inicio)
    const corto =
        scheduleConfig.enabled
        ? describeSchedule()
            .replace("horario lectivo (", "")
            .replace(/\)$/, "")
        : "24 h, todos los días";

    document
        .querySelectorAll(".schedule-summary-text")
        .forEach(elemento => {
            elemento.textContent = corto;
        });

    // En Mapas y Análisis por aula el horario no filtra nada
    const alcance =
        document.getElementById("scheduleScopeNote");

    if (alcance) {
        alcance.textContent =
            currentTab === "mapas" || currentTab === "aula"
            ? "(esta vista muestra siempre todo el periodo)"
            : "";
    }
}

function toggleScheduleEditor(abrir) {

    const editor =
        document.getElementById("schedule-editor");

    const boton =
        document.getElementById("scheduleToggle");

    if (!editor || !boton) return;

    const mostrar =
        typeof abrir === "boolean"
        ? abrir
        : editor.classList.contains("is-hidden");

    if (mostrar) {
        // Partir siempre del horario vigente
        syncScheduleUI();
        document.getElementById("scheduleError").textContent = "";
    }

    editor.classList.toggle("is-hidden", !mostrar);

    boton.setAttribute(
        "aria-expanded",
        mostrar ? "true" : "false"
    );

    boton.textContent =
        mostrar ? "Cerrar" : "Cambiar";

    if (mostrar) {
        window.scrollTo(0, 0);
        document.getElementById("scheduleEnabled").focus();
    }
}

function applySchedule() {

    const error =
        document.getElementById("scheduleError");

    const inicio =
        document.getElementById("scheduleStart").value;

    const fin =
        document.getElementById("scheduleEnd").value;

    const dias =
        Array.from(
            document.querySelectorAll(".schedule-day")
        )
        .filter(casilla => casilla.checked)
        .map(casilla => Number(casilla.value));

    const activo =
        document.getElementById("scheduleEnabled").checked;

    if (
        activo &&
        (
            !inicio ||
            !fin ||
            timeToMinutes(fin) <= timeToMinutes(inicio) ||
            dias.length === 0
        )
    ) {
        error.textContent =
            "Revisa el horario: elige al menos un día y una hora de fin posterior a la de inicio.";
        return;
    }

    error.textContent = "";

    toggleScheduleEditor(false);

    scheduleConfig.enabled = activo;

    if (activo) {
        scheduleConfig.days = dias;
        scheduleConfig.start = inicio;
        scheduleConfig.end = fin;
    }

    if (Object.keys(rawData).length > 0) {
        finishProcessing();
    } else {
        updateScheduleNotes();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    syncScheduleUI();
    updateScheduleNotes();
});

function populateTable() {

    updateScheduleNotes();

    const tbody =
        document.getElementById(
            "informe-tbody"
        );

    tbody.innerHTML = "";

    const claseDI = di => {
        const info = classifyThomInfo(di);
        return info ? info.className : "";
    };

    const claseHI = resultado =>
        resultado ? resultado.className : "";

    const num = (valor, decimales) =>
        Number.isFinite(valor)
        ? valor.toFixed(decimales)
        : "–";

    processedStats.forEach(stat => {

        if (
            stat.estado !==
            "Evaluable"
        ) {
            return;
        }

        const cumpleClase =
            stat.cumpleRD
            ? "estado-cumple"
            : stat.cumpleRD === false
            ? "estado-incumple"
            : "";

        const cumpleTexto =
            stat.cumpleRD
            ? "✔ Cumple"
            : stat.cumpleRD === false
            ? "✘ No cumple"
            : "Sin datos lectivos";

        const severidadClase =
            `estado-${stat.severidad.toLowerCase().replace(" ", "-")}`;

        const aula = escapeHTML(stat.aula);

        tbody.innerHTML += `

<tr>

<th scope="row"><button class="link-button aula-link" data-aula="${aula}">${aula}</button></th>

<td class="${severidadClase}">${stat.severidad}</td>
<td class="${cumpleClase}">${cumpleTexto}</td>

<td>${num(stat.tMedia, 1)}</td>
<td>${num(stat.tMax, 1)}</td>
<td>${num(stat.horasMenos17, 1)}</td>
<td>${num(stat.horasMas27, 1)}</td>
<td>${num(stat.eta27, 1)}</td>

<td>${num(stat.hrMedia, 1)}</td>
<td class="col-extra">${num(stat.hrMin, 1)}</td>
<td class="col-extra">${num(stat.hrMax, 1)}</td>
<td>${num(stat.porcentajeHRFueraRango, 1)}</td>

<td class="${claseDI(stat.diMedia)}">${num(stat.diMedia, 1)}</td>
<td class="${claseDI(stat.diMax)}">${num(stat.diMax, 1)}</td>
<td class="col-extra">${stat.categoriaConfort}</td>
<td class="col-extra">${num(stat.horasDI24, 1)}</td>
<td class="col-extra">${num(stat.horasDI27, 1)}</td>
<td>${num(stat.porcentajeDI24, 1)}</td>
<td class="col-extra">${num(stat.porcentajeDI27, 1)}</td>

<td class="${claseHI(stat.hiResult)}">${num(stat.hiMedia, 1)}</td>
<td class="${claseHI(stat.hiMaxResult)}">${num(stat.hiMax, 1)}</td>

</tr>

`;
    });

    // Abrir el análisis de un aula al pulsar su nombre
    tbody.onclick = evento => {

        const boton =
            evento.target.closest
            ? evento.target.closest("[data-aula]")
            : null;

        if (boton) {
            openAula(boton.dataset.aula);
        }
    };
}

// Mostrar u ocultar las columnas secundarias del informe
function toggleReportColumns(mostrar) {

    const tabla =
        document.getElementById("informe-table");

    if (!tabla) return;

    tabla.classList.toggle("show-extra", mostrar);

    tabla
        .querySelectorAll("th[data-min]")
        .forEach(grupo => {
            grupo.colSpan =
                Number(
                    mostrar
                    ? grupo.dataset.max
                    : grupo.dataset.min
                );
        });
}
