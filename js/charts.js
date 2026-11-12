// =====================================================
// Agente Clima IES v2.3
// charts.js
// Gráficos del Dashboard y utilidades comunes de dibujo
// =====================================================

const dashboardCharts = {};

let chartEvolution = null;

// Colores de las franjas de temperatura (igual que el mapa térmico)
const TEMP_BANDS = [
    { label: "< 17 °C", color: "#93c5fd" },
    { label: "17–25 °C", color: "#86efac" },
    { label: "25–27 °C", color: "#fde047" },
    { label: "27–30 °C", color: "#fb923c" },
    { label: "> 30 °C", color: "#ef4444" }
];

const CHART_TEAL = "#0f766e";
const CHART_ORANGE = "#f97316";
const CHART_BLUE = "#60a5fa";

// -----------------------------------------------------
// Complemento de dibujo común
//
// Se configura en options.plugins.clima:
//   bands:        [{ from, to, color }]  franjas sobre el eje de valores
//   lines:        [{ value, label, color }]  líneas de umbral
//   lectivo:      true  sombrea el horario lectivo (eje de tiempo)
//   emptyMessage: texto si todos los valores son cero
// -----------------------------------------------------

const climaPlugin = {

    id: "clima",

    beforeDatasetsDraw(chart) {

        const cfg = climaConfig(chart);
        const area = chart.chartArea;

        if (!cfg || !area) return;

        const ctx = chart.ctx;
        const horizontal = chart.options.indexAxis === "y";
        const eje = horizontal ? chart.scales.x : chart.scales.y;

        ctx.save();

        // Horario lectivo
        const x = chart.scales.x;

        if (
            cfg.lectivo &&
            scheduleConfig.enabled &&
            x &&
            x.type === "time" &&
            x.max - x.min <= 62 * 86400000
        ) {

            const inicio = timeToMinutes(scheduleConfig.start);
            const fin = timeToMinutes(scheduleConfig.end);

            ctx.fillStyle = "rgba(15, 118, 110, 0.08)";

            const dia = new Date(x.min);
            dia.setHours(0, 0, 0, 0);

            while (dia.getTime() <= x.max) {

                if (scheduleConfig.days.includes(dia.getDay())) {

                    const t1 = new Date(dia).setHours(0, inicio, 0, 0);
                    const t2 = new Date(dia).setHours(0, fin, 0, 0);

                    const p1 = Math.max(area.left, x.getPixelForValue(t1));
                    const p2 = Math.min(area.right, x.getPixelForValue(t2));

                    if (p2 > p1) {
                        ctx.fillRect(p1, area.top, p2 - p1, area.bottom - area.top);
                    }
                }

                dia.setDate(dia.getDate() + 1);
            }
        }

        // Franjas de referencia
        (cfg.bands || []).forEach(banda => {

            let a = eje.getPixelForValue(banda.from);
            let b = eje.getPixelForValue(banda.to);

            ctx.fillStyle = banda.color || "rgba(34, 197, 94, 0.10)";

            if (horizontal) {
                a = Math.max(area.left, Math.min(area.right, a));
                b = Math.max(area.left, Math.min(area.right, b));
                ctx.fillRect(Math.min(a, b), area.top, Math.abs(b - a), area.bottom - area.top);
            } else {
                a = Math.max(area.top, Math.min(area.bottom, a));
                b = Math.max(area.top, Math.min(area.bottom, b));
                ctx.fillRect(area.left, Math.min(a, b), area.right - area.left, Math.abs(b - a));
            }
        });

        ctx.restore();
    },

    afterDatasetsDraw(chart) {

        const cfg = climaConfig(chart);
        const area = chart.chartArea;

        if (!cfg || !area) return;

        const ctx = chart.ctx;
        const horizontal = chart.options.indexAxis === "y";
        const eje = horizontal ? chart.scales.x : chart.scales.y;

        ctx.save();

        // Líneas de umbral
        (cfg.lines || []).forEach(linea => {

            const p = eje.getPixelForValue(linea.value);

            const dentro = horizontal
                ? p >= area.left && p <= area.right
                : p >= area.top && p <= area.bottom;

            if (!dentro) return;

            ctx.strokeStyle = linea.color || "#b91c1c";
            ctx.fillStyle = linea.color || "#b91c1c";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();

            if (horizontal) {
                ctx.moveTo(p, area.top);
                ctx.lineTo(p, area.bottom);
            } else {
                ctx.moveTo(area.left, p);
                ctx.lineTo(area.right, p);
            }

            ctx.stroke();
            ctx.setLineDash([]);

            if (linea.label) {

                ctx.font = "bold 11px Arial, Helvetica, sans-serif";

                if (horizontal) {
                    ctx.textAlign = "left";
                    ctx.textBaseline = "top";
                    ctx.fillText(linea.label, p + 4, area.top + 2);
                } else {
                    ctx.textAlign = "right";
                    ctx.textBaseline = "bottom";
                    ctx.fillText(linea.label, area.right - 4, p - 3);
                }
            }
        });

        // Mensaje cuando no hay nada que mostrar
        if (cfg.emptyMessage) {

            const vacio = chart.data.datasets.every(ds =>
                (ds.data || []).every(v => !v)
            );

            if (vacio) {
                ctx.fillStyle = "#475569";
                ctx.font = "bold 14px Arial, Helvetica, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(
                    cfg.emptyMessage,
                    (area.left + area.right) / 2,
                    (area.top + area.bottom) / 2,
                    area.right - area.left - 10
                );
            }
        }

        ctx.restore();
    }
};

