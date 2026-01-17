
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const csvData = `Grupo_Muscular,Exercicio,Equipamento,Padrao_Movimento,Musculos_Principais,Nivel,Video_URL,Cues_Tecnicos
Peito,Supino reto (barra),Barra/Banco,Empurrar horizontal,Peito; Tríceps; Ombro ant.,Básico,,Escápulas fixas; pés firmes; controle na descida
Peito,Supino reto (halteres),Halteres/Banco,Empurrar horizontal,Peito; Tríceps; Ombro ant.,Básico,,Amplitude confortável; punhos neutros
Peito,Supino inclinado (barra),Barra/Banco inclinado,Empurrar inclinado,Peito sup.; Tríceps; Ombro ant.,Básico,,Não elevar demais o banco (30–45°)
Peito,Supino inclinado (halteres),Halteres/Banco inclinado,Empurrar inclinado,Peito sup.; Tríceps; Ombro ant.,Básico,,Controle; cotovelos 45°
Peito,Crucifixo (halteres),Halteres/Banco,Adução horizontal,Peito,Intermediário,,Leve flexão de cotovelos; sem 'abrir' demais
Peito,Crossover (cabo),Cabo,Adução horizontal,Peito,Intermediário,,Cruzar leve; foco no pico de contração
Peito,Peck deck (máquina),Máquina,Adução horizontal,Peito,Básico,,Ajuste do banco para alinhar punhos com peitoral
Peito,Flexão de braços,Peso corporal,Empurrar horizontal,Peito; Tríceps; Ombro ant.,Básico,,Corpo alinhado; peito próximo ao solo
Costas,Puxada na frente (pulldown),Máquina/Cabo,Puxar vertical,Grande dorsal; Bíceps,Básico,,Peito aberto; puxar com cotovelos
Costas,Barra fixa (pronada),Barra fixa,Puxar vertical,Dorsal; Bíceps,Avançado,,Evitar balanço; controle
Costas,Remada baixa (cabo),Cabo,Puxar horizontal,Dorsal; Romboides; Bíceps,Básico,,Coluna neutra; puxar cotovelos para trás
Costas,Remada curvada (barra),Barra,Puxar horizontal,Dorsal; Trapézio; Posterior,Intermediário,,Hinge; manter lombar neutra
Costas,Remada unilateral (halter),Halter,Puxar horizontal,Dorsal; Romboides; Bíceps,Básico,,Não girar o tronco; puxar ao quadril
Costas,Remada cavalinho (T-bar),Máquina/Barra T,Puxar horizontal,Dorsal; Trapézio; Bíceps,Intermediário,,Peito apoiado se possível
Costas,Pull-over (cabo),Cabo,Extensão de ombro,Dorsal,Intermediário,,Braços semi-estendidos; sentir dorsal
Costas,Face pull,Cabo,Puxar horizontal,Posterior ombro; Trapézio,Básico,,Puxar para o rosto; cotovelos altos
Ombros,Desenvolvimento (halteres),Halteres,Empurrar vertical,Deltoide; Tríceps,Básico,,Não hiperextender lombar
Ombros,Desenvolvimento (barra),Barra,Empurrar vertical,Deltoide; Tríceps,Intermediário,,Trajetória confortável; core firme
Ombros,Elevação lateral,Halteres,Abdução,Deltoide lateral,Básico,,Leve clinicação; subir até linha do ombro
Ombros,Elevação frontal,Halteres/Anilha,Flexão de ombro,Deltoide anterior,Básico,,Evitar balanço
Ombros,Posterior no peck deck,Máquina,Abdução horizontal,Deltoide posterior,Básico,,Movimento controlado; sem roubar
Ombros,Reverse fly (halteres),Halteres,Abdução horizontal,Deltoide posterior,Intermediário,,Coluna neutra; foco no posterior
Ombros,Encolhimento,Halteres/Barra,Elevação escapular,Trapézio,Básico,,Subir e segurar 1s
Bíceps,Rosca direta (barra),Barra,Flexão de cotovelo,Bíceps,Básico,,Cotovelos fixos; sem balanço
Bíceps,Rosca alternada,Halteres,Flexão de cotovelo,Bíceps,Básico,,Supinar ao subir
Bíceps,Rosca martelo,Halteres,Flexão de cotovelo,Braquial; Bíceps,Básico,,Punho neutro
Bíceps,Rosca Scott,Máquina/Banco Scott,Flexão de cotovelo,Bíceps,Intermediário,,Amplitude completa; controle
Bíceps,Rosca no cabo,Cabo,Flexão de cotovelo,Bíceps,Básico,,Tensão contínua
Bíceps,Rosca concentrada,Halter,Flexão de cotovelo,Bíceps,Intermediário,,Movimento lento; foco
Tríceps,Tríceps corda,Cabo,Extensão de cotovelo,Tríceps,Básico,,Abrir a corda no final
Tríceps,Tríceps barra (pushdown),Cabo,Extensão de cotovelo,Tríceps,Básico,,Cotovelos colados
Tríceps,Tríceps testa,Barra/Halter,Extensão de cotovelo,Tríceps,Intermediário,,Evitar abrir cotovelos
Tríceps,Mergulho (banco),Banco,Extensão de ombro,Tríceps,Intermediário,,Ombros para trás; amplitude segura
Tríceps,Tríceps francês,Halter,Extensão de cotovelo,Tríceps,Intermediário,,Cotovelos apontando para frente
Quadríceps,Agachamento livre,Barra,Agachar,Quadríceps; Glúteos; Core,Intermediário,,Joelhos alinhados; coluna neutra
Quadríceps,Agachamento no Smith,Smith,Agachar,Quadríceps; Glúteos,Básico,,Pés ajustados; controle
Quadríceps,Leg press,Máquina,Agachar,Quadríceps; Glúteos,Básico,,Não travar joelhos; amplitude
Quadríceps,Cadeira extensora,Máquina,Extensão de joelho,Quadríceps,Básico,,Pausar no topo 1s
Posterior,Cadeira flexora,Máquina,Flexão de joelho,Posterior de coxa,Básico,,Controle; não tirar quadril do banco
Posterior,Stiff / Terra romeno,Barra/Halteres,Hinge,Posterior; Glúteos,Intermediário,,Quadril para trás; costas neutras
Glúteos,Elevação pélvica (hip thrust),Barra/Banco,Extensão de quadril,Glúteos,Intermediário,,Queixo baixo; retroversão no topo
Glúteos,Glute bridge,Barra/Peso corporal,Extensão de quadril,Glúteos,Básico,,Subir e segurar 1s
Glúteos,Abdução (máquina),Máquina,Abdução de quadril,Glúteo médio,Básico,,Evitar inclinar tronco
Adutores,Adutora (máquina),Máquina,Adução de quadril,Adutores,Básico,,Controle; amplitude confortável
Glúteos,Afundo,Halteres/Barra,Lunge,Glúteos; Quadríceps,Intermediário,,Passo longo p/ glúteo
Glúteos,Búlgaro,Halteres/Banco,Lunge,Glúteos; Quadríceps,Avançado,,Controle; joelho alinhado
Quadríceps,Passada (walking lunge),Halteres,Lunge,Glúteos; Quadríceps,Intermediário,,Tronco estável
Panturrilha,Panturrilha em pé,Máquina,Flexão plantar,Panturrilhas,Básico,,Pausar em cima e embaixo
Panturrilha,Panturrilha sentado,Máquina,Flexão plantar,Sóleo,Básico,,Amplitude total
Core,Prancha,Peso corporal,Isometria,Core,Básico,,Corpo alinhado; respirar
Core,Prancha lateral,Peso corporal,Isometria,Oblíquos,Intermediário,,Quadril alto
Core,Abdominal máquina,Máquina,Flexão de tronco,Reto abdominal,Básico,,Evitar puxar pescoço
Core,Elevação de pernas,Barra/solo,Flexão de quadril,Core,Intermediário,,Controlar balanço`;

