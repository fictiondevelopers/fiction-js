import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
    return new PrismaClient();
};

const globalThis = (typeof window !== 'undefined' ? window : global);

globalThis.prismaGlobal = globalThis.prismaGlobal || prismaClientSingleton();



export const prisma = globalThis.prismaGlobal;

if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = prisma;
}