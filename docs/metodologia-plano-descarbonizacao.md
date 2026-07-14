# Metodologia — Plano de Descarbonização (Climoo)

Base de conhecimento sobre **como se constrói um plano de descarbonização** nesta
ferramenta: etapas, conceitos, regras de cálculo e critérios de decisão.
Documento **conceitual e metodológico** — não trata de implementação técnica.

> Público-alvo: agente/consultor que precise conduzir, revisar ou explicar um
> plano de descarbonização do início ao fim.

---

## 1. Visão geral

Um plano de descarbonização responde a quatro perguntas, nesta ordem:

1. **Quanto a empresa emite hoje?** → Inventário
2. **Quanto ela precisa reduzir, até quando e sob qual regra?** → Metas (SBTi)
3. **Quanto ela emitiria se não fizesse nada?** → Projeção BAU
4. **O que fazer, quanto cada ação reduz e quanto custa?** → Projetos → Cenários

A ferramenta organiza isso em **6 etapas encadeadas**. Cada etapa consome a
anterior; mudar um dado a montante recalcula tudo a jusante, ao vivo.

```
1. Inventário  →  2. Metas & Período  →  3. Variáveis de Crescimento
                                                     ↓
                          6. Cenários  ←  5. Projetos  ←  4. Projeção BAU
```

| Etapa | Pergunta que responde | Saída principal |
|---|---|---|
| 1. Inventário | Quanto emitimos, por escopo/categoria/atividade? | Lista de atividades emissoras com emissão no ano-base |
| 2. Metas & Período | Qual a ambição, o horizonte e a fronteira? | Uma ou mais metas com trajetória-alvo |
| 3. Variáveis de Crescimento | Como o negócio cresce? | Drivers (índice base 100) |
| 4. Projeção BAU | Quanto emitiríamos sem ação? | Curva BAU por atividade/escopo |
| 5. Projetos | Que ações tomamos e quanto reduzem? | Abatimento por projeto/ano + custo |
| 6. Cenários | Que combinação de ações fecha o gap? | Cascata, trajetória, MACC, gap |

**Princípio central:** o inventário é a **fonte única da verdade**. Metas, BAU,
projetos e cenários derivam dele. Nenhuma emissão é digitada duas vezes.

---

## 2. Glossário

| Termo | Definição |
|---|---|
| **Escopo 1** | Emissões diretas (combustão, frota própria, fugitivas, processos, efluentes, agrícolas, uso do solo, resíduos). |
| **Escopo 2** | Emissões da energia elétrica comprada (método por localização ou por mercado). |
| **Escopo 3** | Emissões da cadeia de valor (15 categorias: compras, bens de capital, transporte, viagens, uso de produtos vendidos, etc.). |
| **Atividade emissora** | Menor unidade do inventário (ex.: "Diesel – frota pesada"). Tem escopo, categoria, nome e emissão no ano-base. |
| **Ano-base (BY)** | Ano de referência das emissões contra o qual a meta é medida. Fonte única definida em Metas & Período. |
| **Ano mais recente (MRY)** | Último inventário disponível; informativo/ajuste da regra SBTi. |
| **Ano de submissão** | Ano em que as metas são enviadas ao SBTi. Define a janela do near-term. |
| **Near-term** | Meta de curto prazo: 5 a 10 anos após a submissão. |
| **Long-term / Net-zero** | Meta de longo prazo (opcional por meta), até o horizonte do plano. |
| **Cobertura da meta** | Quais atividades do inventário entram na meta (escopos + seleção de atividades/categorias). Define a *fronteira*. |
| **Base coberta** | Soma das emissões (ano-base) das atividades **selecionadas na cobertura** — não é o total do escopo. |
| **Driver (variável de crescimento)** | Métrica que explica o crescimento das emissões (receita, unidades produzidas, headcount…). |
| **BAU (Business as Usual)** | Trajetória de emissões **sem nenhuma ação** de descarbonização. |
| **Iniciativa** | Tecnologia/prática do banco, com **eficácia** (% de redução por unidade convertida). |
| **Projeto** | Aplicação de uma iniciativa a um **grupo de atividades**, com abrangência no tempo e custos. |
| **Abrangência (cobertura no tempo)** | % do grupo de atividades efetivamente convertido em cada ano. |
| **Eficácia** | % de redução obtido em cada unidade convertida (vem da iniciativa). |
| **Abatimento** | Redução de emissões (tCO2e) gerada por um projeto em um ano. |
| **Cenário** | Combinação de projetos ligados/desligados, comparada ao BAU e à meta. |
| **Gap residual** | Emissão do cenário no ano-alvo − alvo da meta. Positivo = meta não atingida. |
| **MACC** | Curva de custo marginal de abatimento: projetos ordenados por R$/tCO2e. |

