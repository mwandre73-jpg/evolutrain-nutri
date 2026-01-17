
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

interface Exercise {
    id: string;
    name: string;
    muscles: string;
}

interface SearchableExerciseSelectProps {
    exercises: Exercise[];
    selectedExerciseName: string;
    onSelect: (name: string) => void;
    placeholder?: string;
}

export default function SearchableExerciseSelect({
    exercises,
    selectedExerciseName,
    onSelect,
    placeholder = "Buscar exercício..."
}: SearchableExerciseSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredExercises = exercises.filter(ex =>
        ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.muscles?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {/* Search Input / Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between rounded-2xl bg-zinc-50 border px-4 py-3 cursor-pointer transition-all dark:bg-zinc-800 ${isOpen ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <Search size={18} className="text-zinc-400 shrink-0" />
                    <span className={`truncate font-medium ${selectedExerciseName ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
                        {selectedExerciseName || placeholder}
                    </span>
                </div>
                <ChevronDown size={18} className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-[9999] mt-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                    <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Ex: pélvica, peito..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-brand-primary"
                                onClick={(e) => e.stopPropagation()}
                            />
                            {searchTerm && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSearchTerm(""); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {filteredExercises.length > 0 ? (
                            filteredExercises.map((ex) => (
                                <div
                                    key={ex.id}
                                    onClick={() => {
                                        onSelect(ex.name);
                                        setIsOpen(false);
                                        setSearchTerm("");
                                    }}
                                    className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${selectedExerciseName === ex.name
                                            ? 'bg-brand-primary/5 text-brand-primary'
                                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                                        }`}
                                >
                                    <div>
                                        <p className="font-bold text-sm tracking-tight">{ex.name}</p>
                                        <p className="text-[10px] uppercase font-black text-zinc-400 tracking-widest">{ex.muscles}</p>
                                    </div>
                                    {selectedExerciseName === ex.name && <Check size={16} />}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-zinc-500">
                                <p className="text-sm font-medium">Nenhum exercício encontrado</p>
                                <p className="text-xs">Tente buscar por outro nome ou grupo.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
