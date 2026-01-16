import Link from "next/link";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full glass-morphism">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="text-xl font-bold tracking-tight">EvoluNutri</span>
          <div className="flex items-center gap-6">
            <a href="/api/auth/signin?callbackUrl=/dashboard" className="text-sm font-medium text-zinc-600 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-white">
              Entrar
            </a>
            <a href="/api/auth/signin?callbackUrl=/dashboard" className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white transition-all hover:scale-105 hover:bg-opacity-90 active:scale-95">
              Começar Agora
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow pt-16">
        <section className="relative overflow-hidden px-4 pt-20 pb-16 sm:px-6 lg:px-8 lg:pt-32 lg:pb-48">
          {/* Background Blobs */}
          <div className="absolute top-0 -z-10 h-full w-full opacity-20 dark:opacity-10">
            <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-brand-primary blur-[128px]" />
            <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-brand-secondary blur-[128px]" />
          </div>

          <div className="mx-auto max-w-7xl text-center lg:text-left">
            <div className="animate-slide-up grid lg:grid-cols-2 lg:items-center lg:gap-12">
              <div>
                <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
                  <span className="text-gradient">Performance</span> Física e <br />
                  <span className="text-white">Evolução</span> Nutricional
                </h1>
                <p className="mx-auto mb-10 max-w-2xl text-lg text-zinc-400 sm:text-xl">
                  A plataforma completa que une prescrição de treinamento de alto nível com gestão nutricional clínica de precisão.
                </p>
                <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
                  <a
                    href="/api/auth/signin?callbackUrl=/dashboard"
                    className="flex h-14 items-center justify-center rounded-2xl premium-gradient px-8 text-lg font-bold text-white shadow-xl shadow-brand-primary/25 transition-all hover:scale-105 active:scale-95"
                  >
                    Iniciar Jornada
                  </a>
                  <button className="flex h-14 items-center justify-center rounded-2xl border-2 border-brand-primary/20 px-8 text-lg font-bold transition-all hover:bg-brand-primary/5">
                    Saiba Mais
                  </button>
                </div>

                {/* Stats */}
                <div className="mt-12 flex items-center justify-center gap-8 lg:justify-start">
                  <div>
                    <p className="text-2xl font-bold">10k+</p>
                    <p className="text-sm text-foreground/50 text-nowrap">Usuários Ativos</p>
                  </div>
                  <div className="h-8 w-px bg-foreground/10" />
                  <div>
                    <p className="text-2xl font-bold">500+</p>
                    <p className="text-sm text-foreground/50 text-nowrap">Planos e Dietas</p>
                  </div>
                </div>
              </div>

              {/* Visual Element (Placeholder for App Preview) */}
              <div className="mt-16 hidden lg:block">
                <div className="relative rounded-3xl bg-foreground/5 p-4 ring-1 ring-foreground/10">
                  <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-black/50">
                    <div className="flex h-full items-center justify-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-3xl premium-gradient animate-pulse shadow-2xl">
                        <span className="text-3xl font-bold text-white">E</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Preview (Mobile First Grid) */}
        <section className="bg-foreground/[0.02] py-20 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-12 text-center text-3xl font-bold">Por que escolher EvoluNutri?</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-start gap-4 rounded-3xl bg-white p-8 shadow-xl shadow-zinc-200/50 dark:bg-zinc-900 dark:shadow-none">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl premium-gradient text-2xl text-white">
                  🥗
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-xl font-bold">Gestão Nutricional</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Planos alimentares personalizados e acompanhamento de bioimpedância detalhado.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-3xl bg-white p-8 shadow-xl shadow-zinc-200/50 dark:bg-zinc-900 dark:shadow-none">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl premium-gradient text-2xl text-white">
                  🏃
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-xl font-bold">Planilhas de Treino</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Prescrição de treinamento de força e endurance com zonas de intensidade automáticas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/5 py-12 px-4">
        <div className="mx-auto max-w-7xl flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded premium-gradient text-[10px] text-white font-bold">
              E
            </div>
            <span className="font-bold">EvoluNutri</span>
          </div>
          <p className="text-sm text-foreground/40">
            © 2026 EvoluNutri. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