async function importExercises() {
    try {
        console.log("Starting exercise import...");
        const lines = csvData.trim().split("\n");
        const header = lines.shift(); // Remove header

        let imported = 0;
        let updated = 0;

        for (const line of lines) {
            if (!line.trim()) continue;

            const columns = line.split(",");
            const grupoMuscular = columns[0];
            const nomeExercicio = columns[1];
            const equipamento = columns[2];
            const padraoMovimento = columns[3];
            const musculosPrincipais = columns[4];
            const nivel = columns[5];
            const videoUrl = columns[6];
            const cuesTecnicos = columns[7];

            const instructions = `Nível: ${nivel || "N/A"}\nEquipamento: ${equipamento || "N/A"}\nMúsculos: ${musculosPrincipais || "N/A"}\nTécnica: ${cuesTecnicos || "N/A"}`;

            const existing = await prisma.exercise.findFirst({
                where: { name: nomeExercicio }
            });

            if (existing) {
                await prisma.exercise.update({
                    where: { id: existing.id },
                    data: {
                        muscles: grupoMuscular,
                        instructions: instructions,
                        // Only update video if provided in CSV
                        ...(videoUrl ? { videoUrl } : {})
                    }
                });
                updated++;
            } else {
                await prisma.exercise.create({
                    data: {
                        name: nomeExercicio,
                        muscles: grupoMuscular,
                        instructions: instructions,
                        videoUrl: videoUrl || null
                    }
                });
                imported++;
            }
        }

        console.log(`Import finished! Created: ${imported}, Updated: ${updated}`);
    } catch (e) {
        console.error("IMPORT ERROR:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

importExercises();
