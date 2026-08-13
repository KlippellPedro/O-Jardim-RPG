# Relatório de balanceamento v1

Gerado por `npm run audit:balance`. Esta é uma verificação quantitativa, não substitui playtest.

## Premissas

- Força 12, Destreza 14, Constituição 14, Inteligência 13, Sabedoria 10, Carisma 8 e Fluxo 14.
- Depois do nível 20, a referência usa uma segunda classe neutra com 3,5 de Vida e 3,5 de Mana por nível.
- Mede recursos, vagas, dano médio e palavras de risco. Efeitos narrativos e controle ainda exigem playtest.

## Resultado automático

- 27 classes analisadas.
- 87 armas analisadas.
- 0 classes fora do orçamento de 7 pontos de Vida + Mana.
- 0 armas acima de 75 de dano médio sem bloqueio do Mestre.

Cada célula mostra `Vida/Mana/vagas de poder`.

| Classe | Tipo | Orçamento | N1 | N5 | N10 | N15 | N20 | N30 | N40 | Alertas qualitativos |
|---|---|---:|---: | ---: | ---: | ---: | ---: | ---: | ---:|---|
| Guerreiro | comum | 7 | 16/8/0 | 44/16/1 | 79/26/3 | 114/36/5 | 149/46/8 | 204/81/8 | 259/116/8 | nenhum |
| Piloto | comum | 7 | 16/8/0 | 40/20/1 | 70/35/3 | 100/50/5 | 130/65/8 | 185/100/8 | 240/135/8 | nenhum |
| Ninja | comum | 7 | 16/8/0 | 40/20/1 | 70/35/3 | 100/50/5 | 130/65/8 | 185/100/8 | 240/135/8 | nenhum |
| Pop Star | comum | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | Publi |
| Espadachim | comum | 7 | 16/8/0 | 44/16/1 | 79/26/3 | 114/36/5 | 149/46/8 | 204/81/8 | 259/116/8 | nenhum |
| Lutador | comum | 7 | 16/8/0 | 44/16/1 | 79/26/3 | 114/36/5 | 149/46/8 | 204/81/8 | 259/116/8 | Não Levanta |
| Atirador | comum | 7 | 16/8/0 | 40/20/1 | 70/35/3 | 100/50/5 | 130/65/8 | 185/100/8 | 240/135/8 | Um Só Disparo |
| Médico | comum | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Guardião | comum | 7 | 16/8/0 | 44/16/1 | 79/26/3 | 114/36/5 | 149/46/8 | 204/81/8 | 259/116/8 | nenhum |
| Caçador | comum | 7 | 16/8/0 | 40/20/1 | 70/35/3 | 100/50/5 | 130/65/8 | 185/100/8 | 240/135/8 | nenhum |
| Engenheiro | comum | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Alquimista | comum | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Comerciante | comum | 7 | 16/8/0 | 40/20/1 | 70/35/3 | 100/50/5 | 130/65/8 | 185/100/8 | 240/135/8 | nenhum |
| Campeão Dimensional | especial | 7 | 16/8/0 | 44/16/1 | 79/26/3 | 114/36/5 | 149/46/8 | 204/81/8 | 259/116/8 | Marcha |
| Pirata Amaldiçoado | especial | 7 | 16/8/0 | 40/20/1 | 70/35/3 | 100/50/5 | 130/65/8 | 185/100/8 | 240/135/8 | nenhum |
| Cartista Arcano | especial | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | Morte |
| Guia Dimensional | especial | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Caçador de Entidades | especial | 7 | 16/8/0 | 40/20/1 | 70/35/3 | 100/50/5 | 130/65/8 | 185/100/8 | 240/135/8 | nenhum |
| Escritor de Contos | especial | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Invocador | especial | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Viajante | especial | 7 | 16/8/0 | 40/20/1 | 70/35/3 | 100/50/5 | 130/65/8 | 185/100/8 | 240/135/8 | nenhum |
| Decodificador | especial | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Codificador | especial | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Canalizador | comum | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Sintonizador | comum | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Ritualista | comum | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | Âncora Ritual |
| Interceptador | especial | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |

## Maiores danos do arsenal

| Arma | Raridade | Dano | Média normal | Média com crítico | Nível recomendado | Mestre |
|---|---|---|---:|---:|---:|---|
| Excalibur | reliquia da criacao | 8d12+20 | 72.0 | 82.8 | 35 | sim |
| Mjolnir | reliquia da criacao | 8d12+18 | 70.0 | 80.5 | 35 | sim |
| Martelo das Chamas | reliquia da criacao | 8d12+16 | 68.0 | 78.2 | 35 | sim |
| Murasame | reliquia da criacao | 8d12+16 | 68.0 | 71.4 | 35 | sim |
| Gungnir | reliquia da criacao | 8d12+14 | 66.0 | 75.9 | 35 | sim |
| Masamune | reliquia da criacao | 10d10+10 | 65.0 | 74.8 | 35 | sim |
| Rhaast | reliquia da criacao | 8d12+12 | 64.0 | 73.6 | 35 | sim |
| Triceratops | reliquia da criacao | 10d10+8 | 63.0 | 72.4 | 35 | sim |
| Zangetsu | reliquia da criacao | 8d12+10 | 62.0 | 71.3 | 35 | sim |
| Bazuca | lendario | 10d8+4d4 | 55.0 | 60.5 | 25 | sim |
| Excalibur | lendario | 6d10+12 | 45.0 | 51.7 | 25 | sim |
| Mjölnir | lendario | 6d10+12 | 45.0 | 51.7 | 25 | sim |
| Martelo das Chamas | lendario | 6d10+10 | 43.0 | 49.4 | 25 | sim |
| Masamune | lendario | 6d10+10 | 43.0 | 49.4 | 25 | sim |
| Rhaast | lendario | 5d12+10 | 42.5 | 48.9 | 25 | sim |

