-- 0020 — só gerar a notificação de "pior palpite" na TRANSIÇÃO pra encerrado.
--
-- Bug: o cron re-marca jogos de grupos como 'finished' a cada execução. Sem
-- guarda, o gatilho recriava as notificações apagadas (o ON CONFLICT só evita
-- duplicar enquanto a linha existe). Com a guarda de "old distinct from new",
-- ele só dispara quando o status/placar realmente muda — uma vez por encerramento.

create or replace function notify_worst_on_finish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  home_code text;
  away_code text;
  jabs_zero text[] := array[
    'ZERO. Você foi o bagre da rodada, nada de braçada 🐟🫏',
    'Não acertou NADA. Falta QI pra esse palpite, hein 🧠🫏',
    'Tão ruinzinho que chega dá dó de você 😔🫏',
    'Coitado, tá todo perdidinho e ainda zerou 🧭🫏',
    'Sem técnica, sem sorte, sem nada: ZERO 🫏',
    'Você palpita como quem nunca viu uma bola na vida 🫏',
    'Zerou geral. Devolve o cérebro, não usa mesmo 🧠🫏',
    'Esse nível de ruim merecia ser estudado pela ciência 🔬🫏',
    'Você é ruim até pra ser ruim. Zerou com louvor 🫏',
    'Big ZERO. Já pensou em parar? Pelo bem de todos 🫏',
    'Tá todo perdidinho, nem o GPS te acha 🛰️🫏',
    'NADA. Sua única habilidade é decepcionar 🫏',
    'O bagre-mor da rodada, afogado em 0 ponto 🐟🫏',
    'Zerou. Chuta com a canela da próxima, vai que 🦵🫏',
    'Você conseguiu não acertar nem por acidente 🎯🫏',
    'Nota da rodada: ZERO. Reprovado e humilhado 📝🫏',
    'Burro com sorte ainda acerta. Você nem isso 🫏',
    'Tá todo perdidinho no futebol, pede um mapa 🗺️🫏',
    'Zerada vergonhosa. Esconde a cara no grupo 🙈🫏',
    'Você não entende de futebol, entende de fracasso 🫏',
    'ZERO pontos e zero futuro como palpiteiro 🫏',
    'Mãe Dina chorou vendo esse seu palpite zerado 🔮🫏'
  ];
  jabs_mid text[] := array[
    'Parabéns, você foi o bagre da rodada 🐟🫏',
    'Sem técnica nenhuma pra palpitar em futebol 🫏',
    'Todo ruinzinho, chega dá dó 😔🫏',
    'Coitado, tá todo perdidinho no bolão 🧭🫏',
    'Acho que falta QI pra você palpitar 🧠🫏',
    'Pior do bolão. Relaxa, podia ter zerado 🫏',
    'Lanterninha da rodada, com migalhas de ponto 🔦🫏',
    'O pior de todos, com folga 🫏',
    'Pódio dos piores: 1º lugar é seu 🥇🫏',
    'Você não joga no bolão, você DOA pontos 🎁🫏',
    'Disputando a lanterna e ganhando fácil 🔦🫏',
    'Treina mais, craque. Tá feio esse palpite 🙃🫏',
    'Bagre nadando no fundo do ranking 🐟🫏',
    'Tá todo perdidinho, até o juiz quis te ajudar 🧭🫏',
    'Você é ruim com requinte de crueldade 🫏',
    'Pior palpite da galera. Dá um tempo, vai 🫏',
    'Chega dá dó. Mas dó passa, ruindade não 😔🫏',
    'Migalhou uns pontos e mesmo assim foi o pior 🫏',
    'Falta noção e sobra confiança, péssima mistura 🫏',
    'O todo perdidinho oficial da rodada 🧭🫏'
  ];
begin
  -- só na transição real pra encerrado (ou correção de placar), nunca em re-toque
  if new.status = 'finished'
     and new.home_score is not null
     and new.away_score is not null
     and (old.status is distinct from new.status
          or old.home_score is distinct from new.home_score
          or old.away_score is distinct from new.away_score) then

    select th.code, ta.code into home_code, away_code
      from teams th, teams ta
     where th.id = new.home_team_id and ta.id = new.away_team_id;

    insert into notifications (user_id, type, title, body, match_id, pool_id)
    select p.user_id,
           'worst_match',
           case when p.points = 0
             then jabs_zero[1 + floor(random() * array_length(jabs_zero, 1))::int]
             else jabs_mid[1 + floor(random() * array_length(jabs_mid, 1))::int]
           end,
           format('%s %s×%s %s', home_code, new.home_score, new.away_score, away_code),
           new.id, p.pool_id
      from predictions p
      join (
        select pool_id, min(points) as min_pts
          from predictions where match_id = new.id
          group by pool_id
          having count(*) >= 2 and min(points) < max(points)
      ) worst on worst.pool_id = p.pool_id
     where p.match_id = new.id and p.points = worst.min_pts
    on conflict (user_id, match_id, type) do nothing;
  end if;
  return new;
end;
$$;
