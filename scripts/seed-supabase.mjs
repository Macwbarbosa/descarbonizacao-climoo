/**
 * seed-supabase
 * -------------
 * Carrega os JSONs de `decarbonization-data/<cnpj>.json` para a tabela
 * `decarbonization_companies` no Supabase (upsert por CNPJ).
 *
 * Uso:
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/seed-supabase.mjs
 *
 * Aceita também VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Prefira a
 * service_role key (ignora RLS) para o seed.
 */
import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'decarbonization-data');
const TABLE = 'decarbonization_companies';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou ANON_KEY).');
    process.exit(1);
}

const supabase = createClient(url, key);

const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
let ok = 0;

for (const file of files) {
    const raw = readFileSync(path.join(DATA_DIR, file), 'utf-8');
    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        console.warn(`Ignorado (JSON inválido): ${file}`);
        continue;
    }
    const cnpj = String(data.cnpj || file.replace(/\.json$/, '')).replace(/\D/g, '');
    if (!cnpj) {
        console.warn(`Ignorado (sem CNPJ): ${file}`);
        continue;
    }

    const { error } = await supabase
        .from(TABLE)
        .upsert(
            { cnpj, empresa: data.empresa || null, data, updated_at: new Date().toISOString() },
            { onConflict: 'cnpj' }
        );

    if (error) {
        console.error(`Falha em ${cnpj} (${file}): ${error.message}`);
    } else {
        ok += 1;
        console.log(`OK  ${cnpj}  ${data.empresa || ''}`);
    }
}

console.log(`\nConcluído: ${ok}/${files.length} empresa(s) enviada(s).`);
