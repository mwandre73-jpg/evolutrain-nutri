"use client";

import React, { useState } from "react";
import { X, Sparkles, Utensils, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { estimateMacrosAction } from "@/app/actions/nutrition";

interface MealLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}

const mealTypes = [
    { id: "CAFÉ DA MANHÃ", icon: "☕" },
    { id: "ALMOÇO", icon: "🍱" },
    { id: "CAFÉ DA TARDE", icon: "🥪" },
    { id: "JANTAR", icon: "🍛" },
    { id: "LANCHE/OUTRO", icon: "🍎" },
];

export const MealLogModal: React.FC<MealLogModalProps> = ({ isOpen, onClose, onSave }) => {
    const [step, setStep] = useState(1);
    const [isEstimating, setIsEstimating] = useState(false);
    const [aiMessage, setAiMessage] = useState("");

    const [formData, setFormData] = useState({
        mealType: "ALMOÇO",
        description: "",
        calories: 0,
        proteins: 0,
        carbs: 0,
        fats: 0,
    });

    const handleEstimateAI = async () => {
        if (!formData.description) return;
        setIsEstimating(true);
        setAiMessage("");

        try {
            const res = await estimateMacrosAction(formData.description);
            if (res.success) {
                setFormData(prev => ({
                    ...prev,
                    calories: res.data.calories,
                    proteins: res.data.proteins,
                    carbs: res.data.carbs,
                    fats: res.data.fats,
                }));
                setAiMessage(res.message);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsEstimating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-center p-4 backdrop-blur-sm bg-black/40 overflow-y-auto pt-10 sm:pt-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 h-fit mb-20"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Utensils className="w-6 h-6 text-brand-primary" />
                        Registrar Refeição
                    </h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Meal Type Selection */}
                    <div className="grid grid-cols-3 gap-2">
                        {mealTypes.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setFormData({ ...formData, mealType: type.id })}
                                className={`p-3 rounded-2xl text-[10px] font-black tracking-tight flex flex-col items-center gap-2 transition-all ${formData.mealType === type.id
                                        ? 'bg-brand-primary text-white shadow-lg'
                                        : 'bg-zinc-50 text-zinc-400 dark:bg-zinc-800'
                                    }`}
                            >
                                <span className="text-xl">{type.icon}</span>
                                {type.id.split('/')[0]}
                            </button>
                        ))}
                    </div>

                    {/* AI Description Input */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-zinc-600 dark:text-zinc-400">O que você comeu?</label>
                        <div className="relative">
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Ex: 200g de frango grelhado e 150g de arroz integral..."
                                className="w-full h-24 rounded-2xl bg-zinc-50 border-none p-4 text-sm focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800 resize-none"
                            />
                            <button
                                type="button"
                                onClick={handleEstimateAI}
                                disabled={isEstimating || !formData.description}
                                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-[10px] font-bold hover:bg-indigo-600 transition-all disabled:opacity-50"
                            >
                                <Sparkles className={`w-3 h-3 ${isEstimating ? 'animate-spin' : ''}`} />
                                {isEstimating ? "ESTIMANDO..." : "ESTIMAR COM IA"}
                            </button>
                        </div>
                    </div>

                    {aiMessage && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold flex items-start gap-2"
                        >
                            <Info className="w-4 h-4 flex-shrink-0" />
                            {aiMessage}
                        </motion.div>
                    )}

                    {/* Macro Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Calorias (kcal)</label>
                            <input
                                type="number"
                                value={formData.calories}
                                onChange={(e) => setFormData({ ...formData, calories: Number(e.target.value) })}
                                className="w-full rounded-xl bg-zinc-100 border-none p-3 text-sm font-bold dark:bg-zinc-800"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Proteínas (g)</label>
                            <input
                                type="number"
                                value={formData.proteins}
                                onChange={(e) => setFormData({ ...formData, proteins: Number(e.target.value) })}
                                className="w-full rounded-xl bg-zinc-100 border-none p-3 text-sm font-bold dark:bg-zinc-800"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Carbos (g)</label>
                            <input
                                type="number"
                                value={formData.carbs}
                                onChange={(e) => setFormData({ ...formData, carbs: Number(e.target.value) })}
                                className="w-full rounded-xl bg-zinc-100 border-none p-3 text-sm font-bold dark:bg-zinc-800"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Gorduras (g)</label>
                            <input
                                type="number"
                                value={formData.fats}
                                onChange={(e) => setFormData({ ...formData, fats: Number(e.target.value) })}
                                className="w-full rounded-xl bg-zinc-100 border-none p-3 text-sm font-bold dark:bg-zinc-800"
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => onSave(formData)}
                        className="w-full py-4 rounded-2xl premium-gradient text-white font-black text-sm shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        SALVAR REFEIÇÃO
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
