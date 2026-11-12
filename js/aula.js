// =====================================================
// Agente Clima IES v2.2
// aula.js
// Análisis temporal detallado por aula individual
// =====================================================

let chartAulaIndices = null;
let chartAulaHumedad = null;

/**
 * Inicializa el selector de aulas
 * Extrae los nombres de las aulas de `rawData`
 */
function initAulaSelector() {
    const selector = document.getElementById("aulaSelector");
    if (!selector) return;

    selector.innerHTML = "";

    const aulas = Object.keys(rawData).sort();
    if (aulas.length === 0) return;

    aulas.forEach(aula => {
        const option = document.createElement("option");
        option.value = aula;
        option.textContent = aula;
        selector.appendChild(option);
    });

    // Encontrar la fecha mínima y máxima global de todos los datos
    let globalMinDate = null;
    let globalMaxDate = null;

    aulas.forEach(a => {
        const registros = rawData[a];
        if (registros && registros.length > 0) {
            const first = registros[0].timestamp;
            const last = registros[registros.length - 1].timestamp;
            
            if (!globalMinDate || first < globalMinDate) globalMinDate = first;
            if (!globalMaxDate || last > globalMaxDate) globalMaxDate = last;
        }
    });

    // Configurar inputs de fecha si encontramos rangos
    if (globalMinDate && globalMaxDate) {
        // Ajustamos la hora al horario local para el input datetime-local
        const formatForInput = (d) => {
            // Desfase horario de la propia fecha (cambia entre verano e invierno)
            const tzoffset = d.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
            return localISOTime;
        };

        const minStr = formatForInput(globalMinDate);
        const maxStr = formatForInput(globalMaxDate);

        const startDateInput = document.getElementById("aulaStartDate");
        const endDateInput = document.getElementById("aulaEndDate");
        
        if (startDateInput) {
            startDateInput.min = minStr;
            startDateInput.max = maxStr;
            startDateInput.value = minStr;
        }
        if (endDateInput) {
            endDateInput.min = minStr;
            endDateInput.max = maxStr;
            endDateInput.value = maxStr;
        }
    }

    // Renderizar para la primera aula por defecto
    renderAulaCharts();
}

/**
 * Limpia los filtros temporales y vuelve a renderizar
 */
function clearAulaFilter() {
    const startDateInput = document.getElementById("aulaStartDate");
    const endDateInput = document.getElementById("aulaEndDate");
    if (startDateInput && startDateInput.min) startDateInput.value = startDateInput.min;
    if (endDateInput && endDateInput.max) endDateInput.value = endDateInput.max;
    renderAulaCharts();
}

/**
 * Extrae y formatea los datos de un aula para los gráficos
 */
function getAulaChartData(aula) {
    if (!aula || !rawData[aula]) return null;

    const registros = rawData[aula];

    const dataTemp = [];
    const dataDI = [];
    const dataHI = [];
    const dataHR = [];

    // Leer filtros de fecha
    let startDate = null;
    let endDate = null;
    
    const startDateInput = document.getElementById("aulaStartDate");
    const endDateInput = document.getElementById("aulaEndDate");

    if (startDateInput && startDateInput.value) {
        startDate = new Date(startDateInput.value).getTime();
    }
    if (endDateInput && endDateInput.value) {
        endDate = new Date(endDateInput.value).getTime();
    }

    registros.forEach(r => {
        const tTime = r.timestamp.getTime();

        // Aplicar filtro si existe
        if (startDate && tTime < startDate) return;
        if (endDate && tTime > endDate) return;

        const t = r.temp;
        const hr = r.hum;

        const di = calculateThomIndex(t, hr);
        const hi = calculateHeatIndex(t, hr);

        dataTemp.push({ x: r.timestamp, y: t });
        dataDI.push({ x: r.timestamp, y: di });
        dataHI.push({ x: r.timestamp, y: hi });
        dataHR.push({ x: r.timestamp, y: hr });
    });

    return { dataTemp, dataDI, dataHI, dataHR };
}

/**
 * Renderiza las dos gráficas temporales para el aula seleccionada
 */
