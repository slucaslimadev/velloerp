import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
const BUCKET       = "demo-assets";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const FILES = [
  { local: "public/clinica-hero.mp4",  remote: "clinica-hero.mp4"  },
  { local: "public/clinica-scrub.mp4", remote: "clinica-scrub.mp4" },
  { local: "public/vet-hero.mp4",      remote: "vet-hero.mp4"      },
];

async function main() {
  // 1. Cria o bucket público se não existir
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);

  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) { console.error("Erro ao criar bucket:", error.message); process.exit(1); }
    console.log(`Bucket "${BUCKET}" criado.`);
  } else {
    console.log(`Bucket "${BUCKET}" já existe.`);
  }

  // 2. Faz upload de cada arquivo
  for (const { local, remote } of FILES) {
    const filePath = resolve(local);
    const buffer   = readFileSync(filePath);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(remote, buffer, {
        contentType: "video/mp4",
        upsert: true,
        cacheControl: "31536000",
      });

    if (error) {
      console.error(`Erro ao subir ${remote}:`, error.message);
      continue;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(remote);

    console.log(`✓ ${remote}`);
    console.log(`  URL: ${publicUrl}`);
  }
}

main().catch(console.error);
