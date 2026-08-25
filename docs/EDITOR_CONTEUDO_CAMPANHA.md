# Editor de conteúdo por campanha

Este documento descreve o editor do Painel do Mestre e é a referência de
manutenção para pessoas e IAs que forem trabalhar nessa funcionalidade.

## Resumo rápido

O editor permite que o mestre personalize **Lore**, **Cronologia**, **Loja** e
**Regras** sem editar o código durante a sessão. Cada mudança pertence somente à
campanha selecionada e passa por duas etapas:

1. **Salvar rascunho** grava uma versão privada no PostgreSQL. Jogadores ainda
   veem a última publicação, ou a base oficial se nada tiver sido publicado.
2. **Publicar** torna o rascunho a sobreposição ativa daquela campanha e cria
   uma revisão no histórico.

Uma revisão antiga nunca volta diretamente ao ar: **Restaurar** apenas a copia
para um novo rascunho. O mestre precisa revisar e publicar novamente.

> Regra de ouro: o editor web não modifica os arquivos do repositório. A verdade
> ao vivo de uma campanha está no PostgreSQL; a cópia revisável dessa verdade no
> Git é o snapshot exportado em `data/editorial/campanhas/`.

## O que cada área faz

| Área | Capacidades | Limites importantes |
| --- | --- | --- |
| Lore | Edita entradas oficiais, cria entradas exclusivas da campanha, controla o `revelado` inicial e oferece editor simples ou JSON completo. | Novas entradas são permitidas apenas em Mundo; a cronologia usa seu editor dedicado. |
| Cronologia | Edita a linha geral e as linhas das Árvores, adiciona, remove e reordena eventos. | O backend valida a estrutura e os limites antes de salvar. |
| Loja | Cria itens exclusivos, personaliza itens oficiais, ativa/desativa, edita JSON validado e mostra prévia. | Tipo, preço, moeda, raridade, aplicação e nível mínimo são validados. Um rascunho não afeta compras. |
| Regras | Edita capítulos e os campos narrativos de classes, raças, Fluxos, magias, rituais, selos, encantamentos, perícias, Legados, condições e crises. | Progressão, custos, requisitos, números e outras estruturas mecânicas ficam protegidos pelo backend. |

Todas as áreas oferecem rascunho, publicação, histórico, restauração e aviso de
alterações não salvas. Trocar de aba, seguir outro link ou fechar a página pede
confirmação quando houver edição pendente.

## Modelo da fonte da verdade

Existem três camadas diferentes e elas não devem ser confundidas:

| Camada | Onde fica | Para que serve |
| --- | --- | --- |
| Base oficial | `data/mundo/`, `data/regras/`, `data/ficha/` e `data/loja/` | Conteúdo compartilhado por todas as campanhas e carregado no deploy. |
| Estado editorial da campanha | PostgreSQL | Rascunhos privados, publicação ativa, versões e histórico. É a verdade usada pelo site ao vivo. |
| Snapshot da campanha | `data/editorial/campanhas/<campanha-id>.json` | Espelho versionável das publicações para revisão, backup lógico e leitura por futuras IAs. Não é lido automaticamente pelo site. |

O conteúdo efetivo é resolvido assim:

```text
documento oficial de data/
        +
publicação da campanha com a mesma chave (substitui o documento oficial)
        =
documento entregue ao frontend
```

Entradas de lore que existem somente na campanha são acrescentadas ao resultado.
Rascunhos nunca entram nessa resolução. Na loja, a mesma ideia é aplicada ao
catálogo oficial e ao campo `publicado` de cada item da campanha.

## Fluxo editorial completo

### Alterar uma campanha pelo painel

1. Abrir **Painel do Mestre > Conteúdo** e escolher a campanha correta.
2. Editar uma entrada e usar **Salvar rascunho**.
3. Conferir a prévia e usar **Publicar** quando a mudança estiver pronta.
4. Usar **Exportar publicados** no topo do painel.
5. Sincronizar o JSON baixado no checkout correto:

   ```powershell
   npm run editorial:sync -- C:\caminho\conteudo-publicado-campanha.json
   ```

6. Revisar o arquivo criado em
   `data/editorial/campanhas/<campanha-id>.json` antes de versioná-lo.

O comando valida `formato`, `versao_formato`, campanha e listas principais antes
de gravar o snapshot. O formato atual é:

```json
{
  "formato": "o-jardim-conteudo-publicado",
  "versao_formato": 1,
  "gerado_em": "data ISO-8601",
  "campanha": { "id": "uuid", "nome": "nome" },
  "conteudo": [],
  "loja": []
}
```