---

## 3. Etapa 1 — Inventário de emissões

### O que é
A fonte única de atividades emissoras. Cada linha = **uma atividade** com:
**escopo → categoria → atividade → emissão (tCO2e) → ano**.

### Categorias válidas por escopo
- **Escopo 1:** Atividades agrícolas · Combustão estacionária · Combustão móvel ·
  Efluentes · Emissões fugitivas · Emissões fugitivas não Quioto · Mudança no Uso
  do Solo · Processos industriais · Resíduos
- **Escopo 2:** Energia elétrica — método baseado na Localização · Energia
  elétrica — método baseado no Mercado
- **Escopo 3:** as 15 categorias do GHG Protocol (Compra de bens e serviços; Bens
  de capital; Outras emissões do ciclo de vida de combustíveis e eletricidade;
  Transporte e Distribuição upstream; Resíduos; Viagens a negócios; Deslocamento
  de funcionários; Bens arrendados upstream; Transporte e Distribuição downstream;
  Processamento de produtos vendidos; Uso de bens e serviços vendidos; Tratamento
  de fim de vida; Bens arrendados como arrendadora; Franquias; Investimentos) +
  "Outras emissões não categorizadas".

### Boas práticas
- O inventário é **por ano**. O plano usa o **ano-base**; anos adicionais servem
  de histórico.
- O campo **Grupo** (opcional) qualifica a atividade (ex.: unidade de negócio) e
  entra no nome como `Grupo | Atividade`.
- **Granularidade importa:** um projeto só consegue atacar o que existe como
  atividade separada. Se "Diesel" está agregado num único registro, não dá para
  aplicar HVO só na frota pesada.

### Critério de qualidade
- Cobertura completa dos Escopos 1 e 2.
- Escopo 3 mapeado ao menos nas categorias materiais (regra dos 40%, ver §4).

---

## 4. Etapa 2 — Metas & Período (SBTi)

### Estrutura
- **Período do plano** (único, no topo): ano-base, ano mais recente, horizonte
  net-zero.
- **Lista de metas** (várias): cada uma com sua fronteira, tipo, ambição e
  horizonte. Cada meta gera **sua própria trajetória**.

### Configuração de uma meta
1. **Escopos cobertos** — E1, E2, E3 (um ou mais).
2. **Cobertura da meta (atividades incluídas)** — por padrão 100% das atividades
   dos escopos cobertos; o usuário pode **desmarcar** atividades ou categorias
   inteiras. A **base coberta** = soma das atividades marcadas.
3. **Tipo de meta** (ver §4.2).
4. **Ambição** — 1,5 °C ou "bem abaixo de 2 °C" (WB2).
5. **Ano de submissão** → **near-term** (5–10 anos depois) → **long-term**
   (opcional).

> A **% de redução nunca é digitada** (exceto FLAG): ela é **derivada** pela regra
> SBTi a partir da ambição, do horizonte e do mix de escopos.

### 4.1 Regras estruturais (SBTi)
- **Near-term:** entre submissão + 5 e submissão + 10 anos.
- **Regra dos 40%:** se o Escopo 3 representa ≥ 40% das emissões totais, é
  **obrigatório** ter uma meta de Escopo 3.
- **Sem dupla contagem:** um escopo não pode ser coberto por mais de uma meta
  absoluta.
