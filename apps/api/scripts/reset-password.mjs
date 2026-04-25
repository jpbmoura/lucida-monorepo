import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
import { hashPassword } from "better-auth/crypto";

// One-off: troca a senha de um user direto no banco (dev/teste).
// Uso: node apps/api/scripts/reset-password.mjs <email> <nova-senha>

const email = process.argv[2];
const newPassword = process.argv[3];
if (!email || !newPassword) {
  console.error("Uso: node reset-password.mjs <email> <nova-senha>");
  process.exit(1);
}
if (newPassword.length < 8) {
  console.error("Senha precisa ter pelo menos 8 caracteres.");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI não encontrado no .env");
  process.exit(1);
}

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db();
  const users = db.collection("user");
  const accounts = db.collection("account");

  const user = await users.findOne({ email });
  if (!user) {
    console.error(`Usuário "${email}" não encontrado.`);
    process.exit(1);
  }

  // Account do provider de credenciais. BA usa providerId = "credential".
  // userId na coleção account pode vir como string ou ObjectId dependendo do
  // adapter — testamos as duas formas.
  const userIdStr = user._id instanceof ObjectId ? user._id.toHexString() : String(user._id);
  const query = {
    providerId: "credential",
    $or: [{ userId: userIdStr }, { userId: user._id }],
  };

  const account = await accounts.findOne(query);
  const hashed = await hashPassword(newPassword);
  const now = new Date();

  if (account) {
    const result = await accounts.updateOne(
      { _id: account._id },
      { $set: { password: hashed, updatedAt: now } },
    );
    console.log(
      `OK (updated) — email=${email} user=${user._id} account=${account._id} (matched=${result.matchedCount}, modified=${result.modifiedCount})`,
    );
  } else {
    // Nenhuma account credential: user criado via OAuth (Google). Insere
    // uma account credential nova pra habilitar login por senha, mantendo
    // a conta Google intacta como método adicional.
    const insertResult = await accounts.insertOne({
      accountId: userIdStr,
      providerId: "credential",
      userId: user._id,
      password: hashed,
      createdAt: now,
      updatedAt: now,
    });
    console.log(
      `OK (created credential account) — email=${email} user=${user._id} account=${insertResult.insertedId}`,
    );
  }
} finally {
  await client.close();
}
