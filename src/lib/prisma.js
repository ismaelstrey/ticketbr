"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Prisma = exports.prisma = void 0;
var client_1 = require("../../prisma/generated/client");
Object.defineProperty(exports, "Prisma", { enumerable: true, get: function () { return client_1.Prisma; } });
var adapter_ppg_1 = require("@prisma/adapter-ppg");
var prismaClientSingleton = function () {
    var connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL is required");
    }
    var adapter = new adapter_ppg_1.PrismaPostgresAdapter({ connectionString: connectionString });
    return new client_1.PrismaClient({
        adapter: adapter,
        log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
    });
};
var globalForPrisma = globalThis;
exports.prisma = (_a = globalForPrisma.prisma) !== null && _a !== void 0 ? _a : prismaClientSingleton();
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = exports.prisma;
