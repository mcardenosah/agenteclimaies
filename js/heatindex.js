// =====================================================
// Agente Clima IES
// heatindex.js
//
// Extended Heat Index de Lu & Romps (2022),
// "Extending the Heat Index", J. Appl. Meteor. Climatol.
//
// Implementación en JavaScript del algoritmo completo
// (regiones I a VI del modelo):
//   I      : piel parcialmente cubierta (variable phi)
//   II-III : persona vestida (variable Rf)
//   IV-V   : piel desnuda (variable Rs)
//   VI     : la temperatura corporal aumenta (dTc/dt)
//
// La interfaz pública trabaja en °C y % de HR.
// Internamente el algoritmo trabaja en Kelvin y Pa.
// =====================================================

var calculateHeatIndex = (function () {

    "use strict";

    // -------------------------------------------------
    // Constantes termodinámicas
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

    // Presión de vapor de saturación (hielo por debajo del punto triple)
    function pvstar(T) {

        if (T <= 0) {
            return 0;
        }

        if (T < TTRIP) {
            return PTRIP *
                Math.pow(T / TTRIP, (CPV - CVS) / RGASV) *
                Math.exp(
                    (E0V + E0S - (CVV - CVS) * TTRIP) / RGASV *
                    (1 / TTRIP - 1 / T)
                );
        }

        return PTRIP *
            Math.pow(T / TTRIP, (CPV - CVL) / RGASV) *
            Math.exp(
                (E0V - (CVV - CVL) * TTRIP) / RGASV *
                (1 / TTRIP - 1 / T)
            );
    }

    // Calor latente de vaporización
    function Le(T) {
        return E0V + (CVV - CVL) * (T - TTRIP) + RGASV * T;
    }

    // -------------------------------------------------
    // Constantes del modelo fisiológico
    // -------------------------------------------------

    const SIGMA = 5.67e-8;     // W/m^2/K^4
    const EPSILON = 0.97;      // emisividad
    const MASS = 83.6;         // kg
    const HEIGHT = 1.69;       // m
    const AREA = 0.202 * Math.pow(MASS, 0.425) * Math.pow(HEIGHT, 0.725);
    const CPC = 3492;          // J/kg/K
    const C = MASS * CPC / AREA;
    const R_CLOTH = 124;       // Pa/K (Zf / Rf)
    const Q = 180;             // W/m^2 (tasa metabólica)
    const PHI_SALT = 0.9;
    const TC = 310;            // K (temperatura corporal)
    const PC = PHI_SALT * pvstar(TC);
    const L = Le(310);
    const P = 1.013e5;         // Pa
    const ETA = 1.43e-6;       // kg/J
    const PA0 = 1.6e3;         // Pa (presión de vapor de referencia)
    const RS0 = 0.0387;        // m^2 K/W (resistencia de la piel de referencia)
    const PHI0 = 0.84;         // fracción de piel cubierta de referencia

    const ZA = 60.6 / 17.4;        // piel expuesta (persona vestida)
    const ZA_BAR = 60.6 / 11.6;    // superficie de la ropa
    const ZA_UN = 60.6 / 12.3;     // piel desnuda

    // Pérdida de calor por respiración
    function Qv(Ta, Pa) {
        return ETA * Q * (
            CPA * (TC - Ta) +
            L * RGASA / (P * RGASV) * (PC - Pa)
        );
    }

    // Resistencia de la piel al paso de vapor
    function Zs(Rs) {
        return Rs === RS0 ? 52.1 : 6.0e8 * Math.pow(Rs, 5);
    }

    // Resistencias térmicas superficie-aire
    function makeRa(hc, phiRad) {
        return function (Ts, Ta) {
            const hr =
                EPSILON * phiRad * SIGMA *
                (Ts * Ts + Ta * Ta) * (Ts + Ta);
            return 1 / (hc + hr);
        };
    }

    const Ra = makeRa(17.4, 0.85);
    const RaBar = makeRa(11.6, 0.79);
    const RaUn = makeRa(12.3, 0.80);

    // -------------------------------------------------
    // Búsqueda de raíces (método de Brent)
    // -------------------------------------------------

    function solve(f, x1, x2, tol, maxIter) {

        let a = x1;
        let b = x2;
        let fa = f(a);
        let fb = f(b);

        if (fa === 0) return a;
        if (fb === 0) return b;

        if (fa * fb > 0) {
            throw new Error("Root not bracketed.");
        }

        if (Math.abs(fa) < Math.abs(fb)) {
            [a, b] = [b, a];
            [fa, fb] = [fb, fa];
        }

        let c = a;
        let fc = fa;
        let d = b - a;
        let mflag = true;

        for (let i = 0; i < maxIter; i++) {

            let s;

            if (fa !== fc && fb !== fc) {
                s =
                    a * fb * fc / ((fa - fb) * (fa - fc)) +
                    b * fa * fc / ((fb - fa) * (fb - fc)) +
                    c * fa * fb / ((fc - fa) * (fc - fb));
            } else {
                s = b - fb * (b - a) / (fb - fa);
            }

            const lim = (3 * a + b) / 4;

            const fuera =
                !((s > lim && s < b) || (s < lim && s > b));

            if (
                fuera ||
                !Number.isFinite(s) ||
                (mflag && Math.abs(s - b) >= Math.abs(b - c) / 2) ||
                (!mflag && Math.abs(s - b) >= Math.abs(c - d) / 2)
            ) {
                s = (a + b) / 2;
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

            if (fb === 0 || Math.abs(b - a) < tol) {
                return b;
            }
        }

        throw new Error("Maximum iterations reached.");
    }

    const TOL = 1e-8;
    const MAX_ITER = 200;

    // -------------------------------------------------
    // Variable de equilibrio para (Ta, HR)
    // Devuelve { name, value } con name en
    // "phi" | "Rf" | "Rs" | "dTcdt"
    // -------------------------------------------------

    function findEqvar(Ta, RH) {

        const Pa = RH * pvstar(Ta);
        const Rs = RS0;
        const phi = PHI0;

        const m = (PC - Pa) / (Zs(Rs) + ZA);
        const mBar = (PC - Pa) / (Zs(Rs) + ZA_BAR);

        const Ts = solve(
            x => (x - Ta) / Ra(x, Ta) + (PC - Pa) / (Zs(Rs) + ZA) - (TC - x) / Rs,
            Math.max(0, Math.min(TC, Ta) - Rs * Math.abs(m)),
            Math.max(TC, Ta) + Rs * Math.abs(m),
            TOL, MAX_ITER
        );

        const Tf0 = solve(
            x => (x - Ta) / RaBar(x, Ta) + (PC - Pa) / (Zs(Rs) + ZA_BAR) - (TC - x) / Rs,
            Math.max(0, Math.min(TC, Ta) - Rs * Math.abs(mBar)),
            Math.max(TC, Ta) + Rs * Math.abs(mBar),
            TOL, MAX_ITER
        );

        const metab = Q - Qv(Ta, Pa);

        // C*dTc/dt con Rf = Zf = infinito
        const flux1 = metab - (1 - phi) * (TC - Ts) / Rs;

        // C*dTc/dt con Rf = Zf = 0
        const flux2 = flux1 - phi * (TC - Tf0) / Rs;

        // Región I
        if (flux1 <= 0) {
            return {
                name: "phi",
                value: 1 - metab * Rs / (TC - Ts)
            };
        }

        // Regiones II y III (persona vestida)
        if (flux2 <= 0) {

            const TsBar =
                TC - metab * Rs / phi +
                (1 / phi - 1) * (TC - Ts);

            const Tf = solve(
                x =>
                    (x - Ta) / RaBar(x, Ta) +
                    (PC - Pa) * (x - Ta) /
                    (
                        (Zs(Rs) + ZA_BAR) * (x - Ta) +
                        R_CLOTH * RaBar(x, Ta) * (TsBar - x)
                    ) -
                    (TC - TsBar) / Rs,
                Ta, TsBar, TOL, MAX_ITER
            );

            return {
                name: "Rf",
                value: RaBar(Tf, Ta) * (TsBar - Tf) / (Tf - Ta)
            };
        }

        // Regiones IV, V y VI (piel desnuda)
        const flux3 =
            metab -
            (TC - Ta) / RaUn(TC, Ta) -
            (PHI_SALT * pvstar(TC) - Pa) / ZA_UN;

        if (flux3 < 0) {

            let TsUn = solve(
                x =>
                    (x - Ta) / RaUn(x, Ta) +
                    (PC - Pa) / (Zs((TC - x) / metab) + ZA_UN) -
                    metab,
                0, TC, TOL, MAX_ITER
            );

            let RsUn = (TC - TsUn) / metab;

            const ps =
                PC - (PC - Pa) * Zs(RsUn) / (Zs(RsUn) + ZA_UN);

            // Región V: la piel está saturada de sudor
            if (ps > PHI_SALT * pvstar(TsUn)) {

                TsUn = solve(
                    x =>
                        (x - Ta) / RaUn(x, Ta) +
                        (PHI_SALT * pvstar(x) - Pa) / ZA_UN -
                        metab,
                    0, TC, TOL, MAX_ITER
                );

                RsUn = (TC - TsUn) / metab;
            }

            return { name: "Rs", value: RsUn };
        }

        // Región VI
        return { name: "dTcdt", value: flux3 / C };
    }

    // -------------------------------------------------
    // Temperatura (a la presión de vapor de referencia)
    // que produce la misma variable de equilibrio
    // -------------------------------------------------

    const ORDER = ["phi", "Rf", "Rs", "dTcdt"];

    function eqvarAt(T, RH, want) {

        const e = findEqvar(T, RH);

        if (e.name === want) {
            return e.value;
        }

        const antes =
            ORDER.indexOf(e.name) < ORDER.indexOf(want);

        // Valor que toma la variable fuera de su región
        if (want === "phi") return PHI0;
        if (want === "Rf") return antes ? 1e9 : 0;
        if (want === "Rs") return antes ? RS0 : 0;
        return 0;
    }

    function findT(name, value) {

        if (name === "phi") {
            return solve(
                T => eqvarAt(T, 1, "phi") - value,
                0.1, 240, TOL, MAX_ITER
            );
        }

        if (name === "Rf") {
            return solve(
                T => eqvarAt(T, Math.min(1, PA0 / pvstar(T)), "Rf") - value,
                230, 300, TOL, MAX_ITER
            );
        }

        if (name === "Rs") {
            return solve(
                T => eqvarAt(T, PA0 / pvstar(T), "Rs") - value,
                295, 350, TOL, MAX_ITER
            );
        }

        return solve(
            T => eqvarAt(T, PA0 / pvstar(T), "dTcdt") - value,
            340, 1000, TOL, MAX_ITER
        );
    }

    function heatIndexKelvin(Ta, RH) {
        const e = findEqvar(Ta, RH);
        return findT(e.name, e.value);
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
// del Extended Heat Index (Lu & Romps / ISGlobal).
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
