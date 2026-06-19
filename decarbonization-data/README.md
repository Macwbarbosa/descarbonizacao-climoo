# decarbonization-data

JSONs do módulo de **Descarbonização**, salvos pelo app **separados por CNPJ**
(`<cnpj>.json`, somente dígitos). São gravados pelo middleware de desenvolvimento
do Vite (ver `vite.config.js` → `decarbonizationDataPlugin`) quando você clica em
**Salvar no projeto (JSON)** nas telas do módulo — funciona apenas com `npm run dev`.

Cada arquivo tem o formato limpo/semântico (pronto para mapear no Firestore):

```json
{
  "modulo": "descarbonizacao",
  "cnpj": "11137051000186",
  "empresa": "Grupo Boticário",
  "exportadoEm": "2026-06-09T...",
  "atualizadoEm": "2026-06-09T...",
  "metasPeriodo": { "params": { ... }, "metas": [ ... ] },
  "variaveisCrescimento": { "drivers": [ ... ] },
  "bau": { "anoAlvo": 2030, "vinculos": { "<activityId>": { "driverId": "...", "factor": 1 } } }
}
```

> Enquanto valida o módulo, o estado também fica no `localStorage` do navegador,
> particionado por CNPJ. Estes arquivos são a fonte que você usará para subir ao
> Firestore.