- **Escopo 3 — cobertura mínima de 67%** (2/3) das emissões de Escopo 3 para a
  meta combinada e como referência para engajamento.
- **Reduções anteriores a 2020 não contam** (ancoragem da trajetória de
  intensidade em 2020).

### 4.2 Tipos de meta

#### a) Redução absoluta (ACA — Absolute Contraction Approach)
Reduzir as emissões absolutas cobertas em X% até o ano-alvo.

**Como a % é derivada:**
1. Para **cada escopo coberto**, calcula-se a taxa anual linear implícita da
   trajetória de net-zero:
   `dLARR_nz = ambição_net-zero / (ano_net-zero − ano_mais_recente)`
   Ambições de net-zero por escopo (SBTi Corporate Net-Zero Standard):

   | Escopo | Ambição net-zero (1,5 °C) | Ambição (WB2) | Ano net-zero padrão |
   |---|---|---|---|
   | Escopo 1 | 90% | 90% | 2050 |
   | Escopo 2 | 100% | 100% | **2040 (teto)** |
   | Escopo 3 | 90% | 75% | 2050 |

2. **Combina** as taxas ponderando pela participação de cada escopo na base
   coberta (por isso a % **varia com o mix** do inventário).
3. Converte a ambição para o intervalo ano-base → ano-alvo.
4. Aplica o **piso da ambição** (MAX): **1,5 °C = 4,2%/ano**; **WB2 = 2,5%/ano**.
5. `redução = taxa_ajustada × (ano-alvo − ano-base)`, limitada a **90%**.
6. **Net-zero = −90%** (residual de ~10% a ser neutralizado).

#### b) Intensidade física / Intensidade monetária
Reduzir a **intensidade** (emissões por unidade de atividade ou de valor).

- **Intensidade base** = *base coberta ÷ denominador no ano-base*.
  O **denominador é um driver** (Etapa 3) — ex.: receita líquida (monetária),
  toneladas produzidas (física).
- **Redução de intensidade** (fórmula composta, ancorada em 2020):

  ```
  redução = 1 − (1 − r)^n
      r = taxa anual de redução de intensidade  (fixa: 7%/ano para 1,5 °C)
      n = ano-meta − 2020
  ```

  **Exemplo:** ano-base 2025, ano-meta 2036, r = 7% → n = 16 →
  `1 − 0,93^16 = 68,69%`.
  (Ano-base 2018, meta 2030 → n = 10 → `1 − 0,93^10 = 51,60%`.)

- **Conversão para absoluto:** `emissão(ano) = intensidade(ano) × denominador(ano)`.
  É essa curva absoluta que os Cenários comparam. Ou seja: **se o negócio cresce
  rápido, uma meta de intensidade pode não reduzir as emissões absolutas** — é uma
  característica do método, não um erro.
- A empresa escolhe **um** tipo (física **ou** monetária), conforme o setor.

#### c) Engajamento (fornecedores/clientes)
Meta de Escopo 3 em que a empresa **não reduz diretamente**, mas se compromete a
**engajar parceiros** para que eles adotem metas baseadas na ciência.

- Cadastra-se cada **fornecedor/cliente** com: nome, tipo, **categoria do Escopo 3**
  e **emissão associada** (tCO2e).
- **Emissões cobertas** = soma das emissões dos parceiros.
- **Cobertura** = emissões cobertas ÷ Escopo 3 total. Alvo de referência: **≥ 67%**.
- **Horizonte fixo: submissão + 5 anos** (não é 5–10 como as metas de redução).
- **Não gera trajetória de redução** do inventário próprio (o abatimento vem da
  ação dos parceiros) — por isso não aparece como linha de redução nos Cenários.

**Texto-padrão:** *"[Empresa] assegura que X%, em emissão, de seus
fornecedores/clientes (considerando as emissões abrangidas pela [categoria])
estabelecerão metas climáticas baseadas na ciência até [submissão + 5]."*

#### d) Meta combinada (redução + engajamento)
Meta de Escopo 3 que junta:
- uma **parte de redução** (absoluta ou de intensidade) sobre as atividades
  cobertas; **e**