## Magias publicadas para playtest

- 352 magias analisadas.
- 0 magias fora do custo, teto de dano, crítico ou acesso ritual.

| Magia | Círculo | Perfil | Mana | Dano | Média | Alertas |
|---|---:|---|---:|---|---:|---|
| Centelha de Possibilidade | 1 | alvo | 2 | sem dano | n/a | nenhum |
| Recomeço Instintivo | 1 | alvo | 2 | sem dano | n/a | nenhum |
| Forma Nascente | 1 | controle | 2 | sem dano | n/a | nenhum |
| Leitura Essencial | 1 | alvo | 2 | sem dano | n/a | nenhum |
| Lâmina da Verdade | 1 | alvo | 2 | 1d8 + Mod. Fluxo | 4.5 | nenhum |
| Âncora de Identidade | 1 | defesa | 2 | sem dano | n/a | nenhum |
| Fio Prateado | 1 | controle | 2 | sem dano | n/a | nenhum |
| Acordo Breve | 1 | alvo | 2 | sem dano | n/a | nenhum |
| Ruído de Canal | 1 | alvo | 2 | 1d8 | 4.5 | nenhum |
| Pulso Regenerador | 1 | alvo | 2 | sem dano | n/a | nenhum |
| Esporo Febril | 1 | alvo | 2 | 1d8 + Mod. Fluxo | 4.5 | nenhum |
| Raízes Famintas | 1 | area | 2 | sem dano | n/a | nenhum |
| Propriedade Errante | 1 | alvo | 2 | sem dano | n/a | nenhum |
| Rajada Improvável | 1 | alvo | 2 | 1d6 + Mod. Fluxo | 3.5 | nenhum |
| Troca Repentina | 1 | movimento | 2 | sem dano | n/a | nenhum |
| Impacto Elemental | 1 | alvo | 2 | 1d10 + Mod. Fluxo | 5.5 | nenhum |
| Escudo Material | 1 | defesa | 2 | sem dano | n/a | nenhum |
| Moldar Elemento | 1 | controle | 2 | sem dano | n/a | nenhum |
| Salto Curto | 1 | movimento | 2 | sem dano | n/a | nenhum |
| Distância Hostil | 1 | alvo | 2 | sem dano | n/a | nenhum |
| Dobra Protetora | 1 | defesa | 2 | sem dano | n/a | nenhum |
| Passo Adiantado | 1 | movimento | 2 | sem dano | n/a | nenhum |
| Atraso de Instante | 1 | alvo | 2 | sem dano | n/a | nenhum |
| Suspensão Breve | 1 | controle | 2 | sem dano | n/a | nenhum |
| Toque Nulo | 1 | alvo | 2 | 1d10 + Mod. Fluxo | 5.5 | nenhum |
| Ausência Sonora | 1 | area | 2 | sem dano | n/a | nenhum |
| Lacuna de Sensação | 1 | defesa | 2 | sem dano | n/a | nenhum |
| Último Ponto | 1 | alvo | 2 | 1d10 + Mod. Fluxo | 5.5 | nenhum |
| Encerrar Impulso | 1 | alvo | 2 | sem dano | n/a | nenhum |
| Ponto Final | 1 | controle | 2 | sem dano | n/a | nenhum |
| Varredura de Padrão | 1 | alvo | 2 | sem dano | n/a | nenhum |
| Pulso de Interferência | 1 | alvo | 2 | 1d8 + Mod. Fluxo | 4.5 | nenhum |
| Rotina Assistida | 1 | alvo | 2 | sem dano | n/a | nenhum |
| Toque do Fluxo | 1 | alvo | 2 | 1d10 + Mod. Fluxo | 5.5 | nenhum |
| Sinal do Fluxo | 1 | controle | 2 | sem dano | n/a | nenhum |
| Broto Rompente | 2 | alvo | 4 | 2d8 + Mod. Fluxo | 9.0 | nenhum |
| Serviçal Germinado | 2 | controle | 4 | sem dano | n/a | nenhum |
| Broto de Vigor | 2 | alvo | 4 | sem dano | n/a | nenhum |
| Verdade Cortante | 2 | alvo | 4 | 2d8 + Mod. Fluxo | 9.0 | nenhum |
| Dissipar Falsidade | 2 | controle | 4 | sem dano | n/a | nenhum |
| Olho da Natureza | 2 | alvo | 4 | sem dano | n/a | nenhum |
| Estática Mental | 2 | alvo | 4 | 2d8 | 9.0 | nenhum |
| Voz Emprestada | 2 | controle | 4 | sem dano | n/a | nenhum |
| Rede de Sinais | 2 | area | 4 | sem dano | n/a | nenhum |
| Praga Menor | 2 | alvo | 4 | 2d8 + Mod. Fluxo | 9.0 | nenhum |
| Crescer Desmedido | 2 | controle | 4 | sem dano | n/a | nenhum |
| Mão Curativa | 2 | alvo | 4 | sem dano | n/a | nenhum |
| Golpe Instável | 2 | alvo | 4 | 2d8 + Mod. Fluxo | 9.0 | nenhum |
| Sorte Trocada | 2 | alvo | 4 | sem dano | n/a | nenhum |
| Mutação Passageira | 2 | alvo | 4 | sem dano | n/a | nenhum |
| Rajada Elemental | 2 | alvo | 4 | 2d8 + Mod. Fluxo | 9.0 | nenhum |
| Muralha Menor | 2 | controle | 4 | sem dano | n/a | nenhum |
| Armadura de Matéria | 2 | defesa | 4 | sem dano | n/a | nenhum |
| Fenda Cortante | 2 | alvo | 4 | 2d8 + Mod. Fluxo | 9.0 | nenhum |
| Passo Longo | 2 | movimento | 4 | sem dano | n/a | nenhum |
| Fronteira Menor | 2 | controle | 4 | sem dano | n/a | nenhum |
| Peso das Horas | 2 | alvo | 4 | 2d8 + Mod. Fluxo | 9.0 | nenhum |
| Aceleração Menor | 2 | alvo | 4 | sem dano | n/a | nenhum |
| Conservar | 2 | controle | 4 | sem dano | n/a | nenhum |
| Mordida do Nada | 2 | alvo | 4 | 2d8 + Mod. Fluxo | 9.0 | nenhum |
| Apagar Presença | 2 | defesa | 4 | sem dano | n/a | nenhum |
| Sumidouro Menor | 2 | defesa | 4 | sem dano | n/a | nenhum |
| Ferida Terminal | 2 | alvo | 4 | 2d8 + Mod. Fluxo | 9.0 | nenhum |
| Encerrar Efeito Menor | 2 | controle | 4 | sem dano | n/a | nenhum |
| Marca do Limiar | 2 | alvo | 4 | sem dano | n/a | nenhum |
| Descarga de Sistema | 2 | alvo | 4 | 2d8 + Mod. Fluxo | 9.0 | nenhum |
| Interceptar Comando | 2 | controle | 4 | sem dano | n/a | nenhum |
| Rotina Automatizada | 2 | controle | 4 | sem dano | n/a | nenhum |
| Escudo de Fluxo | 2 | defesa | 4 | sem dano | n/a | nenhum |
| Passo Rápido | 2 | movimento | 4 | sem dano | n/a | nenhum |
| Campo Germinal | 3 | area | 7 | 3d6 | 10.5 | nenhum |
| Gênese Menor | 3 | controle | 7 | sem dano | n/a | nenhum |
| Laço de Ajuda | 3 | alvo | 7 | sem dano | n/a | nenhum |
| Julgamento Essencial | 3 | alvo | 7 | 3d8 + Mod. Fluxo | 13.5 | nenhum |
| Anular Aparência | 3 | area | 7 | sem dano | n/a | nenhum |
| Sinceridade Compelida | 3 | alvo | 7 | sem dano | n/a | nenhum |
| Grito Dissonante | 3 | area | 7 | 3d6 | 10.5 | nenhum |
| Interceptar Mensagem | 3 | controle | 7 | sem dano | n/a | nenhum |
| Comando Combinado | 3 | alvo | 7 | sem dano | n/a | nenhum |
| Sopro Pestilento | 3 | area | 7 | 3d6 | 10.5 | nenhum |
| Metabolismo Alterado | 3 | alvo | 7 | sem dano | n/a | nenhum |
| Regeneração Contínua | 3 | alvo | 7 | sem dano | n/a | nenhum |
| Onda Caótica | 3 | area | 7 | 3d6 | 10.5 | nenhum |
| Embaralhar Resultado | 3 | alvo | 7 | sem dano | n/a | nenhum |
| Transmutar Matéria | 3 | controle | 7 | sem dano | n/a | nenhum |
| Explosão Elemental | 3 | area | 7 | 3d6 | 10.5 | nenhum |
| Mão de Força | 3 | alvo | 7 | sem dano | n/a | nenhum |
| Muralha Elemental | 3 | controle | 7 | sem dano | n/a | nenhum |
| Dobra Esmagadora | 3 | area | 7 | 3d6 | 10.5 | nenhum |
| Portal Curto | 3 | movimento | 7 | sem dano | n/a | nenhum |
| Distância Roubada | 3 | area | 7 | sem dano | n/a | nenhum |
| Campo Lento | 3 | area | 7 | 3d6 | 10.5 | nenhum |
| Antecipar | 3 | alvo | 7 | sem dano | n/a | nenhum |
| Eco Curto | 3 | alvo | 7 | sem dano | n/a | nenhum |
| Onda de Ausência | 3 | area | 7 | 3d6 | 10.5 | nenhum |
| Consumir Energia | 3 | alvo | 7 | sem dano | n/a | nenhum |
| Nada Pessoal | 3 | defesa | 7 | sem dano | n/a | nenhum |
| Véu do Nada | 3 | defesa | 7 | sem dano | n/a | nenhum |
| Sopro do Limiar | 3 | area | 7 | 3d6 | 10.5 | nenhum |
| Romper Vínculo | 3 | alvo | 7 | sem dano | n/a | nenhum |
| Deterioração | 3 | alvo | 7 | sem dano | n/a | nenhum |
| Sobrecarga em Cadeia | 3 | area | 7 | 3d6 | 10.5 | nenhum |
| Firewall | 3 | defesa | 7 | sem dano | n/a | nenhum |
| Registrar Padrão | 3 | controle | 7 | sem dano | n/a | nenhum |
| Marca de Caça | 3 | alvo | 7 | sem dano | n/a | nenhum |
| Sopro do Fluxo | 3 | area | 7 | 3d6 | 10.5 | nenhum |
| Lança do Primeiro Broto | 4 | alvo | 10 | 4d8 + Mod. Fluxo | 18.0 | nenhum |
| Ninhada Nascente | 4 | controle | 10 | sem dano | n/a | nenhum |
| Renascer da Ferida | 4 | alvo | 10 | sem dano | n/a | nenhum |
| Lâmina do Que É | 4 | alvo | 10 | 4d8 + Mod. Fluxo | 18.0 | nenhum |
| Revelação de Corrupção | 4 | area | 10 | sem dano | n/a | nenhum |
| Âncora Maior de Identidade | 4 | area | 10 | sem dano | n/a | nenhum |
| Sobrecarga de Canal | 4 | alvo | 10 | 4d8 | 18.0 | nenhum |
| Elo de Sentidos | 4 | alvo | 10 | sem dano | n/a | nenhum |
| Pacto Vinculante | 4 | controle | 10 | sem dano | n/a | nenhum |
| Corrosão Sanguínea | 4 | alvo | 10 | 4d8 + Mod. Fluxo | 18.0 | nenhum |
| Domínio da Carne | 4 | alvo | 10 | sem dano | n/a | nenhum |
| Purificar Corpo | 4 | alvo | 10 | sem dano | n/a | nenhum |
| Lança do Acaso | 4 | alvo | 10 | 4d8 + Mod. Fluxo | 18.0 | nenhum |
| Instabilidade Corporal | 4 | alvo | 10 | sem dano | n/a | nenhum |
| Roleta de Fluxo | 4 | alvo | 10 | sem dano | n/a | nenhum |
| Lança Elemental | 4 | alvo | 10 | 4d8 + Mod. Fluxo | 18.0 | nenhum |
| Terremoto Menor | 4 | area | 10 | 4d6 | 14.0 | nenhum |
| Pele de Aço | 4 | defesa | 10 | sem dano | n/a | nenhum |
| Lâmina Dimensional | 4 | alvo | 10 | 4d8 + Mod. Fluxo | 18.0 | nenhum |
| Prisão de Fronteira | 4 | alvo | 10 | sem dano | n/a | nenhum |
| Salto Coletivo | 4 | movimento | 10 | sem dano | n/a | nenhum |
| Desgaste Acelerado | 4 | alvo | 10 | 4d8 + Mod. Fluxo | 18.0 | nenhum |
| Aceleração | 4 | alvo | 10 | sem dano | n/a | nenhum |
| Parada de Instante | 4 | alvo | 10 | sem dano | n/a | nenhum |
| Corte Nulo | 4 | alvo | 10 | 4d8 + Mod. Fluxo | 18.0 | nenhum |
| Apagar Vestígios | 4 | controle | 10 | sem dano | n/a | nenhum |
| Bolha de Ausência | 4 | area | 10 | sem dano | n/a | nenhum |
| Golpe Terminal | 4 | alvo | 10 | 4d8 + Mod. Fluxo | 18.0 | nenhum |
| Fechar Ciclo | 4 | alvo | 10 | sem dano | n/a | nenhum |
| Desgaste Fatal | 4 | alvo | 10 | sem dano | n/a | nenhum |
| Lança de Íons | 4 | alvo | 10 | 4d8 + Mod. Fluxo | 18.0 | nenhum |
| Interceptação Ativa | 4 | defesa | 10 | sem dano | n/a | nenhum |
| Autômato Assistente | 4 | controle | 10 | sem dano | n/a | nenhum |
| Arma de Fluxo | 4 | alvo | 10 | 4d8 + Mod. Fluxo | 18.0 | nenhum |
| Muralha de Fluxo | 4 | controle | 10 | sem dano | n/a | nenhum |
| Eclosão | 5 | area | 14 | 5d6 | 17.5 | nenhum |
| Segunda Chance | 5 | alvo | 14 | sem dano | n/a | nenhum |
| Jardim Nascente | 5 | area | 14 | sem dano | n/a | nenhum |
| Fixar Forma | 5 | alvo | 14 | 5d8 + Mod. Fluxo | 22.5 | nenhum |
| Desmascarar | 5 | area | 14 | sem dano | n/a | nenhum |
| Custódia da Alma | 5 | alvo | 14 | sem dano | n/a | nenhum |
| Coro Dissonante | 5 | area | 14 | 5d6 | 17.5 | nenhum |
| Silenciar Rede | 5 | area | 14 | sem dano | n/a | nenhum |
| Concordância | 5 | area | 14 | sem dano | n/a | nenhum |
| Peste Ramificada | 5 | area | 14 | 5d6 | 17.5 | nenhum |
| Forma Bestial | 5 | alvo | 14 | sem dano | n/a | nenhum |
| Fôlego de Vida | 5 | area | 14 | sem dano | n/a | nenhum |
| Vórtice Menor | 5 | area | 14 | 5d6 | 17.5 | nenhum |
| Troca de Propriedades | 5 | alvo | 14 | sem dano | n/a | nenhum |
| Salto Improvável | 5 | movimento | 14 | sem dano | n/a | nenhum |
| Torrente dos Sete Salões | 5 | area | 14 | 5d6 | 17.5 | nenhum |
| Peso do Mundo | 5 | alvo | 14 | sem dano | n/a | nenhum |
| Baluarte | 5 | area | 14 | sem dano | n/a | nenhum |
| Colapso Espacial | 5 | area | 14 | 5d6 | 17.5 | nenhum |
| Selar Fronteira | 5 | area | 14 | sem dano | n/a | nenhum |
| Passo Entre Lugares | 5 | movimento | 14 | sem dano | n/a | nenhum |
| Erosão do Momento | 5 | area | 14 | 5d6 | 17.5 | nenhum |
| Adiantar o Golpe | 5 | controle | 14 | sem dano | n/a | nenhum |
| Conservação Maior | 5 | alvo | 14 | sem dano | n/a | nenhum |
| Colapso do Nada | 5 | area | 14 | 5d6 | 17.5 | nenhum |
| Devorar Magia | 5 | defesa | 14 | sem dano | n/a | nenhum |
| Ausência de Si | 5 | defesa | 14 | sem dano | n/a | nenhum |
| Onda do Fim | 5 | area | 14 | 5d6 | 17.5 | nenhum |
| Selo do Término | 5 | alvo | 14 | sem dano | n/a | nenhum |
| Última Palavra | 5 | alvo | 14 | sem dano | n/a | nenhum |
| Detonação de Núcleo | 5 | area | 14 | 5d6 | 17.5 | nenhum |
| Bloqueio de Fluxo | 5 | alvo | 14 | sem dano | n/a | nenhum |
| Rede A.X.I.S | 5 | area | 14 | sem dano | n/a | nenhum |
| Campo do Fluxo | 5 | area | 14 | sem dano | n/a | nenhum |
| Elo de Fluxo | 5 | alvo | 14 | sem dano | n/a | nenhum |
| Semente Voraz | 6 | alvo | 19 | 6d8 + Mod. Fluxo | 27.0 | nenhum |
| Guardião Germinado | 6 | controle | 19 | sem dano | n/a | nenhum |
| Alvorada do Vínculo | 6 | area | 19 | sem dano | n/a | nenhum |
| Verdade Que Fere | 6 | alvo | 19 | 6d8 + Mod. Fluxo | 27.0 | nenhum |
| Campo Verídico | 6 | area | 19 | sem dano | n/a | nenhum |
| Leitura Profunda | 6 | alvo | 19 | sem dano | n/a | nenhum |
| Cascata de Ruído | 6 | alvo | 19 | 6d8 | 27.0 | nenhum |
| Espelho de Sentidos | 6 | area | 19 | sem dano | n/a | nenhum |
| Testemunha Distante | 6 | controle | 19 | sem dano | n/a | nenhum |
| Necrose Fulminante | 6 | alvo | 19 | 6d8 + Mod. Fluxo | 27.0 | nenhum |
| Vigor Desmedido | 6 | area | 19 | sem dano | n/a | nenhum |
| Restaurar Carne | 6 | alvo | 19 | sem dano | n/a | nenhum |
| Colapso Aleatório | 6 | alvo | 19 | 6d8 + Mod. Fluxo | 27.0 | nenhum |
| Campo de Inconstância | 6 | area | 19 | sem dano | n/a | nenhum |
| Mutabilidade | 6 | defesa | 19 | sem dano | n/a | nenhum |
| Aríete Elemental | 6 | alvo | 19 | 6d8 + Mod. Fluxo | 27.0 | nenhum |
| Erupção | 6 | area | 19 | 6d6 | 21.0 | nenhum |
| Forma Elemental | 6 | defesa | 19 | sem dano | n/a | nenhum |
| Corte de Distância | 6 | alvo | 19 | 6d8 + Mod. Fluxo | 27.0 | nenhum |
| Labirinto Dobrado | 6 | area | 19 | sem dano | n/a | nenhum |
| Refúgio de Bolso | 6 | controle | 19 | sem dano | n/a | nenhum |
| Séculos em Um Golpe | 6 | alvo | 19 | 6d8 + Mod. Fluxo | 27.0 | nenhum |
| Zona Acelerada | 6 | area | 19 | sem dano | n/a | nenhum |
| Eco de Batalha | 6 | alvo | 19 | sem dano | n/a | nenhum |
| Fome do Abismo | 6 | alvo | 19 | 6d8 + Mod. Fluxo | 27.0 | nenhum |
| Silêncio Total | 6 | area | 19 | sem dano | n/a | nenhum |
| Apagar do Mapa | 6 | alvo | 19 | sem dano | n/a | nenhum |
| Golpe Mortal | 6 | alvo | 19 | 6d8 + Mod. Fluxo | 27.0 | nenhum |
| Encerramento Maior | 6 | area | 19 | sem dano | n/a | nenhum |
| Separar Vínculos | 6 | area | 19 | sem dano | n/a | nenhum |
| Feixe Perfurante | 6 | alvo | 19 | 6d8 + Mod. Fluxo | 27.0 | nenhum |
| Contramedida Total | 6 | area | 19 | sem dano | n/a | nenhum |
| Reprodução Limitada | 6 | controle | 19 | sem dano | n/a | nenhum |
| Clone de Fluxo | 6 | controle | 19 | sem dano | n/a | nenhum |
| Erupção do Fluxo | 6 | area | 19 | 6d6 | 21.0 | nenhum |
| Floresta Insurgente | 7 | area | 25 | 7d6 | 24.5 | nenhum |
| Origem Emprestada | 7 | alvo | 25 | sem dano | n/a | nenhum |
| Reinício do Corpo | 7 | alvo | 25 | sem dano | n/a | nenhum |
| Corte Dissipador | 7 | alvo | 25 | 7d8 + Mod. Fluxo | 31.5 | nenhum |
| Selo da Essência | 7 | alvo | 25 | sem dano | n/a | nenhum |
| Verdade Compartilhada | 7 | area | 25 | sem dano | n/a | nenhum |
| Grito Mental | 7 | alvo | 25 | 7d8 | 31.5 | nenhum |
| Rede de Guerra | 7 | area | 25 | sem dano | n/a | nenhum |
| Mediação Imposta | 7 | area | 25 | sem dano | n/a | nenhum |
| Chuva de Esporos | 7 | area | 25 | 7d6 | 24.5 | nenhum |
| Reescrever o Corpo | 7 | alvo | 25 | sem dano | n/a | nenhum |
| Coração Incansável | 7 | area | 25 | sem dano | n/a | nenhum |
| Tempestade Vórtice | 7 | area | 25 | 7d6 | 24.5 | nenhum |
| Reescrita Instável | 7 | alvo | 25 | sem dano | n/a | nenhum |
| Sorte Roubada | 7 | alvo | 25 | sem dano | n/a | nenhum |
| Cataclismo Menor | 7 | area | 25 | 7d6 | 24.5 | nenhum |
| Controle de Massa | 7 | controle | 25 | sem dano | n/a | nenhum |
| Fortaleza Instantânea | 7 | controle | 25 | sem dano | n/a | nenhum |
| Implosão Dimensional | 7 | area | 25 | 7d6 | 24.5 | nenhum |
| Portal Maior | 7 | movimento | 25 | sem dano | n/a | nenhum |
| Passo Constante | 7 | area | 25 | sem dano | n/a | nenhum |
| Roubar Turno | 7 | alvo | 25 | 7d8 + Mod. Fluxo | 31.5 | nenhum |
| Domínio do Ritmo | 7 | area | 25 | sem dano | n/a | nenhum |
| Antecipação Tática | 7 | area | 25 | sem dano | n/a | nenhum |
| Anular Magia | 7 | alvo | 25 | 7d8 + Mod. Fluxo | 31.5 | nenhum |
| Zona de Consumo | 7 | area | 25 | sem dano | n/a | nenhum |
| Escudo do Vazio | 7 | defesa | 25 | sem dano | n/a | nenhum |
| Colheita | 7 | alvo | 25 | 7d8 + Mod. Fluxo | 31.5 | nenhum |
| Zona de Deterioração | 7 | area | 25 | 7d6 | 24.5 | nenhum |
| Limiar Guardião | 7 | area | 25 | sem dano | n/a | nenhum |
| Salva de Precisão | 7 | area | 25 | 7d6 | 24.5 | nenhum |
| Domínio de Sistemas | 7 | area | 25 | sem dano | n/a | nenhum |
| Blindagem Adaptativa | 7 | area | 25 | sem dano | n/a | nenhum |
| Forma de Fluxo | 7 | defesa | 25 | sem dano | n/a | nenhum |
| Território do Fluxo | 7 | area | 25 | sem dano | n/a | nenhum |
| Golpe Inédito | 8 | alvo | 32 | 8d8 + Mod. Fluxo | 36.0 | nenhum |
| Ecossistema Convocado | 8 | area | 32 | sem dano | n/a | nenhum |
| Ressurgir | 8 | alvo | 32 | sem dano | n/a | nenhum |
| Quebrar Defesas | 8 | alvo | 32 | 8d8 + Mod. Fluxo | 36.0 | nenhum |
| Dissipação Verídica | 8 | area | 32 | sem dano | n/a | nenhum |
| Ancorar o Real | 8 | area | 32 | sem dano | n/a | nenhum |
| Ruína de Sinal | 8 | alvo | 32 | 8d8 | 36.0 | nenhum |
| Malha de Consciências | 8 | area | 32 | sem dano | n/a | nenhum |
| Convocação de Vozes | 8 | controle | 32 | sem dano | n/a | nenhum |
| Praga Devoradora | 8 | alvo | 32 | 8d8 + Mod. Fluxo | 36.0 | nenhum |
| Grande Crescimento | 8 | area | 32 | sem dano | n/a | nenhum |
| Imunidade Vital | 8 | area | 32 | sem dano | n/a | nenhum |
| Detonação Improvável | 8 | alvo | 32 | 8d8 + Mod. Fluxo | 36.0 | nenhum |
| Lei Suspensa | 8 | area | 32 | sem dano | n/a | nenhum |
| Corpo Inconstante | 8 | defesa | 32 | sem dano | n/a | nenhum |
| Julgamento dos Elementos | 8 | alvo | 32 | 8d8 + Mod. Fluxo | 36.0 | nenhum |
| Tempestade Elemental | 8 | area | 32 | 8d6 | 28.0 | nenhum |
| Corpo Inquebrável | 8 | defesa | 32 | sem dano | n/a | nenhum |
| Banimento | 8 | alvo | 32 | 8d8 + Mod. Fluxo | 36.0 | nenhum |
| Fronteira Selada | 8 | area | 32 | sem dano | n/a | nenhum |
| Dobra de Exército | 8 | movimento | 32 | sem dano | n/a | nenhum |
| Colapso Temporal | 8 | alvo | 32 | 8d8 + Mod. Fluxo | 36.0 | nenhum |
| Estase de Campo | 8 | area | 32 | sem dano | n/a | nenhum |
| Tempo Emprestado | 8 | controle | 32 | sem dano | n/a | nenhum |
| Aniquilação Parcial | 8 | alvo | 32 | 8d8 + Mod. Fluxo | 36.0 | nenhum |
| Apagar Efeito | 8 | controle | 32 | sem dano | n/a | nenhum |
| Manto de Não-Ser | 8 | area | 32 | sem dano | n/a | nenhum |
| Ponto de Não Retorno | 8 | alvo | 32 | 8d8 + Mod. Fluxo | 36.0 | nenhum |
| Fim do Encantamento | 8 | area | 32 | sem dano | n/a | nenhum |
| Conduzir ao Término | 8 | alvo | 32 | sem dano | n/a | nenhum |
| Aniquilador de Padrões | 8 | alvo | 32 | 8d8 + Mod. Fluxo | 36.0 | nenhum |
| Jaula de Interferência | 8 | area | 32 | sem dano | n/a | nenhum |
| Fábrica de Campo | 8 | controle | 32 | sem dano | n/a | nenhum |
| Represália | 8 | alvo | 32 | 8d8 + Mod. Fluxo | 36.0 | nenhum |
| Convocação do Fluxo | 8 | controle | 32 | sem dano | n/a | nenhum |
| Primavera Devastadora | 9 | area | 42 | 9d6 | 31.5 | nenhum |
| Linhagem Nascente | 9 | controle | 42 | sem dano | n/a | nenhum |
| Bênção da Espécie | 9 | area | 42 | sem dano | n/a | nenhum |
| Nome Verdadeiro | 9 | alvo | 42 | 9d8 + Mod. Fluxo | 40.5 | nenhum |
| Revelação do Mundo | 9 | area | 42 | sem dano | n/a | nenhum |
| Guarda Inviolável | 9 | area | 42 | sem dano | n/a | nenhum |
| Tempestade de Vozes | 9 | area | 42 | 9d6 | 31.5 | nenhum |
| Decreto Registrado | 9 | controle | 42 | sem dano | n/a | nenhum |
| Sentidos Ampliados | 9 | area | 42 | sem dano | n/a | nenhum |
| Pandemia | 9 | area | 42 | 9d6 | 31.5 | nenhum |
| Refazer a Espécie | 9 | area | 42 | sem dano | n/a | nenhum |
| Sopro de Anima | 9 | area | 42 | sem dano | n/a | nenhum |
| Ciclone dos Possíveis | 9 | area | 42 | 9d6 | 31.5 | nenhum |
| Transmutação Maior | 9 | controle | 42 | sem dano | n/a | nenhum |
| Reviravolta | 9 | controle | 42 | sem dano | n/a | nenhum |
| Fúria dos Elementos | 9 | area | 42 | 9d6 | 31.5 | nenhum |
| Domínio dos Sete | 9 | area | 42 | sem dano | n/a | nenhum |
| Muralha do Baluarte | 9 | controle | 42 | sem dano | n/a | nenhum |
| Ruptura Espacial | 9 | area | 42 | 9d6 | 31.5 | nenhum |
| Domínio da Matriz | 9 | area | 42 | sem dano | n/a | nenhum |
| Santuário Fora do Mundo | 9 | controle | 42 | sem dano | n/a | nenhum |
| Passo de Órbita | 9 | movimento | 42 | sem dano | n/a | nenhum |
| Erosão de Éon | 9 | area | 42 | 9d6 | 31.5 | nenhum |
| Congelar o Instante | 9 | area | 42 | sem dano | n/a | nenhum |
| Restaurar o Estado | 9 | alvo | 42 | sem dano | n/a | nenhum |
| Buraco Negro | 9 | area | 42 | 9d6 | 31.5 | nenhum |
| Silenciar Fluxo | 9 | area | 42 | sem dano | n/a | nenhum |
| Ausência Regional | 9 | area | 42 | sem dano | n/a | nenhum |
| Ceifa | 9 | area | 42 | 9d6 | 31.5 | nenhum |
| Término Regional | 9 | area | 42 | sem dano | n/a | nenhum |
| Limiar Selado | 9 | area | 42 | sem dano | n/a | nenhum |
| Tempestade de Íons | 9 | area | 42 | 9d6 | 31.5 | nenhum |
| Interceptação Regional | 9 | area | 42 | sem dano | n/a | nenhum |
| Núcleo de Comando | 9 | area | 42 | sem dano | n/a | nenhum |
| Avatar do Fluxo | 9 | defesa | 42 | sem dano | n/a | nenhum |
| Lei do Fluxo | 9 | area | 42 | sem dano | n/a | nenhum |
| Semente Explosiva | 10 | alvo | 55 | 10d10 + Mod. Fluxo | 55.0 | nenhum |
| Gênese | 10 | controle | 55 | sem dano | n/a | nenhum |
| Renascer | 10 | alvo | 55 | sem dano | n/a | nenhum |
| Verdade Nua | 10 | alvo | 55 | 10d10 + Mod. Fluxo | 55.0 | nenhum |
| Alétheia | 10 | controle | 55 | sem dano | n/a | nenhum |
| Âncora do Ser | 10 | controle | 55 | sem dano | n/a | nenhum |
| Cortar Vínculos | 10 | alvo | 55 | 10d10 | 55.0 | nenhum |
| Concílio do Mundo | 10 | controle | 55 | sem dano | n/a | nenhum |
| Pacto Inquebrantável | 10 | controle | 55 | sem dano | n/a | nenhum |
| Colapso Biológico | 10 | alvo | 55 | 10d10 + Mod. Fluxo | 55.0 | nenhum |
| Éden | 10 | area | 55 | sem dano | n/a | nenhum |
| Ciclo Perfeito | 10 | alvo | 55 | sem dano | n/a | nenhum |
| Desfazer Padrão | 10 | alvo | 55 | 10d10 + Mod. Fluxo | 55.0 | nenhum |
| Mundo Instável | 10 | area | 55 | sem dano | n/a | nenhum |
| Virar o Jogo | 10 | controle | 55 | sem dano | n/a | nenhum |
| Impacto Colossal | 10 | alvo | 55 | 10d10 + Mod. Fluxo | 55.0 | nenhum |
| Reformar o Terreno | 10 | controle | 55 | sem dano | n/a | nenhum |
| Égide de Moros | 10 | area | 55 | sem dano | n/a | nenhum |
| Exílio | 10 | alvo | 55 | 10d10 + Mod. Fluxo | 55.0 | nenhum |
| Reescrever Distâncias | 10 | area | 55 | sem dano | n/a | nenhum |
| Portal Permanente | 10 | movimento | 55 | sem dano | n/a | nenhum |
| Exílio Temporal | 10 | alvo | 55 | 10d10 + Mod. Fluxo | 55.0 | nenhum |
| Parada do Mundo | 10 | area | 55 | sem dano | n/a | nenhum |
| Estase | 10 | controle | 55 | sem dano | n/a | nenhum |
| Toque do Abismo | 10 | alvo | 55 | 10d10 + Mod. Fluxo | 55.0 | nenhum |
| Apagar do Mundo | 10 | controle | 55 | sem dano | n/a | nenhum |
| Zona Morta | 10 | area | 55 | sem dano | n/a | nenhum |
| Palavra de Morte | 10 | alvo | 55 | 10d10 + Mod. Fluxo | 55.0 | nenhum |
| Fim de Todos os Ciclos | 10 | area | 55 | sem dano | n/a | nenhum |
| Encerramento | 10 | controle | 55 | sem dano | n/a | nenhum |
| Formatar | 10 | alvo | 55 | 10d10 + Mod. Fluxo | 55.0 | nenhum |
| Reprogramar Região | 10 | area | 55 | sem dano | n/a | nenhum |
| Reprodução Total | 10 | controle | 55 | sem dano | n/a | nenhum |
| Singularidade | 10 | area | 55 | 10d8 | 45.0 | nenhum |
| Ordem do Mundo | 10 | controle | 55 | sem dano | n/a | nenhum |

## Interpretação

O orçamento estrutural das classes está fechado. Alertas qualitativos indicam efeitos que alteram economia de ações ou escala e precisam de cenários de mesa. Armas lendárias normalizadas começam no nível 25; relíquias da criação no 35 e exigem autorização do Mestre.
