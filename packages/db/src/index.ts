import dotenv from "dotenv";
import path from "path";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const envPath = path.resolve(repoRoot, ".env");
dotenv.config({ path: envPath });
import {PrismaPg} from "@prisma/adapter-pg"
import { PrismaClient } from "./generated/client/client.js";



const prismaClientSingleton = () =>{
    const adapter = new PrismaPg({connectionString : process.env.DATABASE_URL})
    return new PrismaClient({ adapter });
}

declare global  {
    var prismaGlobal : undefined | ReturnType<typeof prismaClientSingleton>
}

const client : ReturnType<typeof prismaClientSingleton> = globalThis.prismaGlobal ?? prismaClientSingleton();

export default client;