function renderAulaCharts() {
    const selector = document.getElementById("aulaSelector");
    if (!selector) return;

    const aula = selector.value;
    const chartData = getAulaChartData(aula);
    if (!chartData) return;

    const { dataTemp, dataDI, dataHI, dataHR } = chartData;

    renderAulaKpis(aula);

    // Los huecos de datos no se unen con una línea
    const hueco = gapThresholdMs(aula);

    // Destruir gráficos anteriores si existen
    if (chartAulaIndices) {
        chartAulaIndices.destroy();
    }
    if (chartAulaHumedad) {
        chartAulaHumedad.destroy();
    }

    // Opciones comunes
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        datasets: {
            line: {
                spanGaps: hueco
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
        scales: {
            x: {
                type: "time",
                time: {
                    tooltipFormat: 'dd/MM/yyyy HH:mm'
                }
            }
        },
        plugins: {
            legend: {
                position: 'top',
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y.toFixed(1);
                        }
                        return label;
                    }
                }
            }
        }
    };

    // 1. Gráfico de Temperaturas e Índices
    const optionsIndices = JSON.parse(JSON.stringify(commonOptions));
    optionsIndices.scales.y = {
        title: {
            display: true,
            text: "°C (temperatura y HI) · DI"
        }
    };

    optionsIndices.plugins.clima = {
        lectivo: true,
        bands: [
            { from: 17, to: 27, color: "rgba(34, 197, 94, 0.10)" }
        ],
        lines: [
            { value: 27, label: "27 °C", color: "#b91c1c" },
            { value: 17, label: "17 °C", color: "#1d4ed8" }
        ]
    };

    chartAulaIndices = new Chart(document.getElementById("chartAulaIndices"), {
        type: "line",
        data: {
            datasets: [
                {
                    label: "Temperatura real (°C)",
                    data: dataTemp,
                    borderColor: "#3b82f6", // blue-500
                    backgroundColor: "#3b82f6",
                    tension: 0.1,
                    borderWidth: 2,
                    pointRadius: 0
                },
                {
                    label: "Heat Index (HI)",
                    data: dataHI,
                    borderColor: "#ef4444", // red-500
                    backgroundColor: "#ef4444",
                    tension: 0.1,
                    borderWidth: 2,
                    pointRadius: 0
                },
                {
                    label: "Índice Disconfort (DI)",
                    data: dataDI,
                    borderColor: "#f59e0b", // amber-500
                    backgroundColor: "#f59e0b",
                    tension: 0.1,
                    borderWidth: 2,
                    pointRadius: 0
                }
            ]
        },
        options: optionsIndices
    });

    // 2. Gráfico de Humedad Relativa
    const optionsHumedad = JSON.parse(JSON.stringify(commonOptions));
    optionsHumedad.scales.y = {
        min: 0,
        max: 100,
        title: {
            display: true,
            text: "Humedad Relativa (%)"
        }
    };

    optionsHumedad.plugins.clima = {
        lectivo: true,
        bands: [
            { from: 30, to: 70, color: "rgba(34, 197, 94, 0.10)" }
        ],
        lines: [
            { value: 70, label: "70 %", color: "#1d4ed8" },
            { value: 30, label: "30 %", color: "#a16207" }
        ]
    };

    chartAulaHumedad = new Chart(document.getElementById("chartAulaHumedad"), {
        type: "line",
        data: {
            datasets: [
                {
                    label: "Humedad Relativa (%)",
                    data: dataHR,
                    borderColor: "#10b981", // emerald-500
                    backgroundColor: "#10b981",
                    tension: 0.1,
                    borderWidth: 2,
                    pointRadius: 0
                }
            ]
        },
        options: optionsHumedad
    });
}

/**
 * Abre la pestaña de análisis con un aula concreta seleccionada
 */
function openAula(aula) {

    const selector = document.getElementById("aulaSelector");

    if (!selector || !rawData[aula]) return;

    selector.value = aula;

    openTab("aula");

    renderAulaCharts();
}

/**
 * Cifras resumen del aula seleccionada
 */
function renderAulaKpis(aula) {

    const contenedor = document.getElementById("aula-kpis");

    if (!contenedor) return;

    const s = processedStats.find(stat => stat.aula === aula);

    if (!s || s.estado !== "Evaluable") {
        contenedor.innerHTML = "";
        return;
    }

    const clase =
        `estado-${s.severidad.toLowerCase().replace(" ", "-")}`;

    const cumple =
        s.cumpleRD
        ? "Cumple"
        : s.cumpleRD === false
        ? "No cumple"
        : "Sin datos";

    const di = classifyThomInfo(s.diMax);

    const tarjeta = (valor, etiqueta, extra) => `
    <div class="kpi-card ${extra || ""}">
        <div class="kpi-value">${valor}</div>
        <div class="kpi-label">${etiqueta}</div>
    </div>`;

    contenedor.innerHTML = `
<div class="kpi-grid">
${tarjeta(s.severidad, "Severidad", clase)}
${tarjeta(cumple, "RD 486/1997")}
${tarjeta(s.tMedia.toFixed(1) + " °C", "Temperatura media")}
${tarjeta(s.tMax.toFixed(1) + " °C", "Temperatura máxima")}
${tarjeta(s.horasMas27.toFixed(1) + " h", "Por encima de 27 °C (" + s.porcentajeSobre27.toFixed(0) + " %)")}
${tarjeta(s.eta27.toFixed(1), "ETA27 (°C·h)")}
${tarjeta(s.diMax.toFixed(1), "DI máximo" + (di ? " · " + di.category : ""))}
${tarjeta(Number.isFinite(s.hiMax) ? s.hiMax.toFixed(1) + " °C" : "–", "HI máximo" + (s.hiMaxResult ? " · " + s.hiMaxResult.category : ""))}
</div>
<p class="text-sm text-slate-600 mt-2">
Cifras de todo el periodo registrado; no cambian con el filtro de fechas de las gráficas. Horas, ETA27, severidad y cumplimiento: ${describeSchedule()}.
</p>`;
}
