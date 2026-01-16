"use client";

import React, { useState, useEffect } from "react";
import {
    calcularVo2Cooper,
    calcularVmaxEsforco,
    calcularVmaxPeloVo2,
    calcularVo2PelaVmax,
    calcularLimiarPelaVmax,
    calcularZonasDeRitmo,
    calcular1RMBrzycki,
    ZonaRitmo
} from "@/lib/calculos";
import { getAthletes } from "@/app/actions/athletes";
import { saveFitnessMetric } from "@/app/actions/metrics";

export default function TestesPage() {
    const [tipoTeste, setTipoTeste] = useState<string>("cooper");
    const [categoria, setCategoria] = useState<string>("AEROBIC");

    // Estados Cooper
    const [distancia, setDistancia] = useState<number>(0);

    // Estados Teste de Esforço (HR)
    const [fcFinal, setFcFinal] = useState<number>(0);
    const [fcMaxima, setFcMaxima] = useState<number>(0);
    const [velocidadeTeste, setVelocidadeTeste] = useState<number>(0);

    // Estados 1RM
    const [exercicio, setExercicio] = useState<string>("Supino");
    const [peso1RM, setPeso1RM] = useState<number>(0);
    const [repeticoes1RM, setRepeticoes1RM] = useState<number>(0);
    const [resultado1RM, setResultado1RM] = useState<number>(0);

    // Estados Velocidade/Histórico
    const [distanciaCustom, setDistanciaCustom] = useState<number>(0);
    const [tempoSegundos, setTempoSegundos] = useState<number>(0);

    // Resultados Comuns
    const [vo2, setVo2] = useState<number>(0);
    const [vmax, setVmax] = useState<number>(0);
    const [limiar, setLimiar] = useState<number>(0);
    const [zonas, setZonas] = useState<ZonaRitmo[]>([]);

    // Estados do Banco
    const [alunos, setAlunos] = useState<{ id: string; name: string }[]>([]);
    const [selectedAlumnoId, setSelectedAlumnoId] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        const loadAthletes = async () => {
            const data = await getAthletes();
            if (data.length > 0) {
                setAlunos(data);
            } else {
                setAlunos([]);
            }
        };
        loadAthletes();
    }, []);

    useEffect(() => {
        if (tipoTeste === "cooper") {
            setCategoria("AEROBIC");
            if (distancia > 505) {
                const vo2Calc = calcularVo2Cooper(distancia);
                const vmaxCalc = calcularVmaxPeloVo2(vo2Calc);
                const limiarCalc = calcularLimiarPelaVmax(vmaxCalc);

                setVo2(Number(vo2Calc.toFixed(2)));
                setVmax(Number(vmaxCalc.toFixed(2)));
                setLimiar(Number(limiarCalc.toFixed(2)));
                setZonas(calcularZonasDeRitmo(vmaxCalc));
            } else {
                resetResults();
            }
        } else if (tipoTeste === "esforco") {
            setCategoria("AEROBIC");
            if (fcFinal > 0 && fcMaxima > 0 && velocidadeTeste > 0) {
                const vmaxCalc = calcularVmaxEsforco(fcMaxima, fcFinal, velocidadeTeste);
                const vo2Calc = calcularVo2PelaVmax(vmaxCalc);
                const limiarCalc = calcularLimiarPelaVmax(vmaxCalc);

                setVmax(Number(vmaxCalc.toFixed(2)));
                setVo2(Number(vo2Calc.toFixed(2)));
                setLimiar(Number(limiarCalc.toFixed(2)));
                setZonas(calcularZonasDeRitmo(vmaxCalc));
            } else {
                resetResults();
            }
        } else if (tipoTeste === "1rm") {
            setCategoria("STRENGTH");
            resetAerobicResults();
            if (peso1RM > 0 && repeticoes1RM > 0) {
                const res = calcular1RMBrzycki(peso1RM, repeticoes1RM);
                setResultado1RM(Number(res.toFixed(1)));
            } else if (peso1RM > 0 && repeticoes1RM === 0) {
                // Se repeticoes for 0, assumimos que o peso já é o 1RM (carga máx direta)
                setResultado1RM(peso1RM);
            } else {
                setResultado1RM(0);
            }
        } else if (tipoTeste === "speed") {
            setCategoria("SPEED");
            resetResults();
        }
    }, [tipoTeste, distancia, fcFinal, fcMaxima, velocidadeTeste, peso1RM, repeticoes1RM, exercicio, distanciaCustom, tempoSegundos]);

    const resetAerobicResults = () => {
        setVo2(0);
        setVmax(0);
        setLimiar(0);
        setZonas([]);
    };

    const resetStrengthResults = () => {
        setResultado1RM(0);
    };

    const resetResults = () => {
        resetAerobicResults();
        resetStrengthResults();
    };

    const handleSave = async () => {
        if (!selectedAlumnoId) {
            setMessage({ type: "error", text: "Selecione um aluno antes de salvar." });
            return;
        }

        setIsSaving(true);
        setMessage(null);

        let rawResult = 0;
        let exerciseName = "";
        let vo2Val = vo2;
        let vmaxVal = vmax;

        if (tipoTeste === "cooper") rawResult = distancia;
        else if (tipoTeste === "esforco") rawResult = velocidadeTeste;
        else if (tipoTeste === "1rm") {
            rawResult = resultado1RM > 0 ? resultado1RM : peso1RM;
            exerciseName = exercicio;
        } else if (tipoTeste === "speed") {
            rawResult = tempoSegundos;
            exerciseName = `${distanciaCustom}m`;
            // Calcular velocidade em km/h e salvar em calculatedVmax
            if (distanciaCustom > 0 && tempoSegundos > 0) {
                const speedKmh = (distanciaCustom / tempoSegundos) * 3.6;
                vmaxVal = Number(speedKmh.toFixed(2));
            }
        }

        const result = await saveFitnessMetric({
            athleteProfileId: selectedAlumnoId,
            category: categoria,
            testType: tipoTeste,
            exercise: exerciseName,
            rawResult: rawResult,
            calculatedVo2: vo2Val || undefined,
            calculatedVmax: vmaxVal || undefined,
        });

        setIsSaving(true); // Manter true por um momento
        setTimeout(() => setIsSaving(false), 500);

        if (result.success) {
            setMessage({ type: "success", text: "Resultado salvo com sucesso!" });
            // Opcional: resetar formulário
        } else {
            setMessage({ type: "error", text: result.error || "Erro ao salvar resultado." });
        }

        // Limpar mensagem após 5 segundos
        setTimeout(() => setMessage(null), 5000);
    };

    return (
        <div className="space-y-8 animate-slide-up pb-12">
            <header>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                    Testes <span className="text-gradient">Fisiológicos</span>
                </h1>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                    Selecione o método de teste e registre a evolução do seu atleta.
                </p>
            </header>

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Form Card */}
                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                    <div className="flex flex-col gap-6 mb-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">Configuração do Teste</h2>
                        </div>
                        <div className="flex flex-wrap gap-2 rounded-2xl bg-zinc-100 p-1.5 dark:bg-zinc-800">
                            {[
                                { id: "cooper", label: "Cooper" },
                                { id: "esforco", label: "Custo Cardíaco" },
                                { id: "1rm", label: "1RM (Musculação)" },
                                { id: "speed", label: "Velocidade" }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setTipoTeste(tab.id)}
                                    className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${tipoTeste === tab.id ? "bg-white text-brand-primary shadow-sm dark:bg-zinc-700 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Aluno</label>
                            <select
                                value={selectedAlumnoId}
                                onChange={(e) => setSelectedAlumnoId(e.target.value)}
                                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-zinc-800 dark:bg-zinc-950"
                            >
                                <option value="">Selecione um aluno...</option>
                                {alunos.map(aluno => (
                                    <option key={aluno.id} value={aluno.id}>{aluno.name}</option>
                                ))}
                            </select>
                        </div>

                        {tipoTeste === "cooper" && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Distância (metros)</label>
                                <input
                                    type="number"
                                    placeholder="Ex: 2400"
                                    value={distancia || ""}
                                    onChange={(e) => setDistancia(Number(e.target.value))}
                                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-zinc-800 dark:bg-zinc-950"
                                />
                            </div>
                        )}

                        {tipoTeste === "esforco" && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">FC Final (bpm)</label>
                                    <input
                                        type="number"
                                        placeholder="Ex: 165"
                                        value={fcFinal || ""}
                                        onChange={(e) => setFcFinal(Number(e.target.value))}
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-zinc-800 dark:bg-zinc-950"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">FC Máxima (bpm)</label>
                                    <input
                                        type="number"
                                        placeholder="Ex: 190"
                                        value={fcMaxima || ""}
                                        onChange={(e) => setFcMaxima(Number(e.target.value))}
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-zinc-800 dark:bg-zinc-950"
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Velocidade do Teste (km/h)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="Ex: 12.0"
                                        value={velocidadeTeste || ""}
                                        onChange={(e) => setVelocidadeTeste(Number(e.target.value))}
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-zinc-800 dark:bg-zinc-950"
                                    />
                                </div>
                                <div className="col-span-2 mt-2 rounded-xl bg-brand-primary/5 p-4 border border-brand-primary/10">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-primary mb-1">Custo Cardíaco</p>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">Vmax est. = (FC Máx / FC Final) × Velocidade Teste</p>
                                    <p className="mt-2 text-[10px] text-zinc-500 italic">Estima a velocidade máxima (Vmax) projetada a partir da resposta cardíaca a uma velocidade submáxima.</p>
                                    <div className="mt-3 p-2 bg-brand-primary/10 rounded-lg border border-brand-primary/20">
                                        <p className="text-[10px] text-brand-primary font-bold uppercase tracking-wider">Dica para melhores resultados:</p>
                                        <p className="text-[11px] text-zinc-700 dark:text-zinc-300">
                                            O teste deve ser realizado com uma perpeção de esforço (PSE) entre <strong>7 e 8</strong> (escala 0-10).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {tipoTeste === "1rm" && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Exercício</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Supino Reto"
                                        value={exercicio}
                                        onChange={(e) => setExercicio(e.target.value)}
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-zinc-800 dark:bg-zinc-950"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Carga (kg)</label>
                                    <input
                                        type="number"
                                        placeholder="Ex: 80"
                                        value={peso1RM || ""}
                                        onChange={(e) => setPeso1RM(Number(e.target.value))}
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-zinc-800 dark:bg-zinc-950"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Repetições</label>
                                    <input
                                        type="number"
                                        placeholder="Ex: 5"
                                        value={repeticoes1RM || ""}
                                        onChange={(e) => setRepeticoes1RM(Number(e.target.value))}
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-zinc-800 dark:bg-zinc-950"
                                    />
                                </div>
                                <div className="col-span-2 mt-2 rounded-xl bg-brand-primary/5 p-4 border border-brand-primary/10">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-primary mb-1">Fórmula de Brzycki</p>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">1RM = Peso / (1.0278 - (0.0278 × Repetições))</p>
                                    <p className="mt-2 text-[10px] text-zinc-500 italic">Uma forma mais segura de estimar sua força máxima sem riscos de lesão.</p>
                                </div>
                            </div>
                        )}

                        {tipoTeste === "speed" && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Distância (m)</label>
                                    <input
                                        type="number"
                                        placeholder="Ex: 30, 60, 300"
                                        value={distanciaCustom || ""}
                                        onChange={(e) => setDistanciaCustom(Number(e.target.value))}
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-zinc-800 dark:bg-zinc-950"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tempo (segundos)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Ex: 4.5"
                                        value={tempoSegundos || ""}
                                        onChange={(e) => setTempoSegundos(Number(e.target.value))}
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-zinc-800 dark:bg-zinc-950"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleSave}
                            className="w-full rounded-xl premium-gradient py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                            disabled={isSaving || (tipoTeste === "cooper" && distancia <= 505) || (tipoTeste === "esforco" && (fcFinal <= 0 || fcMaxima <= 0 || velocidadeTeste <= 0)) || (tipoTeste === "1rm" && peso1RM <= 0) || (tipoTeste === "speed" && (distanciaCustom <= 0 || tempoSegundos <= 0))}
                        >
                            {isSaving ? "Salvando..." : "Salvar Resultado"}
                        </button>

                        {message && (
                            <div className={`mt-4 rounded-xl p-4 text-sm font-bold animate-slide-up ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}`}>
                                {message.text}
                            </div>
                        )}
                    </form>
                </div>

                {/* Results Preview */}
                <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {tipoTeste !== "1rm" && (
                            <>
                                <div className="rounded-3xl bg-zinc-900 p-6 text-white text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">VO2 Máx</p>
                                    <p className="mt-1 text-3xl font-black text-brand-primary">{vo2 > 0 ? vo2 : "--"}</p>
                                    <p className="text-[10px] text-white/40">ml/kg/min</p>
                                </div>
                                <div className="rounded-3xl bg-zinc-900 p-6 text-white text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Vmax</p>
                                    <p className="mt-1 text-3xl font-black text-brand-secondary">{vmax > 0 ? vmax : "--"}</p>
                                    <p className="text-[10px] text-white/40">km/h</p>
                                </div>
                            </>
                        )}
                        {limiar > 0 && (tipoTeste === "cooper" || tipoTeste === "esforco") && (
                            <div className="col-span-2 rounded-3xl bg-zinc-900 p-6 text-white text-center border border-brand-primary/20">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Limiar Anaeróbico Estimado</p>
                                <p className="mt-1 text-3xl font-black text-white">{limiar}</p>
                                <p className="text-[10px] text-white/40">m/min</p>
                            </div>
                        )}
                        {resultado1RM > 0 && tipoTeste === "1rm" && (
                            <div className="col-span-2 rounded-3xl bg-zinc-900 p-8 text-white text-center border-2 border-brand-primary/30 animate-slide-up shadow-xl shadow-brand-primary/10">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-primary mb-2">1RM Estimado</p>
                                <h3 className="text-xl font-bold text-white/70 mb-1">{exercicio}</h3>
                                <p className="text-6xl font-black text-white">{resultado1RM}<span className="text-2xl ml-1 text-brand-primary">kg</span></p>
                                <div className="mt-6 pt-4 border-t border-white/5">
                                    <p className="text-[10px] text-white/40 uppercase font-medium tracking-widest mb-1">Metodologia: Fórmula de Brzycki</p>
                                    <p className="text-[11px] font-mono text-white/90">1RM = Peso / (1.0278 - (0.0278 × Reps))</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {(tipoTeste === "cooper" || tipoTeste === "esforco") && (
                        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                            <h3 className="text-lg font-bold mb-6">Zonas de Ritmo Calculadas</h3>
                            <div className="space-y-3">
                                {zonas.length > 0 ? (
                                    zonas.map((zona, i) => (
                                        <div key={i} className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
                                            <span className="font-semibold text-sm">{zona.label}</span>
                                            <div className="text-right">
                                                <p className="text-sm font-mono font-bold text-brand-primary">
                                                    {zona.paceMin} - {zona.paceMax}
                                                </p>
                                                <p className="text-[10px] text-zinc-400 font-medium">min/km</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center justify-center p-12 border-2 border-dashed border-zinc-100 rounded-2xl text-center">
                                        <p className="text-zinc-400 text-sm">Insira os dados do teste para visualizar as zonas.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
