// =====================================================
// Agente Clima IES v1.7e - Interpretación metodológica del mapa DI
// heatmaps.js
// Mapa Temperatura + DI
// =====================================================

function createHeatmaps() {

    createHeatmap();

}

function createHeatmap() {

    const container =
        document.getElementById(
            "temperatureHeatmap"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const aulas = Object.keys(rawData).sort((a, b) => {
        const getFloor = (name) => {
            if (name.startsWith("A0")) return 0;
            if (name.startsWith("A1")) return 1;
            if (name.startsWith("A2")) return 2;
            return 3; // Resto de sensores (G017, Móviles, etc.)
        };
        const floorA = getFloor(a);
        const floorB = getFloor(b);
        if (floorA !== floorB) {
            return floorA - floorB;
        }
        return a.localeCompare(b);
    });

    if (!aulas.length) {
        return;
    }

    // =====================================
    // Fechas disponibles
    // =====================================

    const fechas = new Set();

    aulas.forEach(aula => {

        rawData[aula].forEach(r => {

            fechas.add(
                localDateKey(r.timestamp)
            );

        });

    });

    const fechasOrdenadas =
        [...fechas].sort();

    // =====================================
    // Selector de fecha
    // =====================================

    const selector =
        document.getElementById(
            "daySelector"
        );

    if (selector) {

        const valorAnterior =
            selector.value;

        selector.innerHTML = "";

        fechasOrdenadas.forEach(fecha => {

            selector.innerHTML += `
                <option value="${fecha}">
                    ${fecha}
                </option>
            `;

        });

        if (
            valorAnterior &&
            fechasOrdenadas.includes(
                valorAnterior
            )
        ) {

            selector.value =
                valorAnterior;

        } else {

            selector.value =
                fechasOrdenadas[0];

        }

        selector.onchange =
            function() {

                createHeatmap();

            };

    }

    // =====================================
    // Selector tipo mapa
    // =====================================

    const mapTypeSelector =
        document.getElementById(
            "mapTypeSelector"
        );

    const tipoMapa =
        mapTypeSelector
            ? mapTypeSelector.value
            : "temperature";

    if (mapTypeSelector) {

        mapTypeSelector.onchange =
            function() {

                createHeatmap();

            };

    }

    const fechaSeleccionada =
        selector
            ? selector.value
            : fechasOrdenadas[0];

    // =====================================
    // Vista: un día (todas las aulas) o
    // un aula (todos los días)
    // =====================================

    const viewSelector =
        document.getElementById("mapViewSelector");

    const aulaSelector =
        document.getElementById("mapAulaSelector");

    const vista =
        viewSelector
            ? viewSelector.value
            : "day";

    if (viewSelector) {
        viewSelector.onchange =
            function() {
                createHeatmap();
            };
    }

    if (aulaSelector) {

        const aulaAnterior = aulaSelector.value;

        aulaSelector.innerHTML = "";

        aulas.forEach(aula => {
            const opcion = document.createElement("option");
            opcion.value = aula;
            opcion.textContent = aula;
            aulaSelector.appendChild(opcion);
        });

        aulaSelector.value =
            aulas.includes(aulaAnterior)
                ? aulaAnterior
                : aulas[0];

        aulaSelector.onchange =
            function() {
                createHeatmap();
            };
    }

    const grupoDia =
        document.getElementById("mapDayGroup");

    const grupoAula =
        document.getElementById("mapAulaGroup");

    if (grupoDia && grupoDia.classList) {
        grupoDia.classList.toggle("is-hidden", vista !== "day");
    }

    if (grupoAula && grupoAula.classList) {
        grupoAula.classList.toggle("is-hidden", vista !== "aula");
    }

    if (vista === "aula" && aulaSelector) {

        container.innerHTML =
            buildAulaHeatmap(
                aulaSelector.value,
                tipoMapa
            );

        return;
    }

    const diaLectivo =
        scheduleConfig.days.includes(
            new Date(fechaSeleccionada + "T12:00:00").getDay()
        );
// =====================================
// Resumen ejecutivo
// =====================================

let valorMaximo = -Infinity;
let aulaMaxima = "";

let sumaGlobal = 0;
let contadorGlobal = 0;

let aulasSobre27 = 0;
let aulasSobre30 = 0;

let aulasDI27 = 0;
let aulasDI29 = 0;
let aulasDI32 = 0;

let aulasHI33 = 0;
let aulasHI41 = 0;
let aulasHI52 = 0;

aulas.forEach(aula => {

    let maxAula = -Infinity;

    rawData[aula].forEach(r => {

        const fechaRegistro =
            localDateKey(r.timestamp);

        if (
            fechaRegistro !==
            fechaSeleccionada
        ) {
            return;
        }

        const valor =
            tipoMapa === "temperature"
            ? r.temp
            : tipoMapa === "heatindex"
            ? calculateHeatIndex(r.temp, r.hum)
            : calculateThomIndex(
                r.temp,
                r.hum
            );

        sumaGlobal += valor;
        contadorGlobal++;

        if (valor > maxAula) {
            maxAula = valor;
        }

        if (valor > valorMaximo) {

            valorMaximo = valor;

            aulaMaxima = aula;

        }

    });

    if (tipoMapa === "temperature") {

        if (maxAula > 27) {
            aulasSobre27++;
        }

        if (maxAula > 30) {
            aulasSobre30++;
        }

    } else if (tipoMapa === "heatindex") {

        if (maxAula >= 32) {
            aulasHI33++;
        }

        if (maxAula >= 41) {
            aulasHI41++;
        }

        if (maxAula >= 52) {
            aulasHI52++;
        }

    } else {

        if (maxAula >= 27) {
            aulasDI27++;
        }

        if (maxAula >= 29) {
            aulasDI29++;
        }

        if (maxAula >= 32) {
            aulasDI32++;
        }

    }

});

const mediaGlobal =
    contadorGlobal > 0
    ? sumaGlobal / contadorGlobal
    : 0;
    // =====================================
    // Cabecera
    // =====================================

    let html = "";

    html += `
    <h3 class="font-bold text-lg mb-4">
        ${
            tipoMapa === "temperature"
            ? "Mapa térmico diario"
            : tipoMapa === "heatindex"
            ? "Mapa Heat Index diario"
            : "Mapa DI diario"
        }
    </h3>

    <p class="mb-4">
        Fecha seleccionada:
        <strong>${fechaSeleccionada}</strong>
    </p>

    <p class="mb-4">
        Número de días detectados:
        ${fechasOrdenadas.length}
    </p>
    `;
const iResumen = html.length;

html += `
<div class="mb-6 p-4 bg-slate-50 border rounded">

<h4 class="font-bold mb-2">
Resumen ejecutivo del día
</h4>

<p>
Aulas analizadas:
<strong>${aulas.length}</strong>
</p>
`;

if (tipoMapa === "temperature") {

    html += `
    <p>
    Temperatura media global:
    <strong>${mediaGlobal.toFixed(1)} °C</strong>
    </p>

    <p>
    Temperatura máxima:
    <strong>
    ${valorMaximo.toFixed(1)} °C
    (${aulaMaxima})
    </strong>
    </p>

    <p>
    Aulas con temperatura &gt;27 °C:
    <strong>${aulasSobre27}</strong>
    </p>

    <p>
    Aulas con temperatura &gt;30 °C:
    <strong>${aulasSobre30}</strong>
    </p>
    `;

} else if (tipoMapa === "heatindex") {

    html += `
    <p>
    HI medio global:
    <strong>${mediaGlobal.toFixed(1)}</strong>
    </p>

    <p>
    HI máximo:
    <strong>
    ${valorMaximo.toFixed(1)}
    (${aulaMaxima})
    </strong>
    </p>

    <p>
    Aulas con HI ≥32 (Precaución extrema o superior):
    <strong>${aulasHI33}</strong>
    </p>

    <p>
    Aulas con HI ≥41 (Peligro o superior):
    <strong>${aulasHI41}</strong>
    </p>

    <p>
    Aulas con HI ≥52 (Peligro extremo o superior):
    <strong>${aulasHI52}</strong>
    </p>
    `;

} else {

    html += `
    <p>
    DI medio global:
    <strong>${mediaGlobal.toFixed(1)}</strong>
    </p>

    <p>
    DI máximo:
    <strong>
    ${valorMaximo.toFixed(1)}
    (${aulaMaxima})
    </strong>
    </p>

    <p>
    Aulas con DI ≥27:
    <strong>${aulasDI27}</strong>
    </p>

    <p>
    Aulas con DI ≥29:
    <strong>${aulasDI29}</strong>
    </p>

    <p>
    Aulas con DI ≥32:
    <strong>${aulasDI32}</strong>
    </p>
    `;

}

html += `</div>`;

    const iLeyenda = html.length;

    // =====================================
    // Leyenda
    // =====================================

    if (tipoMapa === "temperature") {

        html += `
        <div class="flex flex-wrap gap-4 mb-4 text-sm">

            <div class="flex items-center gap-2">
                <span class="temp-muy-frio border px-3 py-1"></span>
                <span>&lt; 22°C</span>
            </div>

            <div class="flex items-center gap-2">
                <span class="temp-confortable border px-3 py-1"></span>
                <span>22–25°C</span>
            </div>

            <div class="flex items-center gap-2">
                <span class="temp-calido border px-3 py-1"></span>
                <span>25–27°C</span>
            </div>

            <div class="flex items-center gap-2">
                <span class="temp-calor border px-3 py-1"></span>
                <span>27–30°C</span>
            </div>

            <div class="flex items-center gap-2">
                <span class="temp-extremo border px-3 py-1"></span>
                <span>&gt; 30°C</span>
            </div>

        </div>
        `;

    } else if (tipoMapa === "heatindex") {

        html += `
        <div class="flex flex-wrap gap-4 mb-4 text-sm">

            <div class="flex items-center gap-2">
                <span class="hi-safe border px-3 py-1"></span>
                <span>&lt; 27</span>
            </div>

            <div class="flex items-center gap-2">
                <span class="hi-caution border px-3 py-1"></span>
                <span>27–32</span>
            </div>

            <div class="flex items-center gap-2">
                <span class="hi-extreme-caution border px-3 py-1"></span>
                <span>32–41</span>
            </div>

            <div class="flex items-center gap-2">
                <span class="hi-danger border px-3 py-1"></span>
                <span>41–52</span>
            </div>

            <div class="flex items-center gap-2">
                <span class="hi-extreme-danger border px-3 py-1"></span>
                <span>52–93</span>
            </div>

            <div class="flex items-center gap-2">
                <span class="hi-limit border px-3 py-1"></span>
                <span>&gt; 93</span>
            </div>

        </div>

        <div class="mt-4 mb-6 overflow-x-auto">

        <table class="min-w-full border text-sm">

        <thead>
        <tr>
        <th>Heat Index (HI)</th>
        <th>Nivel de Riesgo (NWS)</th>
        <th>Efectos sobre la salud</th>
        </tr>
        </thead>

        <tbody>

        <tr>
        <td>&lt; 27</td>
        <td>Seguro</td>
        <td>No se esperan efectos adversos. La termorregulación funciona con normalidad.</td>
        </tr>

        <tr>
        <td>27 – 32</td>
        <td>Precaución</td>
        <td>Fatiga posible con exposición prolongada y/o actividad física.</td>
        </tr>

        <tr>
        <td>32 – 41</td>
        <td>Precaución extrema</td>
        <td>Posibles calambres y agotamiento por calor. La evaporación del sudor comienza a ser insuficiente.</td>
        </tr>

        <tr>
        <td>41 – 52</td>
        <td>Peligro</td>
        <td>Calambres y agotamiento probables; posible golpe de calor.</td>
        </tr>

        <tr>
        <td>52 – 93</td>
        <td>Peligro extremo</td>
        <td>Golpe de calor altamente probable. Mecanismos fisiológicos casi agotados.</td>
        </tr>

        <tr>
        <td>&gt; 93</td>
        <td>Límite fisiológico</td>
        <td>Aumento continuo de temperatura corporal. Imposibilidad total de termorregulación.</td>
        </tr>

        </tbody>

        </table>

        <p class="mt-3 text-sm text-slate-600">

        El Heat Index combina la temperatura y la humedad relativa para evaluar el estrés térmico fisiológico real. Los cálculos se basan en el modelo termodinámico estricto de Lu & Romps (2022).

        </p>

        </div>
        `;

    } else {

        html += `
        <div class="flex flex-wrap gap-4 mb-4 text-sm">

            <div class="flex items-center gap-2">
                <span class="di-confortable border px-3 py-1"></span>
                <span>&lt; 21</span>
            </div>

            <div class="flex items-center gap-2">
                <span class="di-ligero border px-3 py-1"></span>
                <span>21–24</span>
            </div>

            <div class="flex items-center gap-2">
                <span class="di-moderado border px-3 py-1"></span>
                <span>24–27</span>
            </div>

            <div class="flex items-center gap-2">
                <span class="di-severo border px-3 py-1"></span>
                <span>27–29</span>
            </div>

            <div class="flex items-center gap-2">
                <span class="di-intenso border px-3 py-1"></span>
                <span>29–32</span>
            </div>

            <div class="flex items-center gap-2">
                <span class="di-extremo border px-3 py-1"></span>
                <span>&gt; 32</span>
            </div>

                </div>

        <div class="mt-4 mb-6 overflow-x-auto">

        <table class="min-w-full border text-sm">

        <thead>
        <tr>
        <th>DI</th>
        <th>Interpretación</th>
        </tr>
        </thead>

        <tbody>

        <tr>
        <td>&lt; 21</td>
        <td>Confortable</td>
        </tr>

        <tr>
        <td>21 – 24</td>
        <td>Ligero disconfort</td>
        </tr>

        <tr>
        <td>24 – 27</td>
        <td>Disconfort moderado</td>
        </tr>

        <tr>
        <td>27 – 29</td>
        <td>Disconfort severo</td>
        </tr>

        <tr>
        <td>29 – 32</td>
        <td>Estrés térmico intenso</td>
        </tr>

        <tr>
        <td>&gt; 32</td>
        <td>Estrés térmico extremo</td>
        </tr>

        </tbody>

        </table>

        <p class="mt-3 text-sm text-slate-600">

        El Índice de Disconfort (DI) combina la temperatura y la humedad relativa para estimar el grado de incomodidad térmica percibida. La clasificación utilizada se basa en la interpretación clásica del Índice de Thom.

        </p>

        </div>
        `;

    }

    const iTabla = html.length;

    // =====================================
    // Tabla
    // =====================================

    html += heatmapScheduleHint();

    html +=
        '<div class="heatmap-scroll"><table class="min-w-full border text-xs heatmap-table">';

    html += "<tr>";

    html +=
        "<th class='border p-1'>Aula</th>";

    for (
        let hora = 0;
        hora < 24;
        hora++
    ) {

        html +=
            `<th class='border p-1 ${diaLectivo && hourIsLectivo(hora) ? "hm-lectivo" : ""}'>${hora}</th>`;

    }

    html += "</tr>";

    aulas.forEach(aula => {

        html += "<tr>";

        html += `
        <td class='border p-1 font-bold'>
            ${aula}
        </td>
        `;

        const mediasHora = {};

        rawData[aula].forEach(r => {

            const fechaRegistro =
                localDateKey(r.timestamp);

            if (
                fechaRegistro !==
                fechaSeleccionada
            ) {
                return;
            }

            const hora =
                r.timestamp.getHours();

            if (!mediasHora[hora]) {

                mediasHora[hora] = [];

            }

            if (
                tipoMapa ===
                "temperature"
            ) {

                mediasHora[hora].push(
                    r.temp
                );

            } else if (
                tipoMapa ===
                "heatindex"
            ) {

                mediasHora[hora].push(
                    calculateHeatIndex(
                        r.temp,
                        r.hum
                    )
                );

            } else {

                mediasHora[hora].push(
                    calculateThomIndex(
                        r.temp,
                        r.hum
                    )
                );

            }

        });

        for (
            let hora = 0;
            hora < 24;
            hora++
        ) {

            if (
                mediasHora[hora]
            ) {

                const media =
                    mediasHora[hora]
                        .reduce(
                            (a, b) => a + b,
                            0
                        ) /
                    mediasHora[hora]
                        .length;

                let clase = "";

                if (
                    tipoMapa ===
                    "temperature"
                ) {

                    if (media < 22) {

                        clase =
                            "temp-muy-frio";

                    } else if (
                        media < 25
                    ) {

                        clase =
                            "temp-confortable";

                    } else if (
                        media < 27
                    ) {

                        clase =
                            "temp-calido";

                    } else if (
                        media < 30
                    ) {

                        clase =
                            "temp-calor";

                    } else {

                        clase =
                            "temp-extremo";

                    }

                } else if (
                    tipoMapa ===
                    "heatindex"
                ) {

                    const hiResult = classifyHeatIndex(media);
                    clase = hiResult ? hiResult.className : "";

                } else {

                    if (media < 21) {

                        clase =
                            "di-confortable";

                    } else if (
                        media < 24
                    ) {

                        clase =
                            "di-ligero";

                    } else if (
                        media < 27
                    ) {

                        clase =
                            "di-moderado";

                    } else if (
                        media < 29
                    ) {

                        clase =
                            "di-severo";

                    } else if (
                        media < 32
                    ) {

                        clase =
                            "di-intenso";

                    } else {

                        clase =
                            "di-extremo";

                    }

                }

                html += `
                <td class="border p-1 ${clase}">
                    ${media.toFixed(1)}
                </td>
                `;

            } else {

                html +=
                    "<td class='border'></td>";

            }

        }

        html += "</tr>";

    });

    html += "</table></div>";

    // Orden final: cabecera, leyenda, mapa, resumen del día
    // y, plegada, la tabla de interpretación.
    const cabecera = html.slice(0, iResumen);
    const resumen = html.slice(iResumen, iLeyenda);
    const leyenda = html.slice(iLeyenda, iTabla);
    const tabla = html.slice(iTabla);

    const iInterpretacion =
        leyenda.indexOf('<div class="mt-4 mb-6 overflow-x-auto">');

    const colores =
        iInterpretacion >= 0
        ? leyenda.slice(0, iInterpretacion)
        : leyenda;

    const interpretacion =
        iInterpretacion >= 0
        ? '<details class="fold mt-4"><summary>Cómo interpretar los valores</summary>' +
          leyenda.slice(iInterpretacion) +
          "</details>"
        : "";

    container.innerHTML =
        cabecera +
        colores +
        tabla +
        '<div class="mt-6">' + resumen + "</div>" +
        interpretacion;

}

// =====================================================
// Utilidades comunes de los mapas
// =====================================================

function hourIsLectivo(hora) {

    return (
        scheduleConfig.enabled &&
        hora * 60 >= timeToMinutes(scheduleConfig.start) &&
        hora * 60 < timeToMinutes(scheduleConfig.end)
    );
}

function heatmapScheduleHint() {

    return scheduleConfig.enabled
        ? '<p class="text-xs text-slate-600 mb-2"><span class="hm-lectivo-key"></span> Horas con la cabecera resaltada: horario lectivo.</p>'
        : "";
}

function heatmapValue(tipoMapa, registro) {

    if (tipoMapa === "temperature") {
        return registro.temp;
    }

    if (tipoMapa === "heatindex") {
        return calculateHeatIndex(registro.temp, registro.hum);
    }

    return calculateThomIndex(registro.temp, registro.hum);
}

function heatmapCellClass(tipoMapa, valor) {

    if (tipoMapa === "temperature") {
        if (valor < 22) return "temp-muy-frio";
        if (valor < 25) return "temp-confortable";
        if (valor < 27) return "temp-calido";
        if (valor < 30) return "temp-calor";
        return "temp-extremo";
    }

    if (tipoMapa === "heatindex") {
        const hi = classifyHeatIndex(valor);
        return hi ? hi.className : "";
    }

    const di = classifyThomInfo(valor);
    return di ? di.className : "";
}

function heatmapLegendHTML(tipoMapa) {

    let elementos;

    if (tipoMapa === "temperature") {

        elementos = [
            ["temp-muy-frio", "< 22 °C"],
            ["temp-confortable", "22–25 °C"],
            ["temp-calido", "25–27 °C"],
            ["temp-calor", "27–30 °C"],
            ["temp-extremo", "> 30 °C"]
        ];

    } else {

        const niveles =
            tipoMapa === "heatindex" ? HI_LEVELS : DI_LEVELS;

        let anterior = null;

        elementos = niveles.map(nivel => {

            const rango =
                anterior === null
                    ? `< ${nivel.max}`
                    : nivel.max === Infinity
                    ? `> ${anterior}`
                    : `${anterior}–${nivel.max}`;

            anterior = nivel.max;

            return [
                nivel.className,
                `${rango} · ${nivel.category}`
            ];
        });
    }

    return (
        '<div class="flex flex-wrap gap-4 mb-4 text-sm">' +
        elementos.map(e =>
            `<div class="flex items-center gap-2"><span class="${e[0]} border px-3 py-1"></span><span>${e[1]}</span></div>`
        ).join("") +
        "</div>"
    );
}

// =====================================================
// Mapa de un aula: una fila por día, una columna por hora
// =====================================================

function buildAulaHeatmap(aula, tipoMapa) {

    const registros = rawData[aula] || [];

    const porDia = {};

    registros.forEach(r => {

        const valor = heatmapValue(tipoMapa, r);

        if (!Number.isFinite(valor)) {
            return;
        }

        const dia = localDateKey(r.timestamp);
        const hora = r.timestamp.getHours();

        if (!porDia[dia]) {
            porDia[dia] = {};
        }

        if (!porDia[dia][hora]) {
            porDia[dia][hora] = [];
        }

        porDia[dia][hora].push(valor);
    });

    const dias = Object.keys(porDia).sort();

    const nombres = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

    const titulo =
        tipoMapa === "temperature"
        ? "Temperatura"
        : tipoMapa === "heatindex"
        ? "Heat Index"
        : "Índice de Disconfort (DI)";

    let html = `
    <h3 class="font-bold text-lg mb-2">
        ${titulo} hora a hora · aula ${aula}
    </h3>

    <p class="mb-4 text-sm text-slate-600">
        Cada fila es un día y cada columna una hora. Cada celda muestra la media de esa hora. Días registrados: ${dias.length}.
    </p>
    `;

    html += heatmapLegendHTML(tipoMapa);

    html += heatmapScheduleHint();

    html +=
        '<div class="heatmap-scroll"><table class="min-w-full border text-xs heatmap-table">';

    html += "<tr><th class='border p-1'>Día</th>";

    for (let hora = 0; hora < 24; hora++) {
        html +=
            `<th class='border p-1 ${hourIsLectivo(hora) ? "hm-lectivo" : ""}'>${hora}</th>`;
    }

    html += "</tr>";

    dias.forEach(dia => {

        const partes = dia.split("-").map(Number);

        const fecha =
            new Date(partes[0], partes[1] - 1, partes[2]);

        const lectivo =
            !scheduleConfig.enabled ||
            scheduleConfig.days.includes(fecha.getDay());

        const etiqueta =
            `${nombres[fecha.getDay()]} ${String(partes[2]).padStart(2, "0")}/${String(partes[1]).padStart(2, "0")}`;

        html +=
            `<tr><td class='border p-1 font-bold whitespace-nowrap ${lectivo ? "" : "hm-no-lectivo"}'>${etiqueta}</td>`;

        for (let hora = 0; hora < 24; hora++) {

            const valores = porDia[dia][hora];

            if (!valores) {
                html += "<td class='border'></td>";
                continue;
            }

            const media =
                valores.reduce((a, b) => a + b, 0) /
                valores.length;

            html +=
                `<td class="border p-1 ${heatmapCellClass(tipoMapa, media)}">${media.toFixed(1)}</td>`;
        }

        html += "</tr>";
    });

    html += "</table></div>";

    return html;
}