- uma **parte de engajamento** (lista de parceiros).

**Regra da dupla contagem:** a emissão de cada parceiro é **descontada da sua
categoria** na cobertura de redução (limitada ao que há coberto naquela
categoria). Assim:

```
cobertura conjunta = (redução coberta − engajamento descontado) + engajamento
```

e o total **nunca ultrapassa 100%** do Escopo 3.
**Exigência:** cobertura conjunta **≥ 67%** do Escopo 3.

#### e) FLAG (Florestas, Terra e Agricultura)
Para setores com emissões de uso da terra. Aqui as metas são **informadas
manualmente**, em dois componentes:
- **Meta de redução (%)** — redução de emissões FLAG;
- **Meta de remoção (%)** — remoções biogênicas (sequestro).

**Meta geral FLAG = redução + remoção** (é essa soma que vai para o texto e para
a trajetória).

#### f) Setorial (SDA)
Ainda **não implementado** — atualmente aproximado pelo ACA. Reservado para
pathways setoriais (convergência de intensidade por setor).

### 4.3 Trajetória-alvo
Cada meta gera uma trajetória anual: **ano-base → near-term → (net-zero)**, com
interpolação entre os marcos. É essa curva que os Cenários usam como referência.

---

## 5. Etapa 3 — Variáveis de Crescimento (drivers)

### O que é
Um driver explica **por que as emissões cresceriam** sem ação. Ele é normalizado
em uma **série de índice base 100 no ano-base**.

### Tipos de driver
- **Físico** — toneladas produzidas, unidades, m², MWh…
- **Financeiro** — receita líquida, valor agregado…
- **Operacional** — headcount, nº de equipamentos, frota…

### Métodos de entrada
| Método | Como se informa | Uso típico |
|---|---|---|
| **Taxa média** (`avg`) | Uma taxa única %/ano | Crescimento estável de longo prazo |
| **Por período** (`period`) | Trechos `de–até` com taxa própria | Ramp-up, expansão em fases |
| **Ano a ano** (`yearly`) | **Valores absolutos** por ano | Quando há budget/projeção oficial |

No método ano a ano, o crescimento é **derivado** do valor do ano anterior
(o ano-base usa o `baseValue` como âncora).

### Cálculo
```
índice(ano) = 100 × Π (1 + crescimento(y)/100),  y = base+1 … ano
```

### Cuidados
- **Alerta de implausibilidade:** taxas sustentadas acima de **20%/ano** são
  sinalizadas (não bloqueiam, mas devem ser justificadas).
- Todo driver deve ter **premissa/fonte** registrada (memorial).
- O driver usado como **denominador de meta de intensidade** precisa ter
  `baseValue` e unidade coerentes — é ele que define a unidade do indicador
  (ex.: `tCO2e/Milhões de Reais`).

---

## 6. Etapa 4 — Projeção BAU

### O que é
A curva de emissões **sem nenhuma ação**. Serve de contrafactual: é contra o BAU
que se mede o abatimento dos projetos.

### Como se monta
Para **cada atividade** do inventário, define-se:
- **Driver vinculado** (Etapa 3), ou
- **"Não cresce"** — vínculo explícito de crescimento zero (emissão constante), ou
- **Sem vínculo** (atividade órfã) — também tratada como crescimento zero, mas é um
  **sinal de trabalho incompleto**.
- **Fator de acoplamento** (padrão 1,0) — o quanto a emissão acompanha o driver.
  Ex.: fator 0,8 = a emissão cresce 80% do que o driver cresce (ganho de eficiência
  estrutural); fator 1,0 = acoplamento total.

### Cálculo
```
crescimento_atividade(ano) = crescimento_driver(ano) × fator
emissão_atividade(ano)     = emissão_base × Π (1 + crescimento_atividade(y)/100)
BAU(ano)                   = Σ emissão_atividade(ano)
```

### Leitura por meta
O BAU é visto **por meta** (abas): ao selecionar uma meta, ele mostra **apenas as
atividades cobertas** por ela. Se a meta é de **intensidade**, o BAU é exibido no
**indicador** (tCO2e ÷ denominador do ano), não em tCO2e absoluto.

