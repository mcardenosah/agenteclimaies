// =====================================================
// Agente Clima IES
// heatindex.js
//
// Heat Index de Lu y Romps.
//
// Traducción a JavaScript del paquete oficial "heatindex"
// de Yi-Chuan Lu y David M. Romps, versión 0.0.2
// (https://github.com/davidromps/heatindex, archivos
// cpp/heatindex.cpp, cpp/thermo.cpp y cpp/solve.cpp).
//
// Ese paquete implementa el índice "más simple y rápido"
// de Lu et al. (2025, en revisión). Según sus autores,
// coincide con Steadman (1979) y con Lu y Romps (2022)
// para temperaturas del aire superiores a 300 K (27 °C)
// y presenta pequeñas diferencias por debajo.
//
// Verificación: reproduce los ocho valores de ejemplo
// publicados en la documentación del paquete con una
// diferencia inferior a 1e-7 K.
//
// La interfaz pública trabaja en °C y % de HR.
// Internamente el algoritmo trabaja en Kelvin y Pa.
// =====================================================

var calculateHeatIndex = (function () {

    "use strict";

    // -------------------------------------------------
    // Constantes termodinámicas (thermo.h)
    // -------------------------------------------------

    const TTRIP = 273.16;      // K
    const PTRIP = 611.65;      // Pa
    const E0V = 2.3740e6;      // J/kg
    const E0S = 0.3337e6;      // J/kg
    const RGASA = 287.04;      // J/kg/K
    const RGASV = 461.0;       // J/kg/K
    const CVA = 719.0;         // J/kg/K
    const CVV = 1418.0;        // J/kg/K
    const CVL = 4119.0;        // J/kg/K
    const CVS = 1861.0;        // J/kg/K
    const CPA = CVA + RGASA;
    const CPV = CVV + RGASV;

    // Presión de vapor de saturación sobre agua líquida
    function pvstarl(T) {

        if (T <= 0) {
            return 0;
        }

        return PTRIP *
            Math.pow(T / TTRIP, (CPV - CVL) / RGASV) *
            Math.exp(
                (E0V - (CVV - CVL) * TTRIP) / RGASV *
                (1 / TTRIP - 1 / T)
            );
    }

    // Presión de vapor de saturación sobre hielo
    function pvstars(T) {

        if (T <= 0) {
            return 0;
        }

        return PTRIP *
            Math.pow(T / TTRIP, (CPV - CVS) / RGASV) *
            Math.exp(
                (E0V + E0S - (CVV - CVS) * TTRIP) / RGASV *
                (1 / TTRIP - 1 / T)
            );
    }

    function pvstar(T) {
        return T < TTRIP ? pvstars(T) : pvstarl(T);
    }

    // -------------------------------------------------
    // Constantes fisiológicas (heatindex.h)
    // -------------------------------------------------

    const Q = 180;                       // W/m^2, tasa metabólica
    const PHI_SALT = 0.9;                // saturación de la solución salina
    const TC = 310;                      // K, temperatura corporal
    const PC = PHI_SALT * pvstar(TC);    // Pa, presión de vapor corporal
    const PA0 = 1.6e3;                   // Pa, presión de vapor de referencia
    const HC = 12.3;                     // W/m^2/K, coeficiente de transferencia
    const ZA = 60.6 / HC;                // m^2 Pa/W

    // Pérdida de calor por respiración, W/m^2
    function Qv(Ta, Pa) {

        const p = 1.013e5;       // Pa
        const eta = 1.43e-6;     // kg/J
        const L = 2417405.2;     // J/kg

        return eta * Q * (
            CPA * (TC - Ta) +
            L * RGASA / (p * RGASV) * (PC - Pa)
        );
    }

    // Resistencia de la piel al paso de vapor, Pa m^2/W
    function Zs(Rs) {
        return 6.0e8 * Rs * Rs * Rs * Rs * Rs;
    }

    // Resistencia térmica piel-aire, K m^2/W
    function Ra(T1, T2) {

        const epsilon = 0.97;
        const phiRad = 0.80;
        const sigma = 5.67e-8;

        const hr =
            epsilon * phiRad * sigma *
            (T1 * T1 + T2 * T2) * (T1 + T2);

        return 1 / (HC + hr);
    }

    // -------------------------------------------------
    // Búsqueda de raíces: método de Brent (solve.cpp)
    // -------------------------------------------------

    const TOL = 1e-8;
    const MAX_ITER = 100;

    function solve(f, x1, x2, tol, maxIter) {

        let a = x1;
        let b = x2;
        let fa = f(a);
        let fb = f(b);

        if (fa * fb >= 0) {
            throw new Error("Root not bracketed.");
        }

        if (Math.abs(fa) < Math.abs(fb)) {
            [a, b] = [b, a];
            [fa, fb] = [fb, fa];
        }

        let c = a;
        let fc = fa;
        let s = b;
        let d = b - a;
        let mflag = true;

        for (let i = 0; i < maxIter; i++) {

            if (fa !== fc && fb !== fc) {
                // interpolación cuadrática inversa
                s =
                    a * fb * fc / ((fa - fb) * (fa - fc)) +
                    b * fa * fc / ((fb - fa) * (fb - fc)) +
                    c * fa * fb / ((fc - fa) * (fc - fb));
            } else {
                // secante
                s = b - fb * (b - a) / (fb - fa);
            }

            const lim = (3 * a + b) / 4;

            if (
                !((s > lim && s < b) || (s < lim && s > b)) ||
                (mflag && Math.abs(s - b) >= Math.abs(b - c) / 2) ||
                (!mflag && Math.abs(s - b) >= Math.abs(c - d) / 2)
            ) {
                s = (a + b) / 2;   // bisección
                mflag = true;
            } else {
                mflag = false;
            }

            const fs = f(s);

            d = c;
            c = b;
            fc = fb;

            if (fa * fs < 0) {
                b = s;
                fb = fs;
            } else {
                a = s;
                fa = fs;
            }

            if (Math.abs(fa) < Math.abs(fb)) {
                [a, b] = [b, a];
                [fa, fb] = [fb, fa];
            }

            if (Math.abs(b - a) < tol) {
                return b;
            }
        }

        throw new Error("Max iterations reached.");
    }

    // -------------------------------------------------
    // Estado fisiológico para (T, HR) (heatindex.cpp)
    // Devuelve la resistencia de la piel Rs y, si el
    // cuerpo no puede disipar el calor, C*dTc/dt.
    // -------------------------------------------------

    function physiology(T, rh) {

        const Ta = T;
        const Pa = rh * pvstar(T);

        let CdTcdt =
            Q - Qv(Ta, Pa) -
            (TC - Ta) / Ra(TC, Ta) -
            (PC - Pa) / ZA;

        let Rs = 0;

        if (CdTcdt < 0) {

            CdTcdt = 0;

            const metab = Q - Qv(Ta, Pa);

            const f = Ts =>
                (Ts - Ta) / Ra(Ts, Ta) +
                Math.min(
                    (PC - Pa) / (Zs((TC - Ts) / metab) + ZA),
                    (PHI_SALT * pvstar(Ts) - Pa) / ZA
                ) -
                metab;

            // tolerancia dividida por 100, como en el original,
            // para que el índice tenga la precisión TOL
            const Ts = solve(f, 0, TC, TOL / 100, MAX_ITER);

            Rs = (TC - Ts) / metab;
        }

        return { Rs, CdTcdt };
    }

    function heatIndexKelvin(T, rh) {

        const estado = physiology(T, rh);

        const Rs = estado.Rs;
        const CdTcdt = estado.CdTcdt;

        if (Rs > 0) {

            const f = Ta => {

                const Pa = Math.min(PA0, pvstar(Ta));

                const Ts = TC - Rs * (Q - Qv(Ta, Pa));

                const Ps = Math.min(
                    (Zs(Rs) * Pa + ZA * PC) / (Zs(Rs) + ZA),
                    PHI_SALT * pvstar(Ts)
                );

                return (
                    Q - Qv(Ta, Pa) -
                    (Ts - Ta) / Ra(Ts, Ta) -
                    (Ps - Pa) / ZA
                );
            };

            return solve(f, 0, 345, TOL, MAX_ITER);
        }

        const f = Ta => {

            const Pa = Math.min(PA0, pvstar(Ta));

            return (
                Q - Qv(Ta, Pa) -
                (TC - Ta) / Ra(TC, Ta) -
                (PC - Pa) / ZA -
                CdTcdt
            );
        };

        return solve(f, 340, T + 3500, TOL, MAX_ITER);
    }

    // -------------------------------------------------
    // Interfaz pública (°C, % HR) con memoria de resultados
    // -------------------------------------------------

    const cache = new Map();
    const CACHE_MAX = 200000;

    return function calculateHeatIndex(temperaturaC, humedad) {

        if (
            !Number.isFinite(temperaturaC) ||
            !Number.isFinite(humedad)
        ) {
            return NaN;
        }

        const key = temperaturaC + "|" + humedad;

        const guardado = cache.get(key);

        if (guardado !== undefined) {
            return guardado;
        }

        const T = temperaturaC + 273.15;

        // Algunos sensores registran valores ligeramente
        // fuera de 0-100 %: se acotan al intervalo físico.
        const rh = Math.min(1, Math.max(0, humedad / 100));

        let hi = NaN;

        if (T > 0) {
            try {
                hi = heatIndexKelvin(T, rh) - 273.15;
            } catch (error) {
                hi = NaN;
            }
        }

        if (cache.size >= CACHE_MAX) {
            cache.clear();
        }

        cache.set(key, hi);

        return hi;
    };

})();

