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

### 4.5. Extended Heat Index (HI)

#### Definición
El Heat Index (HI) o Índice de Calor es un indicador biometeorológico que combina la temperatura del aire y la humedad relativa para estimar la temperatura aparente que experimenta el organismo humano. A diferencia de la temperatura ambiental, el Heat Index incorpora el efecto que la humedad ejerce sobre la evaporación del sudor, principal mecanismo fisiológico de disipación del calor. El resultado se expresa en grados Celsius (°C).

#### Objetivo
Mientras que el Índice de Thom (DI) evalúa el grado de disconfort térmico percibido, el Heat Index estima el esfuerzo fisiológico que debe realizar el organismo para mantener constante su temperatura corporal. Ambos proporcionan información complementaria.

#### Implementación (Lu & Romps, 2022)
El Agente Clima IES implementa el *Extended Heat Index*, desarrollado por Lu & Romps (2022). Constituye una adaptación directa a JavaScript de la implementación oficial distribuida por los autores, superando las limitaciones de la aproximación polinómica clásica de Rothfusz para extremos climáticos.

#### Clasificación y Efectos en la Salud
La clasificación sigue la escala empleada por el National Weather Service (NWS) e ISGlobal:

| HI (°C) | Nivel | Interpretación fisiológica |
|---|---|---|
| < 27 | Seguro | La termorregulación funciona con normalidad. |
| 27 – 32 | Precaución | Aumenta el esfuerzo termorregulador. |
| 33 – 40 | Precaución extrema | La evaporación del sudor comienza a ser insuficiente. |
| 41 – 51 | Peligro | Dificultades crecientes para mantener estable la temperatura. |
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
* Adopción e implementación algorítmica del *Extended Heat Index* (Lu & Romps) para estrés fisiológico.
* Uso de ETA27 como indicador integral de intensidad-duración.
* Incorporación de las leyendas e interpretaciones de escalas térmicas (ISGlobal / NWS) al flujo de la aplicación.
* Exportación de la trazabilidad de los datos a reportes globales HTML standalone.

### Decisiones pendientes o investigación futura
* Evaluación de la posible incorporación de sondas de temperatura radiante o detectores de CO2 al hardware de toma de datos.
* Elaboración y publicación de la bibliografía de referencia completa del proyecto en formato académico.

---

### Referencias Principales
* Lu, M., & Romps, D. M. (2022). Extending the Heat Index. *Journal of Applied Meteorology and Climatology*.
* National Weather Service (NOAA). Heat Index.
* ISGlobal. Heat Index Calculator (basada en el Extended Heat Index de Lu & Romps).
* Steadman, R. G. (1979). The Assessment of Sultriness.
* Real Decreto 486/1997 sobre disposiciones mínimas de seguridad y salud en los lugares de trabajo.
