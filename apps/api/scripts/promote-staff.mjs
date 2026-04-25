import "dotenv/config";
import { MongoClient } from "mongodb";

// One-off: promove um user a `role: "staff"` (acesso ao /kintal).
// Uso: node apps/api/scripts/promote-staff.mjs <email>

const email = process.argv[2];
if (!email) {
  console.error("Uso: node promote-staff.mjs <email>");
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

  const existing = await users.findOne({ email });
  if (!existing) {
    console.error(
      `Usuário com email "${email}" não encontrado. Faça signup em /sign-up primeiro.`,
    );
    process.exit(1);
  }

  if (existing.role === "staff") {
    console.log(`User ${email} já é staff (id=${existing._id}). Nada a fazer.`);
    process.exit(0);
  }

  const result = await users.updateOne(
    { email },
    { $set: { role: "staff" } },
  );
  console.log(
    `OK — email=${email} id=${existing._id} role=staff (matched=${result.matchedCount}, modified=${result.modifiedCount})`,
  );
} finally {
  await client.close();
}
