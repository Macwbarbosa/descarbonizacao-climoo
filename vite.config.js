/* eslint-disable import/no-extraneous-dependencies */
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

/**
 * Plugin de DESENVOLVIMENTO: persiste os dados do módulo de Descarbonização
 * dentro do projeto, em `decarbonization-data/<cnpj>.json` (separado por CNPJ).
 * Não é backend — é só o dev server gravando arquivos locais. Rotas:
 *   POST /__decarbonization/save        { cnpj, data }
 *   GET  /__decarbonization/data/:cnpj
 *   GET  /__decarbonization/list
 */
function decarbonizationDataPlugin() {
  const DATA_DIR = path.resolve(__dirname, 'decarbonization-data');
  const safeCnpj = (raw) => (String(raw || '').replace(/\D/g, '') || '_sem_cnpj');

  return {
    name: 'decarbonization-data',
    configureServer(server) {
      server.middlewares.use('/__decarbonization', async (req, res) => {
        const send = (code, obj) => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(obj));
        };
        const url = req.url || '';
        try {
          if (req.method === 'POST' && url.startsWith('/save')) {
            let body = '';
            // eslint-disable-next-line no-restricted-syntax
            for await (const chunk of req) body += chunk;
            const { cnpj, data } = JSON.parse(body || '{}');
            const name = safeCnpj(cnpj);
            if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
            fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf-8');
            return send(200, { ok: true, file: `decarbonization-data/${name}.json` });
          }
          if (req.method === 'GET' && url.startsWith('/list')) {
            const files = fs.existsSync(DATA_DIR)
              ? fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
              : [];
            return send(200, files);
          }
          if (req.method === 'GET' && url.startsWith('/data/')) {
            const name = safeCnpj(url.slice('/data/'.length).split('?')[0]);
            const fp = path.join(DATA_DIR, `${name}.json`);
            if (!fs.existsSync(fp)) return send(404, { error: 'not found' });
            return send(200, JSON.parse(fs.readFileSync(fp, 'utf-8')));
          }
          return send(404, { error: 'unknown route' });
        } catch (err) {
          return send(500, { error: String(err?.message || err) });
        }
      });
    },
  };
}

export default defineConfig({
  root: '.',
  plugins: [
    react(),
    decarbonizationDataPlugin()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@apis': path.resolve(__dirname, 'src/apis'),
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    rollupOptions: {
      input: 'index.html'
    },
    minify: 'esbuild',
  },
});