function climaConfig(chart) {

    const opciones = chart.config.options;

    return opciones && opciones.plugins
        ? opciones.plugins.clima
        : null;
}

if (typeof Chart !== "undefined" && Chart.register) {
    Chart.register(climaPlugin);
}

// -----------------------------------------------------
// Utilidades
// -----------------------------------------------------

function escapeHTML(texto) {

    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function destroyChart(chart) {

    if (chart) {
        chart.destroy();
    }
}

// Aulas evaluables en orden estable (A01, A02, A11...)
function getValidStats() {

    return processedStats
        .filter(s => s.estado === "Evaluable")
        .sort((a, b) =>
            a.aula.localeCompare(
                b.aula,
                undefined,
                { numeric: true }
            )
        );
}

// Hueco máximo (ms) que se une con una línea en un aula
function gapThresholdMs(aula) {

    const stat = processedStats.find(s => s.aula === aula);

    return stat && stat.umbralHueco > 0
        ? stat.umbralHueco * 60000
        : true;
}

function aulaColor(indice, total) {

    const tono = Math.round((indice * 360) / Math.max(total, 1));

    return `hsl(${tono}, 65%, 42%)`;
}

// -----------------------------------------------------
// Gráfico de barras genérico
//
// Con más de 10 aulas las barras pasan a horizontal para
// que los nombres se lean, y la altura crece con el número
// de aulas.
// -----------------------------------------------------

function barChart(id, cfg) {

    destroyChart(dashboardCharts[id]);

    const canvas = document.getElementById(id);

    if (!canvas) return;

    const horizontal = cfg.labels.length > 10;

    if (canvas.parentNode && canvas.parentNode.style) {
        canvas.parentNode.style.height =
            (horizontal
                ? Math.max(300, cfg.labels.length * 28 + 80)
                : 300) + "px";
    }

    const ejeValores = {
        beginAtZero: true,
        stacked: !!cfg.stacked,
        title: {
            display: true,
            text: cfg.valueTitle
        }
    };

    if (cfg.max !== undefined) {
        ejeValores.max = cfg.max;
    }

    const ejeAulas = {
        stacked: !!cfg.stacked,
        ticks: { autoSkip: false }
    };

    const decimales =
        cfg.decimals !== undefined ? cfg.decimals : 1;

    dashboardCharts[id] = new Chart(canvas, {

        type: "bar",

        data: {
            labels: cfg.labels,
            datasets: cfg.datasets
        },

        options: {

            indexAxis: horizontal ? "y" : "x",

            responsive: true,
            maintainAspectRatio: false,

            scales: horizontal
                ? { x: ejeValores, y: ejeAulas }
                : { x: ejeAulas, y: ejeValores },

            plugins: {

                legend: {
                    display: !!cfg.legend,
                    position: "bottom"
                },

                tooltip: {
                    callbacks: {
                        label: function(context) {

                            const valor = horizontal
                                ? context.parsed.x
                                : context.parsed.y;

                            const extra = cfg.tooltipExtra
                                ? cfg.tooltipExtra(context)
                                : "";

                            return (
                                `${context.dataset.label}: ` +
                                `${valor.toFixed(decimales)} ${cfg.unit || ""}` +
                                extra
                            );
                        }
                    }
                },

                clima: cfg.clima || {}
            }
        }
    });
}

// Serie de marcadores (rombos) sobre un gráfico de barras
function markerDataset(label, values, colors) {

    return {
        type: "line",
        label,
        data: values,
        showLine: false,
        pointStyle: "rectRot",
        pointRadius: 7,
        pointHoverRadius: 9,
        pointBackgroundColor: colors,
        pointBorderColor: "#1e293b",
        pointBorderWidth: 1.5,
        backgroundColor: "#ffffff",
        borderColor: "#1e293b",
        order: 0
    };
}

// -----------------------------------------------------
// Dashboard
// -----------------------------------------------------

function createCharts() {

    createSummary();

    createDIChart();

    createHIChart();

    createBandsChart();

    createETAChart();

    createHoras27Chart();

    createHoras17Chart();

    createHRChart();

    createVulnerabilityChart();

    createEvolutionChart();
}

function createDIChart() {

    const datos = getValidStats();

    const color = di => {
        const info = classifyThomInfo(di);
        return info ? info.color : "#94a3b8";
    };

    const categoria = di => {
        const info = classifyThomInfo(di);
        return info ? ` (${info.category})` : "";
    };

    barChart("chartDI", {

        labels: datos.map(s => s.aula),

        datasets: [
            {
                label: "DI medio",
                data: datos.map(s => s.diMedia),
                backgroundColor: datos.map(s => color(s.diMedia)),
                borderColor: "#475569",
                borderWidth: 1,
                order: 1
            },
            markerDataset(
                "DI máximo",
                datos.map(s => s.diMax),
                datos.map(s => color(s.diMax))
            )
        ],

        valueTitle: "Índice de disconfort (DI)",
        legend: true,

        tooltipExtra: context =>
            categoria(
                context.chart.options.indexAxis === "y"
                    ? context.parsed.x
                    : context.parsed.y
            ),

        clima: {
            lines: [
                { value: 24, label: "24 · disconfort moderado", color: "#a16207" },
                { value: 27, label: "27 · disconfort severo", color: "#b91c1c" }
            ]
        }
    });
}

function createHIChart() {

    const datos = getValidStats();

    const color = hi => getHeatIndexColor(hi);

    const categoria = hi => {
        const texto = getHeatIndexDescription(hi);
        return texto ? ` (${texto})` : "";
    };

    barChart("chartHI", {

        labels: datos.map(s => s.aula),

        datasets: [
            {
                label: "HI medio",
                data: datos.map(s => s.hiMedia),
                backgroundColor: datos.map(s => color(s.hiMedia)),
                borderColor: "#475569",
                borderWidth: 1,
                order: 1
            },
            markerDataset(
                "HI máximo",
                datos.map(s => s.hiMax),
                datos.map(s => color(s.hiMax))
            )
        ],

        valueTitle: "Heat Index (°C)",
        unit: "°C",
        legend: true,

        tooltipExtra: context =>
            categoria(
                context.chart.options.indexAxis === "y"
                    ? context.parsed.x
                    : context.parsed.y
            ),

        clima: {
            lines: [
                { value: 27, label: "27 · precaución", color: "#a16207" },
                { value: 32, label: "32 · precaución extrema", color: "#b91c1c" }
            ]
        }
    });
}

function createBandsChart() {

    const datos = getValidStats();

    barChart("chartBands", {

        labels: datos.map(s => s.aula),

        datasets: TEMP_BANDS.map((banda, i) => ({
            label: banda.label,
            data: datos.map(s =>
                s.horasEvaluadas > 0
                    ? (s.horasBandas[i] / s.horasEvaluadas) * 100
                    : 0
            ),
            backgroundColor: banda.color,
            borderColor: "#ffffff",
            borderWidth: 1
        })),

        valueTitle: "% del tiempo evaluado",
        unit: "%",
        stacked: true,
        max: 100,
        legend: true,

        clima: {
            emptyMessage: "No hay datos dentro del horario evaluado"
        }
    });
}

function createETAChart() {

    const datos = getValidStats();

    barChart("chartETA", {

        labels: datos.map(s => s.aula),

        datasets: [{
            label: "ETA27",
            data: datos.map(s => s.eta27),
            backgroundColor: CHART_ORANGE
        }],

        valueTitle: "ETA27 (°C·h)",
        unit: "°C·h",

        clima: {
            emptyMessage: "Ningún aula ha superado los 27 °C"
        }
    });
}

function createHoras27Chart() {

    const datos = getValidStats();

    barChart("chartHoras27", {

        labels: datos.map(s => s.aula),

        datasets: [{
            label: "Horas por encima de 27 °C",
            data: datos.map(s => s.horasMas27),
            backgroundColor: CHART_ORANGE
        }],

        valueTitle: "Horas",
        unit: "h",

        tooltipExtra: context =>
            ` (${datos[context.dataIndex].porcentajeSobre27.toFixed(1)} % del tiempo)`,

        clima: {
            emptyMessage: "Ningún aula ha superado los 27 °C"
        }
    });
}

function createHoras17Chart() {

    const datos = getValidStats();

    barChart("chartHoras17", {

        labels: datos.map(s => s.aula),

        datasets: [{
            label: "Horas por debajo de 17 °C",
            data: datos.map(s => s.horasMenos17),
            backgroundColor: CHART_BLUE
        }],

        valueTitle: "Horas",
        unit: "h",

        tooltipExtra: context =>
            ` (${datos[context.dataIndex].porcentajeBajo17.toFixed(1)} % del tiempo)`,

        clima: {
            emptyMessage: "Ningún aula ha bajado de 17 °C"
        }
    });
}

function createHRChart() {

    const datos = getValidStats();

    const porcentaje = (s, horas) =>
        s.horasEvaluadas > 0
            ? (horas / s.horasEvaluadas) * 100
            : 0;

    barChart("chartHR", {

        labels: datos.map(s => s.aula),

        datasets: [
            {
                label: "Aire seco (HR < 30 %)",
                data: datos.map(s => porcentaje(s, s.horasHRBaja)),
                backgroundColor: "#fbbf24"
            },
            {
                label: "Aire húmedo (HR > 70 %)",
                data: datos.map(s => porcentaje(s, s.horasHRAlta)),
                backgroundColor: "#38bdf8"
            }
        ],

        valueTitle: "% del tiempo evaluado",
        unit: "%",
        stacked: true,
        max: 100,
        legend: true,

        clima: {
            emptyMessage: "La humedad se ha mantenido entre el 30 y el 70 %"
        }
    });
}

function createVulnerabilityChart() {

    const datos = getValidStats();

    barChart("chartVulnerability", {

        labels: datos.map(s => s.aula),

        datasets: [{
            label: "Índice de vulnerabilidad",
            data: datos.map(s =>
                s.eta27 * 2 + s.porcentajeSobre27
            ),
            backgroundColor: CHART_TEAL
        }],

        valueTitle: "Índice (sin unidades)",

        clima: {
            emptyMessage: "Ningún aula ha superado los 27 °C"
        }
    });
}

// -----------------------------------------------------
// Evolución temporal de todas las aulas
// -----------------------------------------------------

function createEvolutionChart() {

    destroyChart(chartEvolution);

    const canvas = document.getElementById("chartEvolution");

    if (!canvas) return;

    const aulas =
        Object.keys(rawData).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true })
        );

    const datasets = aulas.map((aula, i) => {

        const color = aulaColor(i, aulas.length);

        return {
            label: aula,
            data: rawData[aula].map(r => ({
                x: r.timestamp.getTime(),
                y: r.temp
            })),
            borderColor: color,
            backgroundColor: color,
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 3,
            tension: 0,
            spanGaps: gapThresholdMs(aula)
        };
    });

    // Resaltar un aula al pasar el ratón por la leyenda
    const resaltar = (chart, indice) => {

        chart.data.datasets.forEach((ds, i) => {
            ds.borderWidth =
                indice === null ? 1.5 : i === indice ? 3.5 : 0.6;
        });

        chart.update("none");
    };

    chartEvolution = new Chart(canvas, {

        type: "line",

        data: { datasets },

        options: {

            responsive: true,
            maintainAspectRatio: false,
            parsing: false,
            animation: false,

            interaction: {
                mode: "nearest",
                axis: "x",
                intersect: false
            },

            scales: {
                x: {
                    type: "time",
                    time: {
                        tooltipFormat: "dd/MM/yyyy HH:mm"
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Temperatura (°C)"
                    }
                }
            },

            plugins: {

                decimation: {
                    enabled: true,
                    algorithm: "min-max"
                },

                legend: {
                    position: "bottom",
                    onHover: (evento, item, legend) =>
                        resaltar(legend.chart, item.datasetIndex),
                    onLeave: (evento, item, legend) =>
                        resaltar(legend.chart, null)
                },

                tooltip: {
                    callbacks: {
                        label: context =>
                            `${context.dataset.label}: ${context.parsed.y.toFixed(1)} °C`
                    }
                },

                clima: {
                    lectivo: true,
                    bands: [
                        { from: 17, to: 27, color: "rgba(34, 197, 94, 0.10)" }
                    ],
                    lines: [
                        { value: 27, label: "27 °C", color: "#b91c1c" },
                        { value: 17, label: "17 °C", color: "#1d4ed8" }
                    ]
                }
            }
        }
    });
}

