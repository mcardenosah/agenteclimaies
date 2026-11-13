# Metodología del Agente Clima IES

## 1. Objetivo del proyecto

El Agente Clima IES es una herramienta destinada a analizar las condiciones ambientales interiores de centros educativos a partir de registros continuos de temperatura y humedad relativa.

Su finalidad es proporcionar indicadores objetivos que permitan:

* Evaluar las condiciones ambientales de las aulas.
* Detectar situaciones potencialmente problemáticas.
* Facilitar la toma de decisiones relacionadas con confort térmico, adaptación al calor y gestión de espacios educativos.
* Generar informes reproducibles y transparentes basados en datos.

---

## 2. Variables medidas

Actualmente el sistema utiliza exclusivamente las variables registradas por los sensores instalados en las aulas:

### Temperatura del aire
* Unidad: °C

### Humedad relativa
* Unidad: %

### Fecha y hora
* Marca temporal asociada a cada medición.

---

## 3. Variables no medidas

El sistema no dispone actualmente de información sobre:
* Velocidad del aire.
* Temperatura radiante media.
* Radiación solar.
* Actividad metabólica de los ocupantes.
* Nivel de aislamiento de la vestimenta.

Como consecuencia, determinados índices de confort térmico no pueden calcularse de forma rigurosa.

---

## 4. Indicadores calculados

### 4.1. Estadísticos básicos

Para cada aula se calculan:

#### Temperatura
* Temperatura mínima.
* Temperatura media.
* Temperatura máxima.

#### Humedad relativa
* Humedad relativa mínima.
* Humedad relativa media.
* Humedad relativa máxima.

---

### 4.2. Tiempo de exposición fuera de los límites del RD 486/1997

Se calcula:
* Tiempo con temperatura inferior a 17 °C.
* Tiempo con temperatura superior a 27 °C.
* Tiempo con humedad relativa inferior al 30 %.
* Tiempo con humedad relativa superior al 70 %.

Asimismo se calculan los porcentajes de tiempo asociados a cada situación.

#### Horario evaluado
Por defecto, estos tiempos, el ETA27, las horas de DI, la severidad y el cumplimiento del RD 486/1997 se evalúan únicamente en **horario lectivo** (de lunes a viernes, de 08:00 a 15:00), que es cuando las aulas están ocupadas. Los días y la franja horaria se pueden cambiar en la pestaña Informe, o se puede desactivar el filtro para evaluar las 24 horas de todos los días.

* Un registro cuenta como lectivo si su hora de inicio cae dentro del horario.
* Los días festivos y las vacaciones no se excluyen automáticamente.
* Las medias, mínimos y máximos de temperatura, humedad, DI y HI se calculan siempre sobre todo el periodo registrado.
* Si un aula no tiene ningún dato dentro del horario, su cumplimiento y severidad se muestran como «Sin datos».

---

### 4.3. Índice de Disconfort de Thom (DI)

#### Justificación
Se adopta el Índice de Disconfort de Thom como indicador principal de confort térmico debido a que:
* Es un índice ampliamente utilizado en climatología aplicada y estudios de confort.
* Puede calcularse únicamente a partir de temperatura y humedad relativa.
* Es compatible con los datos registrados por los sensores disponibles.
* Permite comparar condiciones térmicas entre aulas y periodos temporales.

#### Fórmula utilizada
`DI = T − (0,55 − 0,0055 × HR) × (T − 14,5)`

Donde:
* T = temperatura del aire (°C)
* HR = humedad relativa (%)

#### Clasificación operativa adoptada
* `< 21` : Confortable
* `21 - 24` : Ligero disconfort
* `24 - 27` : Disconfort moderado
* `27 - 29` : Disconfort severo
* `29 - 32` : Estrés térmico intenso
* `> 32` : Estrés térmico extremo

Estas categorías describen niveles crecientes de disconfort térmico y no deben interpretarse como categorías clínicas de riesgo sanitario.

---

### 4.4. ETA27 (Exposición Térmica Acumulada)

#### Definición
ETA27 es un indicador de exposición térmica acumulada desarrollado para el proyecto. Mide simultáneamente la intensidad y la duración de la exposición térmica.

#### Cálculo
Para cada periodo en el que la temperatura supera 27 °C se calcula:
`ETA27 = Σ[(T − 27) × tiempo]` (Unidad: °C·h)

#### Interpretación
ETA27 permite distinguir situaciones que presentan la misma temperatura máxima pero distinta duración de exposición. Ejemplo:
* 30 °C durante 30 minutos.
* 30 °C durante 5 horas.

Ambas situaciones generan impactos diferentes y ETA27 permite cuantificar esa diferencia objetivamente.

---

#### Clasificación de severidad
La severidad de cada aula (Verde, Amarillo, Naranja, Rojo) combina dos magnitudes:
* **ETA27 semanal:** ETA27 normalizado a una semana de registro (`ETA27 / horas con datos × 168`), para que el resultado no dependa de la duración de la campaña de medida. El ETA27 se acumula solo dentro del horario evaluado; las horas con datos son todas las registradas.
* **Impacto:** suma del porcentaje de tiempo por debajo de 17 °C y del porcentaje de tiempo con humedad relativa fuera del intervalo 30–70 %.

| Severidad | Condición |
|---|---|
| Verde | ETA27 semanal = 0 e impacto = 0 |
| Amarillo | ETA27 semanal < 5 °C·h e impacto < 5 % |
| Naranja | ETA27 semanal < 20 °C·h e impacto < 20 % |
| Rojo | Resto de casos |

Estos umbrales son operativos, propios del proyecto, y se evalúan sobre el horario seleccionado (véase el apartado 4.2).

---

### 4.5. Extended Heat Index (HI)