### Sinais de alerta
- Atividades **órfãs** (sem vínculo) — o BAU as trata como planas, o que pode
  subestimar o crescimento.
- Todo o inventário vinculado a um único driver — costuma indicar simplificação
  excessiva.

---

## 7. Etapa 5 — Projetos de descarbonização

### Duas camadas
1. **Banco de Iniciativas / Tecnologias** — catálogo reutilizável. Cada iniciativa traz:
   - **eficácia** (% de redução por unidade convertida) — ex.: troca de gasolina
     por etanol ≈ 80%; eletrificação de leves ≈ 99%; biodiesel B20 ≈ 18%;
     direção econômica ≈ 12%; I-RECs (Escopo 2, market-based) = 100%;
   - **aplicabilidade** (escopos/categorias onde faz sentido);
   - **memorial** (como a eficácia foi obtida).
2. **Projeto** — a aplicação concreta da iniciativa na empresa.

### Como se define um projeto
| Campo | Significado |
|---|---|
| **Iniciativa** | Qual tecnologia/prática (traz a eficácia) |
| **Metas vinculadas** | A quais metas o projeto serve (N:N) |
| **Atividades do projeto** | Grupo de atividades atacadas — **só as cobertas pelas metas vinculadas** aparecem |
| **Período** | Ano de início e fim |
| **Abrangência no tempo** | Pontos `ano → %` de adoção (ex.: 2027 = 10%, 2036 = 100%) |
| **Quantificação financeira** | CAPEX, OPEX (a.a.), receitas, economias, vida útil, moeda |

### Cálculo do abatimento
```
abrangência(ano):
    0                                  se ano < início
    interpolação linear entre pontos   (com (início, 0%) implícito)
    constante após o último ponto

abatimento(ano) = emissão_BAU_do_grupo(ano) × abrangência/100 × eficácia/100
```

> **Duas alavancas independentes:** *abrangência* = quanto do parque foi
> convertido; *eficácia* = quanto cada unidade convertida reduz. O produto das
> duas é o abatimento.

### Custo (MACC)
```
custo_líquido   = CAPEX + OPEX × vida_útil − receitas − economias
custo_por_ton   = custo_líquido ÷ abatimento_total_no_horizonte
```
Projetos com custo negativo = **economicamente atrativos** (pagam-se sozinhos).

### Exibição em metas de intensidade
Se o projeto pertence a uma meta de **intensidade**, as emissões/reduções das suas
atividades são mostradas **no indicador**; atividades de metas **absolutas** seguem
em tCO2e.

---

## 8. Etapa 6 — Cenários

### O que é
Um **cenário** é uma combinação de projetos (ligados/desligados) avaliada contra o
**BAU** e a **meta**. Cenários são organizados **por meta** — cada meta tem seus
próprios cenários.

- **Override por cenário:** dá para alterar abrangência/período de um projeto
  *dentro de um cenário*, sem mexer no projeto base (permite comparar
  "conservador × agressivo" com o mesmo projeto).
- **Abatimento aditivo:** projetos complementares somam.
- Tudo é restrito à **cobertura da meta em foco** (escopos + atividades cobertas).

### As quatro leituras

| Visualização | O que responde |
|---|---|
| **KPIs (gauges)** | BAU no ano-alvo · Emissão do cenário · Alvo da meta · **Gap residual** |
| **Cascata** | De onde vem cada tonelada reduzida: Base → BAU → uma barra por projeto → Meta |
| **Trajetória no tempo** | O cenário fecha o gap **no ano certo** ou só no final? |
| **MACC** | Quais projetos entregam mais tonelada por real (ordenados por R$/tCO2e) |

### Gap residual
```
gap = emissão_do_cenário(ano-alvo) − alvo_da_meta(ano-alvo)
```
- `gap ≤ 0` → **meta atingida**.
- `gap > 0` → faltam projetos, mais abrangência, ou iniciativas mais eficazes.

