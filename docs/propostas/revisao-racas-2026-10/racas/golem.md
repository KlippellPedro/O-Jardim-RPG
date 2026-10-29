# Revisão do Golem

Seis Materiais do Corpo e escada 1 / 12 / 36 (Recém-Erguido, Remendado, Monumento). É a raça de corpo construído das comuns, e a fisiologia (Ofício no lugar de Cura, armadura adaptada) está bem resolvida. Os números do topo são os mais altos das comuns, empatados com o Gigante: pacote 6 → 15 → 39, com o Monumento somando +16 Vida e +8 Estamina num degrau só, mais do que a escada inteira da Sereia.

## Achados (do mais grave ao menos grave)

- [ERRO] `corpo-construido` e página `Golem.tsx`: "Medicina" não existe na lista de perícias. *(Aplicado: virou Cura nos dois lugares.)*
- [INCOERÊNCIA] `ferro / chapeamento`: dá +3 de Defesa e proíbe armadura, "nem mesmo adaptada". A Armadura de Ferro dá +6 e a de Aço +7 já no nível 1, então o Golem de Ferro termina com menos Defesa que qualquer outro Golem de armadura adaptada. O Material que devia ser o mais blindado é o menos. → "+3 de Defesa, e você pode vestir armadura adaptada por cima", ou "as placas contam como Armadura de Aço (+7), sem penalidade".
- [INCOERÊNCIA] `madeira / raiz-ancora` (36): prende sem teste todos os hostis a até 3 m; só a saída tem teste. *(O nome da condição foi aplicado: "ficam Imobilizadas".)* → Reflexos para não ficar Imobilizado. Ver Decisão 5.
- [INCOERÊNCIA] `obsidiana / campo-de-lascas` (36): "criaturas que se moverem dentro sofrem 4d6" sem dizer com que frequência nem com que teste. → "uma vez por turno, ao se mover na área; Reflexos reduz à metade".
- [INCOERÊNCIA] `monumento / nao-se-derruba` (36): "continua agindo normalmente enquanto tiver ao menos uma parte estrutural inteira" bate de frente com as regras de Morrendo (0 de Vida) e não diz o que é "parte estrutural". → cortar a frase, ou trocar por "Ferimentos não tiram suas ações".
- [MELHORIA] `cristal / prisma-vivo`: "ficam ofuscadas" não é condição. O efeito está descrito logo depois (desvantagem à distância contra você), mas sem teste. → tirar a palavra e dar Fortitude, ou deixar sem teste e dizer isso.
- [MELHORIA] `madeira / seiva-viva`: "você sofre o dobro de dano de fogo". A tabela chama isso de vulnerabilidade. → "você tem vulnerabilidade a Fogo".
- [MELHORIA] pacote: 39 no topo. Ver Decisão 2.