#### Definición
El Heat Index (HI) o Índice de Calor es un indicador biometeorológico que combina la temperatura del aire y la humedad relativa para estimar la temperatura aparente que experimenta el organismo humano. A diferencia de la temperatura ambiental, el Heat Index incorpora el efecto que la humedad ejerce sobre la evaporación del sudor, principal mecanismo fisiológico de disipación del calor. El resultado se expresa en grados Celsius (°C).

#### Objetivo
Mientras que el Índice de Thom (DI) evalúa el grado de disconfort térmico percibido, el Heat Index estima el esfuerzo fisiológico que debe realizar el organismo para mantener constante su temperatura corporal. Ambos proporcionan información complementaria.

#### Implementación (paquete oficial de Lu y Romps)
El Agente Clima IES calcula el Heat Index con una traducción a JavaScript del paquete oficial `heatindex` de Yi-Chuan Lu y David M. Romps (versión 0.0.2, <https://github.com/davidromps/heatindex>).

Ese paquete implementa el índice «más simple y rápido» de Lu et al. (2025, en revisión), que supera las limitaciones de la aproximación polinómica clásica de Rothfusz para extremos climáticos. Según sus autores, coincide con el índice de Steadman (1979) y con el *Extended Heat Index* de Lu y Romps (2022) para temperaturas del aire superiores a 27 °C, y presenta pequeñas diferencias por debajo.

En este proyecto, esas diferencias se han medido comparando ambas formulaciones: son nulas a partir de 27 °C y alcanzan como máximo unos 3,5 °C con aire fresco y muy seco (en torno a 1 °C en las condiciones habituales de un aula). No modifican la categoría de riesgo en ninguna combinación de temperatura y humedad, porque todos los valores afectados quedan por debajo de 27.

**Verificación.** La implementación reproduce los ocho valores de ejemplo publicados en la documentación del paquete con una diferencia inferior a 0,0000001 K.

#### Clasificación y Efectos en la Salud
La clasificación sigue la escala empleada por el National Weather Service (NWS) e ISGlobal:

| HI (°C) | Nivel | Interpretación fisiológica |
|---|---|---|
| < 27 | Seguro | La termorregulación funciona con normalidad. |
| 27 – 32 | Precaución | Aumenta el esfuerzo termorregulador. |
| 32 – 41 | Precaución extrema | La evaporación del sudor comienza a ser insuficiente. |
| 41 – 52 | Peligro | Dificultades crecientes para mantener estable la temperatura. |
| 52 – 93 | Peligro extremo | Mecanismos de compensación prácticamente agotados. |
| > 93 | Límite fisiológico | La temperatura corporal aumenta irreversiblemente. |

*Nota: Estos umbrales están referenciados a una persona adulta sana, hidratada, en reposo y a la sombra. En aulas con luz solar directa o actividad física, el riesgo se incrementa.*

---

## 5. Índices considerados y descartados

Durante el diseño metodológico se han evaluado diversos índices de confort térmico:

### PMV/PPD (Fanger)
* **Estado:** No adoptado.
* **Motivo:** Requiere variables no disponibles (temperatura radiante, velocidad del aire, metabolismo, vestimenta).

### WBGT
* **Estado:** No adoptado.
* **Motivo:** Requiere sensores físicos específicos (termómetro de globo y de temperatura húmeda natural) de los que no se dispone.

### UTCI
* **Estado:** No adoptado.
* **Motivo:** Requiere variables ambientales complejas (radiación y viento) no medidas en los interiores de las aulas.

---

## 6. Filosofía metodológica

El proyecto se fundamenta en los siguientes principios:

1. **Transparencia:** Todos los indicadores utilizados deben estar claramente documentados y ser auditables.
2. **Reproducibilidad:** Los resultados deben poder reproducirse exactamente a partir de los datos originales o proyectos guardados.
3. **Fundamentación científica:** Los indicadores empleados (Thom, ETA27, Lu & Romps) están respaldados por literatura científica o la normativa vigente.
4. **Separación entre medición e interpretación:** La aplicación calcula indicadores físicos y biometeorológicos; la interpretación educativa, sanitaria o de confort es una capa exterior fundamentada.

---

## 7. Estado actual y Trabajo Futuro

### Decisiones consolidadas e implementadas en la v2.x
* Utilización del Índice de Disconfort de Thom como indicador base del confort.
* Adopción del Heat Index de Lu y Romps (paquete oficial `heatindex`) para estrés fisiológico.
* Uso de ETA27 como indicador integral de intensidad-duración.
* Incorporación de las leyendas e interpretaciones de escalas térmicas (ISGlobal / NWS) al flujo de la aplicación.
* Exportación de la trazabilidad de los datos a reportes globales HTML standalone.

### Decisiones pendientes o investigación futura
* Evaluación de la posible incorporación de sondas de temperatura radiante o detectores de CO2 al hardware de toma de datos.
* Elaboración y publicación de la bibliografía de referencia completa del proyecto en formato académico.

---

### Referencias Principales
* Lu, Y.-C., & Romps, D. M. (2025). *heatindex: Tools for Calculating Heat Stress* (versión 0.0.2). <https://heatindex.org>
* Lu, Y.-C., et al. (2025). Simpler and faster: an improved heat index (en revisión).
* Lu, Y.-C., & Romps, D. M. (2022). Extending the Heat Index. *Journal of Applied Meteorology and Climatology*, 61(10), 1367–1383.
* National Weather Service (NOAA). Heat Index.
* ISGlobal. Heat Index Calculator (basada en el Extended Heat Index de Lu & Romps).
* Steadman, R. G. (1979). The Assessment of Sultriness.
* Real Decreto 486/1997 sobre disposiciones mínimas de seguridad y salud en los lugares de trabajo.