// =====================================================
// Clasificación del Heat Index
//
// Tabla única de umbrales (°C), usada por los cálculos,
// las leyendas y los informes. Escala del National
// Weather Service ampliada con el límite fisiológico
// del Heat Index extendido (Lu y Romps / ISGlobal).
// =====================================================

const HI_LEVELS = [

    {
        level: 0,
        max: 27,
        category: "Sin riesgo",
        color: "#86efac",
        className: "hi-safe",
        effects:
            "La mayoría de la población no experimenta efectos adversos por calor.",
        recommendation:
            "Condiciones confortables."
    },

    {
        level: 1,
        max: 32,
        category: "Precaución",
        color: "#fef08a",
        className: "hi-caution",
        effects:
            "Posible fatiga tras una exposición prolongada o actividad física continuada.",
        recommendation:
            "Mantener hidratación y vigilancia."
    },

    {
        level: 2,
        max: 41,
        category: "Precaución extrema",
        color: "#fbbf24",
        className: "hi-extreme-caution",
        effects:
            "Posibles calambres y agotamiento por calor. La exposición prolongada aumenta el riesgo.",
        recommendation:
            "Reducir la exposición y aumentar los periodos de descanso."
    },

    {
        level: 3,
        max: 52,
        category: "Peligro",
        color: "#f97316",
        className: "hi-danger",
        effects:
            "Alta probabilidad de agotamiento por calor. Existe riesgo de golpe de calor si la exposición continúa.",
        recommendation:
            "Evitar actividades intensas y limitar la permanencia en espacios cálidos."
    },

    {
        level: 4,
        max: 93,
        category: "Peligro extremo",
        color: "#dc2626",
        className: "hi-extreme-danger",
        effects:
            "Riesgo muy elevado de golpe de calor incluso con exposiciones relativamente cortas.",
        recommendation:
            "Evitar la exposición. Se requieren medidas inmediatas de protección."
    },

    {
        level: 5,
        max: Infinity,
        category: "Límite fisiológico",
        color: "#7e22ce",
        className: "hi-limit",
        effects:
            "La temperatura corporal aumenta de forma continua: la termorregulación no es posible.",
        recommendation:
            "Exposición incompatible con la permanencia de personas."
    }

];