Cada item de `conteudo` leva módulo, chave, título, documento completo, versão e
data de publicação. Cada item de `loja` leva o ID, documento publicado, versão e
data. O snapshot pode conter material privado do mestre; ele não deve ir para um
repositório público nem ser entregue aos jogadores sem revisão.

### Alterar a base oficial

Quando a mudança deve valer para **todas** as campanhas, edite o JSON correto em
`data/` e execute os testes/compiladores aplicáveis. Não copie automaticamente
uma personalização de campanha para a base oficial: isso é uma decisão editorial
separada. Publicações já existentes continuam podendo sobrepor a nova base.

### Descobrir a lore correta de uma campanha

Uma IA não deve olhar apenas `data/mundo/` e concluir que encontrou a versão ao
vivo. O procedimento correto é:

1. identificar o ID da campanha;
2. ler a entrada oficial em `data/`;
3. procurar a mesma chave no snapshot mais recente da campanha;
4. tratar `dados` do snapshot como substituição completa da entrada oficial;
5. se o snapshot não existir ou puder estar desatualizado, consultar o PostgreSQL
   ou pedir ao usuário para exportar novamente.

O campo `gerado_em` informa quando o snapshot foi produzido, mas sozinho não
prova que ninguém publicou algo depois.

## Arquitetura e mapa de arquivos

### Frontend

| Arquivo | Responsabilidade |
| --- | --- |
| `src/pages/Mestre/MasterPage.tsx` | Integra a seção Conteúdo ao Painel do Mestre. |
| `src/components/Settings/ConteudoMestrePanel.tsx` | Abas, troca protegida e exportação de publicados. |
| `src/components/Settings/ConteudoLorePanel.tsx` | Editor de lore e criação de entradas da campanha. |
| `src/components/Settings/CronologiaPanel.tsx` | Editor dedicado da cronologia. |
| `src/components/Settings/CatalogoLojaPanel.tsx` | Editor e prévia do catálogo da campanha. |
| `src/components/Settings/RegrasEditorPanel.tsx` | Editor de capítulos e conteúdos narrativos. |
| `src/components/Settings/NarrativeFieldsEditor.tsx` | Lista explícita de campos narrativos editáveis por tipo. |
| `src/hooks/useUnsavedChanges.ts` | Proteção contra descarte de alterações locais. |
| `src/services/conteudoEditorialApi.ts` | Contratos HTTP de Mundo, Regras, revisões e exportação. |
| `src/services/lojaApi.ts` | Contratos HTTP do editor da Loja. |
| `src/pages/Mundo/MundoPage.tsx` | Consome Mundo já resolvido para a campanha. |
| `src/hooks/useResolvedRules.ts` | Consome Regras já resolvidas para a campanha. |

### Backend e persistência

| Arquivo | Responsabilidade |
| --- | --- |
| `plataforma/routers/content.py` | Editor de Mundo/Regras, resolução, revisões e exportação. |
| `plataforma/routers/shop.py` | Editor da Loja e catálogo resolvido. |
| `plataforma/schemas.py` | Payloads estritos e versões esperadas. |
| `plataforma/core/content_seed.py` | Carrega a base oficial nas bibliotecas do PostgreSQL. |
| `plataforma/core/schema.py` | Migrações das tabelas editoriais. |
| `plataforma/core/audit.py` | Registro das ações editoriais nos logs do mestre. |
| `tools/sync-editorial-snapshot.mjs` | Valida e copia a exportação para `data/editorial/`. |

Tabelas principais:

- `informacoes_campanha`: guarda `rascunho`, publicação em `dados_completos`,
  `versao_editorial` e `publicado_em` para Mundo e Regras.
- `revisoes_conteudo`: histórico imutável criado a cada publicação.
- `catalogo_itens_campanha`: guarda `rascunho`, `publicado`, `versao` e datas da
  personalização da Loja.
- `revisoes_catalogo_campanha`: histórico das publicações da Loja.
- `eventos_auditoria`: registra salvamentos, publicações e restaurações.

## Endpoints do editor

Conteúdo e regras:

```text
GET  /conteudo/editor
PUT  /conteudo/editor/rascunho
POST /conteudo/editor/{id}/publicar
GET  /conteudo/editor/{id}/revisoes
POST /conteudo/editor/{id}/revisoes/{revisao_id}/restaurar
GET  /conteudo/editor/exportar
GET  /conteudo/resolvido
```

Loja:

```text
GET  /loja/editor/catalogo
PUT  /loja/editor/rascunho
POST /loja/editor/{id}/publicar
GET  /loja/editor/{id}/revisoes
POST /loja/editor/{id}/revisoes/{revisao_id}/restaurar
GET  /loja/catalogo
```