// -----------------------------------------------------
// Cifras clave
// -----------------------------------------------------

function createSummary() {

    const datos = getValidStats();

    if (!datos.length) return;

    renderAulaCards(datos);

    const cumplen =
        datos.filter(
            s => s.cumpleRD
        ).length;

    const incumplen =
        datos.filter(
            s => s.cumpleRD === false
        ).length;

    const aulaCritica =
        [...datos]
        .sort(
            (a, b) =>
            b.eta27 - a.eta27
        )[0];

    const tempMax =
        Math.max(
            ...datos.map(
                s => s.tMax
            )
        );

    document
        .getElementById(
            "dashboard-summary"
        )
        .innerHTML = `

<div class="kpi-grid">

    <div class="kpi-card">
        <div class="kpi-value">
            ${datos.length}
        </div>
        <div class="kpi-label">
            Aulas analizadas
        </div>
    </div>

    <div class="kpi-card">
        <div class="kpi-value">
            ${cumplen}
        </div>
        <div class="kpi-label">
            Cumplen RD486
        </div>
    </div>

    <div class="kpi-card">
        <div class="kpi-value">
            ${incumplen}
        </div>
        <div class="kpi-label">
            No cumplen RD486
        </div>
    </div>

    <div class="kpi-card">
        <div class="kpi-value">
            ${aulaCritica.aula}
        </div>
        <div class="kpi-label">
            Aula más vulnerable
        </div>
    </div>

    <div class="kpi-card">
        <div class="kpi-value">
            ${aulaCritica.eta27.toFixed(1)}
        </div>
        <div class="kpi-label">
            ETA27 máximo
        </div>
    </div>

    <div class="kpi-card">
        <div class="kpi-value">
            ${tempMax.toFixed(1)}°C
        </div>
        <div class="kpi-label">
            Temperatura máxima
        </div>
    </div>

</div>
`;
}

