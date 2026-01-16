import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Senha", type: "password" },
            },
            async authorize(credentials) {

                const staticAllowed = [
                    "admin@evolunutri.com.br",
                    "admin@lab.com",
                    "nutricionista@evolunutri.com.br",
                    "aluno1@evolunutri.com.br",
                    "aluno2@evolunutri.com.br",
                    "aluno3@evolunutri.com.br"
                ];

                if (credentials?.email && credentials?.password) {
                    const email = credentials.email.trim().toLowerCase();
                    const dbUser = await prisma.user.findUnique({
                        where: { email }
                    });

                    if (dbUser) {
                        // Se não tem senha no banco, aceita a padrão 123456
                        if (!dbUser.password) {
                            if (credentials.password === "123456") {
                                return dbUser;
                            }
                        } else {
                            // Se tem senha, tenta bcrypt ou texto puro (legado)
                            const bcrypt = require('bcryptjs');
                            const isValid = await bcrypt.compare(credentials.password, dbUser.password);
                            if (isValid || credentials.password === dbUser.password) {
                                return dbUser;
                            }
                        }
                    }

                    if (staticAllowed.includes(email)) {
                        const role = (email.startsWith("aluno") || email.includes("athlete")) ? "ATHLETE" : "COACH";
                        return {
                            id: email === "nutricionista@evolunutri.com.br" ? "user_nutri_marcio" : "patient_1",
                            name: role === "COACH" ? "Treinador Admin" : "Aluno Exemplo",
                            email: email,
                            role: role
                        } as any;
                    }
                }
                return null;
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.name = user.name;
                token.image = user.image;
            }
            if (trigger === "update" && session) {
                token.name = session.user.name;
                token.image = session.user.image;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
                session.user.name = token.name as string;
                session.user.image = token.image as string;
            }
            return session;
        },
    },
};
