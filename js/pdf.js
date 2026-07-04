// =====================================================
// Agente Clima IES v1.9
// pdf.js
// Exportación PDF
// =====================================================

function exportToPDF(elementId, fileName) {

    const element =
        document.getElementById(elementId);

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
            format: "a4",
            orientation: "landscape"
        }

    };

    html2pdf()
        .set(options)
        .from(element)
        .save();

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

    const fecha =
        document.getElementById(
            "daySelector"
        )?.value || "sin_fecha";

    const tipoMapa =
        document.getElementById(
            "mapTypeSelector"
        )?.value || "temperature";

    const titulo =
        tipoMapa === "di"
        ? "Mapa_DI"
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

    const options = {

        margin: 10,

        filename:
            `${titulo}_${fecha}.pdf`,

        image: {
            type: "jpeg",
            quality: 0.98
        },

        html2canvas: {
            scale: 2
        },

        jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "landscape"
        }

    };

    html2pdf()
        .set(options)
        .from(contenedorTemporal)
        .save();

}

// =====================================
// Exportación Global (Dashboard + Aulas)
// =====================================

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
            opt1.scales.y = { title: { display: true, text: "Valor (°C / Índice)" } };
            
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

        // 3. Crear el documento HTML maestro
        const htmlTemplate = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Informe Global - Agente Clima IES</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: sans-serif; background-color: #f3f4f6; }
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
