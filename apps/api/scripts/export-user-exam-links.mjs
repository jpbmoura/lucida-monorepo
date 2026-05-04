import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

const SHARE_BASE_URL = "https://lucidaexam.com/exam";

const email = process.argv[2];
if (!email) {
  console.error("Uso: node export-user-exam-links.mjs <email>");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI ausente no .env");
  process.exit(1);
}

const csvEscape = (value) => {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db();

  const user = await db.collection("user").findOne({ email });
  if (!user) {
    console.error(`Usuário não encontrado pra email "${email}"`);
    process.exit(1);
  }

  const userId = user._id.toHexString?.() ?? String(user._id);
  console.log(`Usuário: ${user.name ?? "(sem nome)"} <${email}> id=${userId}`);

  const exams = await db
    .collection("exams")
    .find({ ownerId: userId })
    .sort({ createdAt: -1 })
    .toArray();

  console.log(`Provas encontradas: ${exams.length}`);

  const classIds = [...new Set(exams.map((e) => e.classId).filter(Boolean))];
  const classes = classIds.length
    ? await db.collection("classes").find({ _id: { $in: classIds } }).toArray()
    : [];
  const classNameById = new Map(classes.map((c) => [c._id, c.name]));

  const rows = [["link", "prova", "turma"]];
  for (const exam of exams) {
    const link = `${SHARE_BASE_URL}/${exam.shareId}`;
    const className = classNameById.get(exam.classId) ?? "";
    rows.push([link, exam.title ?? "", className]);
  }

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n") + "\r\n";

  const here = dirname(fileURLToPath(import.meta.url));
  const safeEmail = email.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const outPath = resolve(here, "exports", `exam-links-${safeEmail}.csv`);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, csv, "utf8");

  console.log(`CSV gerado: ${outPath}`);
} finally {
  await client.close();
}
