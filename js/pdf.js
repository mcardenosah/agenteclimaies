// =====================================================
// Agente Clima IES v2.3
// pdf.js
// Exportación PDF
// =====================================================

// Ancho útil (px) de una página A4 apaisada con 10 mm de margen
const PDF_A4_WIDTH_PX = 1047;

// Ancho mínimo que necesitan las tablas anchas de un elemento
// (informe con todas las columnas, mapas térmicos) sin recortarse
function pdfRequiredWidth(elemento) {

    let ancho = PDF_A4_WIDTH_PX;

    elemento
        .querySelectorAll(".report-table, .heatmap-table")
        .forEach(tabla => {

            if (!tabla.offsetParent) return;

            const anchoPrevio = tabla.style.width;
            const minimoPrevio = tabla.style.minWidth;

            tabla.style.width = "min-content";
            tabla.style.minWidth = "0";

            ancho = Math.max(ancho, tabla.offsetWidth + 100);

            tabla.style.width = anchoPrevio;
            tabla.style.minWidth = minimoPrevio;
        });

    return ancho;
}

// Prepara la exportación de un elemento a PDF.
//   origen:    elemento que se exporta
//   medir:     elemento visible donde medir las tablas (por defecto, el origen)
// Devuelve el "worker" de html2pdf, listo para .save()
function createPdfWorker(origen, fileName, medir) {

    const anchoPx = pdfRequiredWidth(medir || origen);

    // Si el contenido es más ancho que un A4, se usa una página
    // mayor con la misma proporción: al imprimir se ajusta a A4.
    const anchoMm = (anchoPx * 25.4) / 96 + 20;

    const formato =
        anchoPx <= PDF_A4_WIDTH_PX
        ? "a4"
        : [anchoMm, (anchoMm * 210) / 297];

    // Los botones y controles no forman parte del documento
    origen
        .querySelectorAll(".btn-export, .report-tools")
        .forEach(control => {
            control.setAttribute("data-html2canvas-ignore", "true");
        });

    const options = {

        margin: 10,

        filename:
            `${fileName}.pdf`,

        image: {
            type: "jpeg",
            quality: 0.98
        },

        html2canvas: {
            scale: 2
        },

        jsPDF: {
            unit: "mm",
            format: formato,
            orientation: "landscape"
        },

        // No partir tarjetas, gráficos ni filas entre dos páginas
        pagebreak: {
            mode: ["css", "legacy"],
            avoid: [
                ".chart-card",
                ".aula-card",
                ".kpi-card",
                ".kpi-grid",
                "tr",
                "h2",
                "h3"
            ]
        }
    };

    origen.classList.add("pdf-export");

    return html2pdf()
        .set(options)
        .from(origen);
}

function exportToPDF(elementId, fileName) {

    const element =
        document.getElementById(elementId);

    const limpiar = () =>
        element.classList.remove("pdf-export");

    createPdfWorker(element, fileName)
        .save()
        .then(limpiar, limpiar);
}

// =====================================
// Exportación específica de mapas
// =====================================

function exportHeatmapPDF() {

    const heatmap =
        document.getElementById(
            "temperatureHeatmap"
        );

    if (!heatmap) {
        return;
    }

    const tipoMapa =
        document.getElementById(
            "mapTypeSelector"
        )?.value || "temperature";

    const vista =
        document.getElementById(
            "mapViewSelector"
        )?.value || "day";

    const detalle =
        vista === "aula"
        ? "aula_" + (document.getElementById("mapAulaSelector")?.value || "")
        : document.getElementById("daySelector")?.value || "sin_fecha";

    const titulo =
        tipoMapa === "di"
        ? "Mapa_DI"
        : tipoMapa === "heatindex"
        ? "Mapa_HeatIndex"
        : "Mapa_Temperatura";

    const contenedorTemporal =
        document.createElement("div");

    contenedorTemporal.style.padding =
        "20px";

    contenedorTemporal.innerHTML = `

        <h1 style="font-size:24px;margin-bottom:10px;">
            Agente Clima IES
        </h1>

        ${heatmap.innerHTML}

    `;

    // En el PDF la tabla de interpretación va desplegada
    contenedorTemporal
        .querySelectorAll("details")
        .forEach(bloque => {
            bloque.open = true;
        });

    createPdfWorker(
        contenedorTemporal,
        `${titulo}_${detalle}`,
        heatmap
    ).save();

}

// =====================================
// Exportación Global (Dashboard + Aulas)
// =====================================

// Reglas de css/styles.css, para incrustarlas en el informe.
// Si el navegador no permite leerlas (página abierta como
// archivo local), el informe se genera sin ellas.
function collectAppCss() {

    let css = "";

    Array.from(document.styleSheets).forEach(hoja => {

        if (!hoja.href || !hoja.href.includes("styles.css")) {
            return;
        }

        try {
            css += Array.from(hoja.cssRules)
                .map(regla => regla.cssText)
                .join("\n");
        } catch (error) {
            console.warn("No se han podido leer los estilos:", error);
        }
    });

    return css;
}

