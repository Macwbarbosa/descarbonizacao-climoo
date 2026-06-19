// i18n mínimo. No fluxo ativo da ferramenta (Inventário → Cenários) nenhuma
// página usa traduções; apenas componentes legados em `settings/components/*`
// (não roteados) chamam `useTranslation`. Inicializamos o react-i18next vazio
// para que esses imports funcionem — `t('chave')` retorna a própria chave.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: { pt_br: { translation: {} } },
  lng: 'pt_br',
  fallbackLng: 'pt_br',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
