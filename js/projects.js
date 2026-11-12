// =====================================================
// Agente Clima IES v2.1
// projects.js
// Guardar / Abrir proyecto JSON
// =====================================================

function saveProject() {

    if (
        !rawData ||
        Object.keys(rawData).length === 0
    ) {

        alert(
            "No hay datos cargados."
        );

        return;
    }

    let totalRegistros = 0;

    Object.values(rawData).forEach(
        registros => {

            totalRegistros +=
                registros.length;

        }
    );

    const project = {

        version: "2.1",

        createdBy:
            "Agente Clima IES",

        exportDate:
            new Date().toISOString(),

        metadata: {

            numAulas:
                Object.keys(rawData)
                    .length,

            aulas:
                Object.keys(rawData),

            numRegistros:
                totalRegistros

        },

        scheduleConfig,

        rawData,

        processedStats

    };

    const json =
        JSON.stringify(
            project,
            null,
            2
        );

    const blob =
        new Blob(
            [json],
            {
                type:
                    "application/json"
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const fecha =
        new Date()
            .toISOString()
            .split("T")[0];

    const enlace =
        document.createElement("a");

    enlace.href = url;

    enlace.download =
        `AgenteClimaIES_${fecha}.json`;

    document.body.appendChild(
        enlace
    );

    enlace.click();

    document.body.removeChild(
        enlace
    );

    URL.revokeObjectURL(
        url
    );

}

// =====================================
// Abrir proyecto
// =====================================

function loadProject() {

    document
        .getElementById(
            "project-input"
        )
        .click();

}

// =====================================
// Lectura JSON
// =====================================

function handleProjectLoad(
    event
) {

    const file =
        event.target.files[0];

    if (!file) {
        return;
    }

    const reader =
        new FileReader();

    reader.onload =
        function(e) {

            try {

                const project =
                    JSON.parse(
                        e.target.result
                    );

                rawData =
                    project.rawData || {};
                importWarnings = [];

                // Horario lectivo guardado con el proyecto
                if (project.scheduleConfig) {
                    Object.assign(
                        scheduleConfig,
                        project.scheduleConfig
                    );
                    syncScheduleUI();
                }

                // Ya no cargamos processedStats, se regenerará
                // automáticamente con finishProcessing()

                // ====================
                // Reconstruir fechas
                // ====================

                Object.values(
                    rawData
                ).forEach(
                    registros => {

                        registros.forEach(
                            r => {

                                r.timestamp =
                                    new Date(
                                        r.timestamp
                                    );

                            }
                        );

                    }
                );

                finishProcessing();

                alert(
                    "Proyecto cargado correctamente."
                );

            } catch (error) {

                console.error(
                    error
                );

                alert(
                    "Error al cargar el proyecto."
                );

            }

        };

    reader.readAsText(
        file
    );

}

// =====================================
// Activación automática
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const input =
            document.getElementById(
                "project-input"
            );

        if (input) {

            input.addEventListener(
                "change",
                handleProjectLoad
            );

        }

    }
);