Os endpoints do editor exigem mestre da campanha. Operações que alteram estado
também exigem CSRF. Salvamento, publicação e restauração usam
`versao_esperada`; uma edição concorrente retorna HTTP 409 e deve ser resolvida
recarregando o estado, nunca sobrescrevendo silenciosamente.

## Garantias que não podem ser removidas sem decisão explícita

- **Separação rascunho/publicação:** jogadores nunca recebem rascunhos.
- **Mecânicas protegidas:** para classes, raças, magias e os demais catálogos de
  regras, o backend compara a projeção mecânica com a base oficial. A interface
  esconder campos não é proteção suficiente.
- **Automação preservada:** editar o texto de condições e crises não muda seus
  efeitos programados.
- **HTML limitado:** capítulos aceitam somente a estrutura HTML autorizada pelo
  validador; não amplie a lista sem avaliar XSS e a renderização.
- **Conteúdo do mestre protegido:** `corpoMestre` é removido da resposta resolvida
  para usuários que não administram conteúdo.
- **Visibilidade de lore:** preserve `revelado: false` na raiz do documento. O
  seed oficial e o editor precisam manter esse valor.
- **Histórico seguro:** restaurar cria rascunho; publicar é sempre uma ação
  posterior e explícita.
- **Concorrência otimista:** toda mutação respeita a versão recebida pelo cliente.
- **Auditoria:** novas mutações editoriais precisam registrar ator, campanha,
  alvo, ação e detalhes úteis.
- **Sem escrita do servidor no Git:** o backend implantado não deve tentar editar
  o checkout. Ambientes de deploy podem ser efêmeros e isso eliminaria revisão e
  versionamento. A ponte correta é exportar e executar `editorial:sync` localmente.

## Como ampliar o editor com segurança

Ao adicionar um novo tipo ou campo:

1. definir primeiro se ele é narrativo ou mecânico;
2. acrescentar o tipo à biblioteca oficial em `content_seed.py`, se aplicável;
3. declarar somente os campos narrativos em `NarrativeFieldsEditor.tsx` **e** no
   mapa equivalente do backend em `content.py`;
4. validar forma, tamanho e valores permitidos no backend;
5. manter rascunho, publicação, revisão, restauração, versão esperada e auditoria;
6. garantir que a rota resolvida entregue apenas a publicação;
7. integrar `useUnsavedChanges` e propagar `onDirtyChange` até o painel pai;
8. incluir o novo conteúdo no snapshot, caso ele faça parte da verdade editorial
   por campanha;
9. criar testes de caminho feliz, permissão, CSRF, entrada inválida, conflito 409,
   isolamento entre campanhas e ausência de vazamento do rascunho;
10. verificar manualmente o fluxo completo em viewport de computador e celular.

Não confie em validação somente no React. Payloads podem ser enviados diretamente
à API, portanto limites de segurança e integridade pertencem ao backend.

## Validação antes da entrega

Use pelo menos:

```powershell
npm run test:frontend
npm run build
Set-Location plataforma
.\.venv\Scripts\python.exe -m pytest -q
```

Quando houver mudanças nos dados ou nas mecânicas, execute também os comandos
específicos indicados em `data/README.md` e `docs/GUIA_MANUTENCAO.md`, como
`npm run check:mundo`, `npm run check:rules-source` e `npm run audit:balance`.

Testes diretamente relacionados ao editor ficam principalmente em:

- `tests/frontend/editorialRules.test.ts`;
- `plataforma/tests/test_content_editorial.py`;
- `plataforma/tests/test_shop_catalog_editor.py`.

Depois dos testes automatizados, faça uma verificação visual e funcional com um
usuário mestre e, separadamente, com um jogador. Confirme que salvar não publica,
publicar muda o conteúdo resolvido, restaurar não publica e conteúdo privado não
aparece ao jogador.

## Armadilhas comuns

- Trabalhar por engano na cópia do OneDrive.
- Ler apenas `data/` ao responder sobre a lore de uma campanha personalizada.
- Tratar o snapshot como sincronização automática com o site; ele é apenas um
  espelho da publicação no instante da exportação.
- Exibir o rascunho porque ele é mais recente que a publicação.
- Liberar edição de números ao criar um formulário narrativo novo.
- Remover ou renomear chaves mecânicas ao reconstruir um JSON no frontend.
- Publicar automaticamente depois de restaurar uma revisão.
- Resolver um HTTP 409 repetindo a requisição com uma versão inventada.
- Versionar um snapshot com segredos ou orientações privadas em repositório
  público.