### Metas de intensidade
Quando a meta em foco é de intensidade, **gauges, cascata e atividades dos
projetos** são exibidos **no indicador** (tCO2e ÷ denominador do ano), não em
tCO2e absoluto.

---

## 9. Validações e regras de consistência

A ferramenta sinaliza (sem bloquear) quando:

| Regra | Sinal |
|---|---|
| Escopo com emissão e **sem nenhuma meta** | Aviso global |
| Escopo coberto por **mais de uma meta absoluta** | Dupla contagem |
| **Escopo 3 ≥ 40%** do total e sem meta de E3 | Violação da regra SBTi |
| Meta de intensidade **sem denominador** selecionado | Meta não derivável |
| Meta de engajamento/combinada **sem parceiros** | Cobertura zero |
| Meta combinada com **cobertura conjunta < 67%** do E3 | Abaixo do mínimo |
| Near-term **fora da janela** 5–10 anos da submissão | Horizonte inválido |
| Long-term **anterior** ao near-term ou além do horizonte do plano | Horizonte inválido |
| Driver com crescimento **> 20%/ano** sustentado | Implausível |
| Atividade **órfã** (sem driver, sem projeto) | Não recebe crescimento nem abatimento |

---

## 10. Como construir um plano — passo a passo

### Fase 1 — Diagnóstico
1. Carregar o **inventário** do ano-base (escopo → categoria → atividade → tCO2e).
2. Verificar **materialidade**: qual o peso de cada escopo? O Escopo 3 passa de 40%?
3. Checar **granularidade**: as atividades permitem endereçar projetos reais?

### Fase 2 — Metas
4. Definir **período**: ano-base, ano mais recente, horizonte net-zero.
5. Definir **ano de submissão** → decorre a janela do near-term.
6. Criar as metas. Padrão intersetorial mais comum:
   - **Meta 1:** Escopo 1+2, **redução absoluta** (ACA).
   - **Meta 2:** Escopo 3 — escolher entre **absoluta**, **intensidade**,
     **engajamento** ou **combinada**, conforme a materialidade e a capacidade de
     influência sobre a cadeia.
   - Se houver emissões de uso da terra: **meta FLAG** (redução + remoção).
7. Ajustar a **cobertura** de cada meta (quais categorias/atividades entram).
   Atenção: o E3 exige **≥ 67%** de cobertura na meta combinada.
8. Ler a **meta resultante** (% derivada) e o texto do compromisso.

### Fase 3 — Crescimento e contrafactual
9. Cadastrar os **drivers** com premissa e fonte (receita, produção, headcount…).
10. Vincular **cada atividade** a um driver (ou marcar "não cresce") e ajustar o
    **fator de acoplamento**. Eliminar atividades órfãs.
11. Ler o **BAU por meta**: quanto cresceriam as emissões cobertas sem ação?

### Fase 4 — Ações
12. Levantar **iniciativas** aplicáveis (banco de tecnologias).
13. Criar **projetos**: iniciativa + grupo de atividades + abrangência no tempo +
    custos.
14. Quantificar: cada projeto gera uma curva de abatimento e um R$/tCO2e.

### Fase 5 — Cenários e decisão
15. Montar **cenários** por meta (ex.: "Conservador", "Otimista", "Custo mínimo").
16. Ler o **gap** no ano-alvo. Se positivo: adicionar projetos, aumentar
    abrangência, ou rever a ambição.
17. Usar o **MACC** para priorizar (começar pelos custos negativos).
18. Usar a **cascata** para comunicar de onde vem cada tonelada.

### Fase 6 — Validação e submissão
19. Revisar as validações (§9).
20. Validar com a diretoria (custo, viabilidade, ritmo).
21. Submeter as metas ao SBTi.

---

## 11. Acompanhamento do plano (gestão do projeto)

Além do cálculo, a ferramenta acompanha a **condução do projeto com o cliente**,
em 8 etapas-padrão do método Climoo:

1. Diagnóstico do inventário
2. Definição das metas SBTi
3. Projeção de crescimento (BAU)
4. Levantamento de iniciativas
5. Quantificação das oportunidades
6. Construção dos cenários
7. Validação com a diretoria
8. Submissão e validação SBTi