// -----------------------------------------------------
// Aulas de un vistazo: una tarjeta por aula
// -----------------------------------------------------

const SEVERITY_ORDER = ["Rojo", "Naranja", "Amarillo", "Verde", "Sin datos"];

function renderAulaCards(datos) {

    const contenedor =
        document.getElementById("aula-cards");

    if (!contenedor) return;

    const ordenadas = [...datos].sort((a, b) =>
        SEVERITY_ORDER.indexOf(a.severidad) -
        SEVERITY_ORDER.indexOf(b.severidad) ||
        b.eta27 - a.eta27 ||
        a.aula.localeCompare(b.aula, undefined, { numeric: true })
    );

    contenedor.innerHTML = ordenadas.map(s => {

        const aula = escapeHTML(s.aula);

        const clase =
            `estado-${s.severidad.toLowerCase().replace(" ", "-")}`;

        const hi =
            s.hiMaxResult
            ? `${s.hiMax.toFixed(1)} °C · ${s.hiMaxResult.category}`
            : "–";

        const cumple =
            s.cumpleRD
            ? "Cumple RD 486"
            : s.cumpleRD === false
            ? "No cumple RD 486"
            : "Sin datos lectivos";

        return `
<button class="aula-card ${clase}" data-aula="${aula}" aria-label="Aula ${aula}, severidad ${s.severidad}. Ver análisis detallado">
<span class="aula-card-head">
<strong>${aula}</strong>
<span class="aula-card-sev">${s.severidad}</span>
</span>
<span>T máx. <b>${s.tMax.toFixed(1)} °C</b></span>
<span>Más de 27 °C: <b>${s.horasMas27.toFixed(1)} h</b> (${s.porcentajeSobre27.toFixed(0)} %)</span>
<span>HI máx. <b>${hi}</b></span>
<span class="aula-card-foot">${cumple}</span>
</button>`;

    }).join("");

    contenedor.onclick = evento => {

        const tarjeta =
            evento.target.closest
            ? evento.target.closest("[data-aula]")
            : null;

        if (tarjeta) {
            openAula(tarjeta.dataset.aula);
        }
    };
}
