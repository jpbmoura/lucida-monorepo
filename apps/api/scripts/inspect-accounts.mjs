import "dotenv/config";
import { MongoClient } from "mongodb";

const email = process.argv[2];
if (!email) {
  console.error("Uso: node inspect-accounts.mjs <email>");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);
try {
  await client.connect();
  const db = client.db();
  const user = await db.collection("user").findOne({ email });
  console.log("USER:", user);
  if (user) {
    const userIdStr = user._id.toHexString?.() ?? String(user._id);
    const accounts = await db
      .collection("account")
      .find({ $or: [{ userId: userIdStr }, { userId: user._id }] })
      .toArray();
    console.log("ACCOUNTS (count=%d):", accounts.length);
    accounts.forEach((a) => {
      console.log({
        ...a,
        password: a.password ? `<hashed:${a.password.slice(0, 12)}...>` : undefined,
      });
    });
  }

  // Também pega um sample de qualquer account credential no banco pra
  // comparar a shape.
  const sample = await db
    .collection("account")
    .findOne({ providerId: "credential" });
  console.log("\nSAMPLE CREDENTIAL ACCOUNT (any user):");
  if (sample) {
    console.log({
      ...sample,
      password: sample.password ? `<hashed:${sample.password.slice(0, 12)}...>` : undefined,
    });
  } else {
    console.log("(nenhuma conta credential encontrada no banco)");
  }
} finally {
  await client.close();
}
