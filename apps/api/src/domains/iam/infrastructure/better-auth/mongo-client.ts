import { MongoClient, type Db } from "mongodb";

let client: MongoClient | null = null;

// Conexão dedicada pra BetterAuth. Mantemos separada da conexão Mongoose
// (que usa mongodb@6 internamente) porque BA depende de mongodb@7 — isolar
// os drivers evita conflito de tipos e upgrade coupling.
export async function getAuthDb(uri: string): Promise<Db> {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db();
}

export async function closeAuthDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}
