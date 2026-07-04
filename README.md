# Agente Termohigrométrico - IES 

## 📌 Descripción del Proyecto

Esta aplicación web es un **Agente de Procesamiento Local (Edge Computing)** diseñado para analizar, limpiar y visualizar datos de sensores termohigrométricos (dataloggers). Su objetivo es evaluar las condiciones de confort térmico del profesorado y el alumnado, proporcionando evidencias objetivas para la toma de decisiones dentro del Proyecto de Renaturalización y Adaptación al Cambio Climático del centro educativo.

La herramienta ingiere datos brutos en formato CSV, aplica filtros de validación y evalúa simultáneamente el cumplimiento normativo (PRL) y el estrés térmico biometeorológico.

## ⚖️ Marco Normativo y Metodología

El motor de cálculo interno está programado siguiendo rigurosos criterios:

- **Límites Normativos (PRL):** Basado en el Anexo III del Real Decreto 486/1997 sobre disposiciones mínimas de seguridad y salud en los lugares de trabajo (17 °C - 27 °C para trabajos sedentarios).
- **Cálculo de Severidad (ETA27):** Incorpora el cálculo integral de la Exposición Térmica Acumulada ($ETA_{27}$) mediante la fórmula: `MAX(0, temperatura - 27) × intervalo_valido_en_horas`. Esto permite evaluar no solo cuántas horas se supera el límite, sino la intensidad del calor sufrido.
- **Índice de Disconfort de Thom (DI):** Evalúa el grado de confort o disconfort térmico percibido combinando temperatura y humedad relativa.
- **Extended Heat Index (HI):** Implementa el modelo fisiológico avanzado de Lu & Romps (2022) para estimar el esfuerzo fisiológico de termorregulación frente a combinaciones de calor y humedad extremas.
- **Validación Dinámica:** El sistema detecta y excluye "huecos de datos" (intervalos de lectura superiores a 22,5 minutos), garantizando que solo se evalúa el tiempo de exposición real y continuo.

## 🚀 Características y Funcionalidades

- **Privacidad por diseño (Local Processing):** Los archivos de datos nunca se suben a la nube. Todo el procesamiento (parseo, cálculos matemáticos y renderizado) ocurre en el navegador del usuario. Cumplimiento absoluto del RGPD.
- **Dashboard Interactivo:** Panel de control con gráficas de barras, ranking de vulnerabilidad y métricas ejecutivas.
- **Mapas de Calor (Heatmaps):** Visualización térmica tipo calendario para detectar los momentos del día y días de la semana con mayor estrés ambiental (Temperatura y Disconfort).
- **Análisis Detallado por Aula:** Pestaña dedicada con gráficas de evolución temporal de Temperatura, DI, HI y Humedad Relativa para diagnosticar espacios de forma individual.
- **Gestión de Proyectos (Sesiones):** Permite guardar el estado actual del análisis en un archivo `.json` ultraligero y volver a cargarlo en cualquier momento, sin necesidad de procesar los CSV originales de nuevo.
- **Generador de Informes Globales:** Capacidad para compilar todo el Dashboard y los anexos detallados de todas las aulas en un único documento interactivo `.html`, listo para imprimir como informe PDF perfecto sin recortes gráficos.

## 🛠️ Instrucciones de Uso

1. **Acceso:** Entra a la aplicación web (vía GitHub Pages o servidor local).
2. **Importación:** Exporta los datos de tus dataloggers en formato `.csv` (deben incluir columnas de fecha/hora, temperatura y humedad). Arrastra los archivos a la zona de importación.
3. **Análisis:** El sistema procesará los miles de registros en milisegundos y habilitará las diferentes vistas (Informe, Dashboard, Mapas, Análisis por Aula).
4. **Guardado:** Pulsa en "Guardar Proyecto" para exportar tu sesión actual.
5. **Reportes:** Utiliza el botón "Descargar Informe Global" en el Dashboard para obtener tu entregable.

## 🏫 Aplicación Didáctica

Además de su uso administrativo e investigador, esta herramienta está diseñada para poder ser utilizada como simulador interactivo en el aula (Biología y Geología, Física y Química, FP Básica). 

Permite al alumnado aplicar el modelo 5E (*Engage, Explore, Explain, Elaborate, Evaluate*), analizando gráficas reales, detectando patrones de estratificación térmica e inercia de los materiales, y argumentando la necesidad de implementar Soluciones Basadas en la Naturaleza (SBN) como cubiertas verdes o fachadas vegetales.

## ⚠️ Aviso Legal y de Uso

Esta aplicación es una herramienta diseñada con fines **educativos, didácticos e indicativos**. 

Los datos generados, las gráficas mostradas y los cálculos de los diferentes índices (Temperatura, Disconfort, Heat Index, ETA27) **no tienen validez oficial, legal ni homologada**. 

Los resultados ofrecidos por esta plataforma no sustituyen en ningún caso las auditorías técnicas, los informes de peritaje ni las evaluaciones oficiales de Prevención de Riesgos Laborales (PRL) realizadas por técnicos competententes utilizando instrumentación calibrada y certificada.

---
*Desarrollado como herramienta de investigación, gestión y docencia.*
