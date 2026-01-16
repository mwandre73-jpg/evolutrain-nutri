/**
 * Utilitários para cálculos fisiológicos de corrida
 */

// Fórmula de Cooper para VO2 Máx: VO2 = (distância em metros - 504.9) / 44.73
export const calcularVo2Cooper = (distanciaMetros: number): number => {
    return (distanciaMetros - 504.9) / 44.73;
};

// Cálculo Vmax baseado em Frequência Cardíaca (conforme Excel):
// Vmax est = (FC Máxima / FC Final) * Velocidade do Teste
export const calcularVmaxEsforco = (fcMax: number, fcFinal: number, velocidadeTeste: number): number => {
    if (fcFinal <= 0) return 0;
    return (fcMax / fcFinal) * velocidadeTeste;
};

// VO2 Máx baseado na Vmax (Fator 3.57 conforme Excel/Solicitação)
// Fórmula invertida: Vmax = VO2 / 3.57
export const calcularVo2PelaVmax = (vmax: number): number => {
    return vmax * 3.57;
};

export const calcularVmaxPeloVo2 = (vo2: number): number => {
    return vo2 / 3.57;
};

// Limiar Anaeróbico (m/min) = (Vmax km/h * 1000 / 60) * 0.89 (conforme imagem 4)
export const calcularLimiarPelaVmax = (vmaxKmh: number): number => {
    const vmaxMmin = (vmaxKmh * 1000) / 60;
    return vmaxMmin * 0.89;
};

// Zonas de Intensidade baseadas na % da Vmax
export const ZONAS_CONFIG = {
    REGENERATIVO: { min: 0.60, max: 0.70, label: "Z1 - Regenerativo" },
    AEROBICO: { min: 0.70, max: 0.80, label: "Z2 - Aeróbico" },
    LIMIAR: { min: 0.80, max: 0.90, label: "Z3 - Limiar Anaeróbico" },
    ANAEROBICO: { min: 0.90, max: 1.05, label: "Z4 - Anaeróbico Lático" },
};

export interface ZonaRitmo {
    label: string;
    paceMin: string; // m:ss
    paceMax: string; // m:ss
}

// Converte velocidade (km/h) para Pace (min/km)
export const kmhParaPace = (kmh: number): string => {
    if (kmh <= 0) return "0:00";
    const totalMinutos = 60 / kmh;
    let minutos = Math.floor(totalMinutos);
    let segundos = Math.round((totalMinutos - minutos) * 60);

    if (segundos === 60) {
        minutos += 1;
        segundos = 0;
    }

    return `${minutos}:${segundos < 10 ? "0" : ""}${segundos}`;
};

export const calcularZonasDeRitmo = (vmax: number): ZonaRitmo[] => {
    return Object.values(ZONAS_CONFIG).map((zona) => ({
        label: zona.label,
        paceMin: kmhParaPace(vmax * zona.max),
        paceMax: kmhParaPace(vmax * zona.min),
    }));
};

// Novas classificações:
// LAN (Limiar Anaeróbico) = 89% da Vmax
export const calcularLAN = (vmax: number): number => vmax * 0.89;

// CRM = 97% da LAN
// CL = 92% da LAN
export const calcularVelocidadePorClassificacao = (vmax: number, classificacao: string, percentualManual?: number): number => {
    const lan = calcularLAN(vmax);

    if (percentualManual) {
        if (classificacao === 'CustomVmax') return vmax * (percentualManual / 100);
        if (classificacao === 'Speed') return vmax * (percentualManual / 100); // Para Speed, vmax já é a base km/h do teste
        return lan * (percentualManual / 100);
    }

    switch (classificacao) {
        case 'CRM': return lan * 0.97;
        case 'CL': return lan * 0.92;
        case 'Z1': return vmax * 0.65; // Média de 60-70% Vmax
        case 'Z2': return vmax * 0.75; // Média de 70-80% Vmax
        case 'Z3': return vmax * 0.85; // Média de 80-90% Vmax
        case 'IE': return vmax * 0.95; // Intervalado Extensivo
        case 'Speed': return vmax; // Base 100% se não houver percentual manual
        default: return lan;
    }
};

// Carga Musculação: % de um exercício de referência (Agachamento para Inferiores, Supino para Superiores)
export const calcularCargaMusculacao = (valorReferencia: number, percentual: number = 85): number => {
    return valorReferencia * (percentual / 100);
};

// 1RM Brzycki: 1RM = Peso / (1.0278 - (0.0278 * n repetições))
export const calcular1RMBrzycki = (peso: number, repeticoes: number): number => {
    if (repeticoes <= 0) return peso;
    if (repeticoes >= 37) return 0; // Fórmula de Brzycki é menos precisa acima de 10-12 reps, e entra em colapso matemático em 37 reps
    return peso / (1.0278 - (0.0278 * repeticoes));
};
// --- Cálculos de Anamnese ---

/**
 * IMC = Peso / (Altura * Altura)
 * @param peso kg
 * @param altura m
 */
export const calcularIMC = (peso: number, altura: number): number => {
    if (altura <= 0) return 0;
    const alturaM = altura > 3 ? altura / 100 : altura; // Fallback se passar em cm
    return peso / (alturaM * alturaM);
};

/**
 * Pollock 7 Dobras - Densidade Corporal (Homens)
 * Dobras: Peitoral, Axilar Média, Tríceps, Subescapular, Abdominal, Supra-ilíaca, Coxa
 */
export const calcularDensidadePollock7Homens = (somaDobras: number, idade: number): number => {
    return 1.112 - (0.00043499 * somaDobras) + (0.00000055 * Math.pow(somaDobras, 2)) - (0.00028826 * idade);
};

/**
 * Pollock 7 Dobras - Densidade Corporal (Mulheres)
 */
export const calcularDensidadePollock7Mulheres = (somaDobras: number, idade: number): number => {
    return 1.0970 - (0.00046971 * somaDobras) + (0.00000056 * Math.pow(somaDobras, 2)) - (0.00012828 * idade);
};

/**
 * Pollock 3 Dobras - Densidade Corporal (Homens)
 * Dobras: Peitoral, Abdominal, Coxa
 */
export const calcularDensidadePollock3Homens = (somaDobras: number, idade: number): number => {
    return 1.10938 - (0.0008267 * somaDobras) + (0.0000016 * Math.pow(somaDobras, 2)) - (0.0002574 * idade);
};

/**
 * Pollock 3 Dobras - Densidade Corporal (Mulheres)
 * Dobras: Tríceps, Supra-ilíaca, Coxa
 */
export const calcularDensidadePollock3Mulheres = (somaDobras: number, idade: number): number => {
    return 1.0994921 - (0.0009929 * somaDobras) + (0.0000023 * Math.pow(somaDobras, 2)) - (0.0001392 * idade);
};

/**
 * Equação de Siri para % de Gordura
 * %G = ((4.95 / DC) - 4.50) * 100
 */
export const calcularPercentualGorduraSiri = (densidadeCorporal: number): number => {
    if (densidadeCorporal <= 0) return 0;
    return ((4.95 / densidadeCorporal) - 4.50) * 100;
};