function classifyHeatIndex(hi) {

    if (!Number.isFinite(hi)) {
        return null;
    }

    for (const nivel of HI_LEVELS) {

        if (hi < nivel.max) {
            return {
                level: nivel.level,
                category: nivel.category,
                color: nivel.color,
                className: nivel.className,
                effects: nivel.effects,
                recommendation: nivel.recommendation
            };
        }
    }

    return null;
}

function getHeatIndexDescription(hi) {
    const info = classifyHeatIndex(hi);
    return info ? info.category : "";
}

function getHeatIndexColor(hi) {
    const info = classifyHeatIndex(hi);
    return info ? info.color : "#999999";
}

function getHeatIndexEffects(hi) {
    const info = classifyHeatIndex(hi);
    return info ? info.effects : "";
}

function getHeatIndexRecommendation(hi) {
    const info = classifyHeatIndex(hi);
    return info ? info.recommendation : "";
}

function calculateHeatIndexInfo(temperatura, humedad) {

    const hi = calculateHeatIndex(temperatura, humedad);

    return {
        value: hi,
        ...classifyHeatIndex(hi)
    };
}

function calculateHeatIndexResult(tempC, humedad) {

    const hi = calculateHeatIndex(tempC, humedad);

    const categoria = classifyHeatIndex(hi) || {};

    return {
        temperatura: tempC,
        humedad,
        hi,
        nivel: categoria.level,
        categoria: categoria.category,
        color: categoria.color,
        efectos: categoria.effects,
        recomendacion: categoria.recommendation
    };
}
