import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/features/auth/shared/store/authStore';
import { hasSupabase } from '@/lib/supabaseClient';
import { NO_CNPJ, ROOT_KEY } from './decarbonizationStorage';
import {
    buildCompanyExport,
    saveCompanyToProject,
    loadCompanyFromProject,
    reloadActive,
} from './decarbonizationExport';
import { logSave, describeChanges } from './decarbonizationAudit';
import usePlanTargetsStore from '../targets-timeframe/store/usePlanTargetsStore';
import useInventoryStore from '../inventory/store/useInventoryStore';
import useDriversStore from '../drivers/store/useDriversStore';
import useBauStore from '../bau/store/useBauStore';
import useProjectsStore from '../projects/store/useProjectsStore';
import useScenariosStore from '../scenarios/store/useScenariosStore';

/**
 * useCompanyPersistence
 * ---------------------
 * Controlador ÚNICO e GLOBAL (montado uma vez no App, vale em todas as telas —
 * inclusive as de detalhe) que cuida da persistência da empresa ativa:
 *
 *  1. CARGA por CNPJ — ao trocar de empresa, re-hidrata os stores a partir do
 *     banco/projeto (loadCompanyFromProject) ou do localStorage (reloadActive).
 *     Centralizar aqui evita o bug de editar numa tela de detalhe (sem a barra)
 *     e salvar os dados da empresa anterior no registro da nova.
 *  2. AUTO-SAVE no Supabase — depois que a carga termina, captura o "baseline" e
 *     liga os subscribers; qualquer alteração real do usuário grava no banco com
 *     debounce. Durante a carga, os sets de re-hidratação NÃO disparam save
 *     (flag `rehydrating`), evitando regravar o que acabou de ser carregado.
 *
 * Sem Supabase configurado, só a carga acontece; o auto-save fica desligado (a
 * gravação no banco continua pelo botão "Salvar no projeto (JSON)").
 */

const STORES = [
    usePlanTargetsStore,
    useInventoryStore,
    useDriversStore,
    useBauStore,
    useProjectsStore,
    useScenariosStore,
];

const DEBOUNCE_MS = 1200;

/** Snapshot comparável do estado da empresa (sem timestamps voláteis). */
const snapshot = (cnpj) => {
    try {
        const { exportadoEm, atualizadoEm, ...rest } = buildCompanyExport(cnpj);
        return JSON.stringify(rest);
    } catch (e) {
        return null;
    }
};

export default function useCompanyPersistence(skipLoad = false) {
    const cnpjRaw = useAuthStore((s) => s.user?.selectedCompany?.cnpj);
    const cnpj = cnpjRaw ? String(cnpjRaw).replace(/\D/g, '') : NO_CNPJ;

    const [status, setStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
    const lastSavedRef = useRef({}); // { [cnpj]: snapshotString }
    const timerRef = useRef(null);
    const pendingRef = useRef(false);
    const reqIdRef = useRef(0);
    const rehydratingRef = useRef(false);

    useEffect(() => {
        // Modo recuperação (rota /recuperar): NÃO carrega e NÃO salva nada, para
        // não sobrescrever os dados locais do navegador.
        if (skipLoad) {
            setStatus('idle');
            return undefined;
        }
        if (cnpj === NO_CNPJ) {
            setStatus('idle');
            return undefined;
        }

        let cancelled = false;
        let unsubs = [];
        rehydratingRef.current = true; // suprime auto-save durante a carga

        const flush = async () => {
            if (rehydratingRef.current) return;
            const current = snapshot(cnpj);
            if (current == null) return;
            const prevSnap = lastSavedRef.current[cnpj];
            if (prevSnap === current) {
                pendingRef.current = false;
                return; // nada mudou em relação ao último salvo
            }
            const myReq = (reqIdRef.current += 1);
            setStatus('saving');
            try {
                await saveCompanyToProject(cnpj);
                // Log de auditoria: quem, qual empresa, quando e O QUE mudou (diff).
                let changes = [];
                try {
                    changes = describeChanges(prevSnap ? JSON.parse(prevSnap) : null, JSON.parse(current));
                } catch (err) {
                    changes = [];
                }
                const auth = useAuthStore.getState();
                logSave({ cnpj, empresa: auth.user?.selectedCompany?.company, email: auth.authEmail, changes });
                if (myReq === reqIdRef.current) {
                    lastSavedRef.current[cnpj] = current; // só o save mais recente avança o baseline
                    pendingRef.current = false;
                    setStatus('saved');
                }
            } catch (e) {
                if (myReq === reqIdRef.current) {
                    pendingRef.current = false;
                    setStatus('error');
                }
            }
        };

        const schedule = () => {
            if (rehydratingRef.current) return; // ignora sets de re-hidratação
            pendingRef.current = true;
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(flush, DEBOUNCE_MS);
        };

        // SEGURANÇA (rede contra perda): antes de carregar do banco, preserva UMA
        // cópia do estado local do navegador (a primeira, mais completa). Se a
        // versão do banco for mais pobre (ex.: sobrescrita por outro usuário), os
        // dados locais continuam recuperáveis pela rota /recuperar.
        try {
            const raw = localStorage.getItem(ROOT_KEY);
            if (raw && !localStorage.getItem(`${ROOT_KEY}__bkp`)) {
                localStorage.setItem(`${ROOT_KEY}__bkp`, raw);
            }
        } catch (e) {
            /* localStorage indisponível — ignora */
        }

        (async () => {
            // 1) Carrega a empresa ativa SEMPRE do banco (fonte da verdade
            //    compartilhada) — assim cada usuário vê a última versão salva por
            //    qualquer outro. Só cai no cache local (localStorage) se o banco
            //    não tiver a empresa ou estiver indisponível.
            let loadedFromDb = false;
            try {
                const applied = await loadCompanyFromProject(cnpj);
                loadedFromDb = !!applied;
            } catch (e) {
                loadedFromDb = false; // banco indisponível → usa o cache local
            }
            if (!loadedFromDb) await reloadActive().catch(() => {});
            if (cancelled) return;

            // 2) Baseline DEPOIS da carga; só então liga o auto-save.
            lastSavedRef.current[cnpj] = snapshot(cnpj);
            rehydratingRef.current = false;
            if (hasSupabase) {
                setStatus('saved');
                unsubs = STORES.map((store) => store.subscribe(schedule));
            } else {
                setStatus('idle');
            }
        })();

        return () => {
            cancelled = true;
            rehydratingRef.current = false;
            unsubs.forEach((u) => u());
            if (timerRef.current) clearTimeout(timerRef.current);
            // Flush de segurança ao trocar de empresa: grava o que ficou pendente
            // (buildCompanyExport usa o estado JÁ PERSISTIDO deste CNPJ, não o vivo).
            if (pendingRef.current && hasSupabase) {
                pendingRef.current = false;
                saveCompanyToProject(cnpj).catch(() => {});
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cnpj, skipLoad]);

    return { status, enabled: hasSupabase && cnpj !== NO_CNPJ };
}