Cada etapa tem **status** (não iniciado / em andamento / concluído), **datas de
início e fim**, **observação** e uma **checklist de tarefas** — quando todas as
tarefas são marcadas, a etapa é dada como concluída automaticamente. O conjunto
alimenta um **cronograma** (linha do tempo por mês) e um indicador de progresso.

Cada empresa tem seu próprio ambiente (dados isolados por CNPJ); usuários só
acessam a empresa a que foram vinculados.

---

## 12. Apêndice — fórmulas de referência

**Driver (índice base 100):**
```
índice(ano) = 100 × Π (1 + g(y)/100),   y = base+1 … ano
```

**BAU:**
```
crescimento_atividade(ano) = g_driver(ano) × fator
emissão(ano) = emissão_base × Π (1 + crescimento_atividade(y)/100)
```

**Meta absoluta (ACA):**
```
dLARR_nz(escopo) = ambição_nz(escopo) / (ano_nz − ano_recente)
taxa = MAX( piso_da_ambição , Σ peso(escopo) × dLARR_nz(escopo) ajustada ao intervalo )
redução = MIN( 90% , taxa × (ano-alvo − ano-base) )
    piso: 1,5 °C = 4,2%/ano · WB2 = 2,5%/ano
```

**Meta de intensidade:**
```
intensidade_base = base_coberta ÷ denominador(ano-base)
redução = 1 − (1 − r)^n        r = 7%/ano (1,5 °C) · n = ano-meta − 2020
emissão_absoluta(ano) = intensidade(ano) × denominador(ano)
```

**Meta de engajamento:**
```
emissões_cobertas = Σ emissão(parceiro)
cobertura = emissões_cobertas ÷ Escopo 3 total     (alvo ≥ 67%)
ano-alvo = ano de submissão + 5
```

**Meta combinada:**
```
cobertura_conjunta = (redução_coberta − engajamento_descontado) + engajamento
                     ≥ 67% do Escopo 3
```

**Meta FLAG:**
```
meta_geral = meta_de_redução(%) + meta_de_remoção(%)
```

**Projeto:**
```
abatimento(ano) = emissão_BAU_do_grupo(ano) × abrangência(ano)/100 × eficácia/100
custo_por_ton   = (CAPEX + OPEX × vida_útil − receitas − economias) ÷ abatimento_total
```

**Cenário:**
```
emissão_cenário(ano) = BAU(ano) − Σ abatimento(projetos ativos, ano)
gap = emissão_cenário(ano-alvo) − alvo_da_meta(ano-alvo)
```

---

## 13. Erros comuns (o que um bom agente deve checar)

1. **Confundir "escopo coberto" com "base coberta".** O escopo diz quais escopos
   entram; a **cobertura** diz quais atividades. A base coberta é a soma das
   atividades **selecionadas**, e pode ser bem menor que o total do escopo.
2. **Meta de intensidade com negócio em forte crescimento.** A intensidade cai,
   mas as emissões absolutas podem subir. Sempre verificar a curva **absoluta**
   nos Cenários.
3. **Dupla contagem em meta combinada.** Se um fornecedor engajado está numa
   categoria que também está na cobertura de redução, a emissão precisa ser
   descontada — senão a cobertura passa de 100%.
4. **Atividades órfãs no BAU.** Ficam planas e subestimam o contrafactual.
5. **Abrangência otimista demais.** 100% de conversão em 3 anos raramente é
   realista; a curva de abrangência é onde mora a viabilidade.
6. **Ignorar a regra dos 40%.** Se o Escopo 3 é material, não há plano SBTi válido
   sem meta de Escopo 3.
7. **Somar eficácia de projetos sobrepostos na mesma atividade.** Verificar se dois
   projetos atacam a mesma atividade (o cenário soma de forma aditiva).
8. **Esquecer que a % da meta não é digitada.** Ela é derivada — se o número
   "parece errado", o que mudou foi o **mix de escopos**, a **cobertura** ou o
   **horizonte**.