function exportGlobalHTML() {
    const btn = document.getElementById("btn-global-pdf");
    if (!btn) return;
    
    const originalText = btn.textContent;
    btn.textContent = "Generando HTML (puede tardar unos segundos)...";
    btn.disabled = true;

    try {
        const container = document.createElement("div");
        container.className = "p-8 max-w-6xl mx-auto bg-white shadow-lg my-8";

        // 1. Clonar el Dashboard
        const dashboardTitle = document.createElement("h1");
        dashboardTitle.style.fontSize = "32px";
        dashboardTitle.style.marginBottom = "24px";
        dashboardTitle.style.fontWeight = "bold";
        dashboardTitle.textContent = "Agente Clima IES - Informe Global";
        container.appendChild(dashboardTitle);

        const summaryClone = document.getElementById("dashboard-summary").cloneNode(true);
        container.appendChild(summaryClone);

        const tarjetas = document.getElementById("aula-cards");

        if (tarjetas) {

            const tituloTarjetas = document.createElement("h2");
            tituloTarjetas.className = "subsection-title";
            tituloTarjetas.textContent = "Aulas de un vistazo";
            container.appendChild(tituloTarjetas);

            const tarjetasClone = tarjetas.cloneNode(true);
            tarjetasClone.removeAttribute("id");
            tarjetasClone.style.marginBottom = "24px";
            container.appendChild(tarjetasClone);
        }

        const notaHorario = document.createElement("p");
        notaHorario.className = "text-sm text-slate-600 mb-6";
        notaHorario.textContent =
            "Horas de exposición, ETA27, severidad y cumplimiento evaluados en: " +
            describeSchedule() + ".";
        container.appendChild(notaHorario);

        // Copiar los gráficos del dashboard convirtiéndolos a imágenes
        const dashboardGrid = document.querySelector("#tab-dashboard .grid").cloneNode(true);
        const originalCanvases = document.querySelectorAll("#tab-dashboard .grid canvas");
        const clonedCanvases = dashboardGrid.querySelectorAll("canvas");
        
        for (let i = 0; i < originalCanvases.length; i++) {
            const img = document.createElement("img");
            img.src = originalCanvases[i].toDataURL("image/png");
            img.style.width = "100%";
            img.style.height = "auto";
            clonedCanvases[i].parentNode.replaceChild(img, clonedCanvases[i]);
        }
        
        // Evitar que las tarjetas del dashboard se corten por la mitad
        const dashboardCards = dashboardGrid.querySelectorAll(".bg-white, .card");
        dashboardCards.forEach(c => {
            c.classList.add("avoid-break");
        });
        
        container.appendChild(dashboardGrid);

        // 2. Iterar por todas las aulas
        const aulas = Object.keys(rawData).sort();

        // Opciones base para evitar animaciones y fijar un diseño limpio
        const commonOptions = {
            responsive: false, 
            animation: false,
            scales: {
                x: {
                    type: "time",
                    time: { tooltipFormat: 'dd/MM/yyyy HH:mm' }
                }
            },
            plugins: {
                legend: { position: 'top' }
            }
        };

        for (const aula of aulas) {
            // Salto de página
            const pageBreak = document.createElement("div");
            pageBreak.className = "page-break";
            container.appendChild(pageBreak);

            const title = document.createElement("h2");
            title.style.marginTop = "40px";
            title.style.marginBottom = "20px";
            title.style.fontSize = "26px";
            title.style.fontWeight = "bold";
            title.textContent = "Análisis Detallado - Aula: " + aula;
            container.appendChild(title);

            if (typeof renderAulaKpis === "function") {

                renderAulaKpis(aula);

                const origenKpis = document.getElementById("aula-kpis");

                if (origenKpis) {
                    const kpis = document.createElement("div");
                    kpis.className = "avoid-break";
                    kpis.style.marginBottom = "24px";
                    kpis.innerHTML = origenKpis.innerHTML;
                    container.appendChild(kpis);
                }
            }

            const chartData = typeof getAulaChartData === "function" ? getAulaChartData(aula) : null;
            if (!chartData) continue;
            
            // GRÁFICO 1
            const canvasWrapper = document.createElement("div");
            canvasWrapper.className = "avoid-break";
            canvasWrapper.style.width = "1000px";
            canvasWrapper.style.marginBottom = "30px";
            
            const canvasIndices = document.createElement("canvas");
            canvasIndices.width = 1000;
            canvasIndices.height = 400;
            
            const opt1 = JSON.parse(JSON.stringify(commonOptions));
            opt1.scales.y = { title: { display: true, text: "°C (temperatura y HI) · DI" } };
            opt1.datasets = { line: { spanGaps: gapThresholdMs(aula) } };
            opt1.plugins.clima = {
                lectivo: true,
                bands: [{ from: 17, to: 27, color: "rgba(34, 197, 94, 0.10)" }],
                lines: [
                    { value: 27, label: "27 °C", color: "#b91c1c" },
                    { value: 17, label: "17 °C", color: "#1d4ed8" }
                ]
            };
            
            const c1 = new Chart(canvasIndices, {
                type: "line",
                data: {
                    datasets: [
                        { label: "Temperatura real (°C)", data: chartData.dataTemp, borderColor: "#3b82f6", backgroundColor: "#3b82f6", tension: 0.1, borderWidth: 2, pointRadius: 0 },
                        { label: "Heat Index (HI)", data: chartData.dataHI, borderColor: "#ef4444", backgroundColor: "#ef4444", tension: 0.1, borderWidth: 2, pointRadius: 0 },
                        { label: "Índice Disconfort (DI)", data: chartData.dataDI, borderColor: "#f59e0b", backgroundColor: "#f59e0b", tension: 0.1, borderWidth: 2, pointRadius: 0 }
                    ]
                },
                options: opt1
            });

            // Usamos directamente imagen
            const img1 = document.createElement("img");
            img1.src = canvasIndices.toDataURL("image/png");
            img1.style.width = "100%";
            img1.style.height = "auto";
            canvasWrapper.appendChild(img1);
            c1.destroy();
            container.appendChild(canvasWrapper);

            // GRÁFICO 2
            const canvasWrapper2 = document.createElement("div");
            canvasWrapper2.className = "avoid-break";
            canvasWrapper2.style.width = "1000px";
            canvasWrapper2.style.marginBottom = "30px";
            
            const canvasHumedad = document.createElement("canvas");
            canvasHumedad.width = 1000;
            canvasHumedad.height = 400;

            const opt2 = JSON.parse(JSON.stringify(commonOptions));
            opt2.scales.y = { min: 0, max: 100, title: { display: true, text: "Humedad Relativa (%)" } };
            opt2.datasets = { line: { spanGaps: gapThresholdMs(aula) } };
            opt2.plugins.clima = {
                lectivo: true,
                bands: [{ from: 30, to: 70, color: "rgba(34, 197, 94, 0.10)" }],
                lines: [
                    { value: 70, label: "70 %", color: "#1d4ed8" },
                    { value: 30, label: "30 %", color: "#a16207" }
                ]
            };

            const c2 = new Chart(canvasHumedad, {
                type: "line",
                data: {
                    datasets: [
                        { label: "Humedad Relativa (%)", data: chartData.dataHR, borderColor: "#10b981", backgroundColor: "#10b981", tension: 0.1, borderWidth: 2, pointRadius: 0 }
                    ]
                },
                options: opt2
            });

            const img2 = document.createElement("img");
            img2.src = canvasHumedad.toDataURL("image/png");
            img2.style.width = "100%";
            img2.style.height = "auto";
            canvasWrapper2.appendChild(img2);
            c2.destroy();
            container.appendChild(canvasWrapper2);
        }

        const selectorAula = document.getElementById("aulaSelector");

        if (selectorAula && typeof renderAulaKpis === "function") {
            renderAulaKpis(selectorAula.value);
        }

        // 3. Crear el documento HTML maestro
        const htmlTemplate = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Informe Global - Agente Clima IES</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        ${collectAppCss()}
        body { font-family: sans-serif; background-color: #f3f4f6; }
        .aula-card { cursor: default; }
        .tab-content { display: block; }
        .page-break { page-break-before: always; }
        .avoid-break { page-break-inside: avoid; break-inside: avoid; }
        
        /* Reglas específicas para impresión a PDF desde el navegador */
        @media print {
            body { background-color: white !important; margin: 0; padding: 0; }
            .shadow-lg { box-shadow: none !important; }
            .my-8 { margin: 0 !important; }
            .page-break { page-break-before: always; }
            .avoid-break { page-break-inside: avoid; break-inside: avoid; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    ${container.outerHTML}
    <script>
        // Imprimir automáticamente al abrir (opcional)
        // window.onload = () => window.print();
    </script>
</body>
</html>`;

        // 4. Descargar como Blob
        const blob = new Blob([htmlTemplate], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Informe_Global_${new Date().toISOString().split('T')[0]}.html`;
        a.click();
        URL.revokeObjectURL(url);

        btn.textContent = originalText;
        btn.disabled = false;

    } catch(err) {
        console.error("Error al preparar HTML global:", err);
        alert("Ocurrió un error al preparar el informe HTML.");
        btn.textContent = originalText;
        btn.disabled = false;
    }
}
