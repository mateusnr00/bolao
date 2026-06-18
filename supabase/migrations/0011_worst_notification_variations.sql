-- 0011 — notificação de "pior palpite" mais ácida e com variações
--
-- Troca a mensagem fixa por um sorteio entre várias frases de zoeira. O título
-- (linha em destaque no sininho) é escolhido aleatoriamente por notificação; o
-- corpo traz só o jogo (TIME PLACAR TIME) pra dar contexto. Em empate no pior,
-- cada empatado pode receber uma frase diferente (random() é avaliado por linha).

create or replace function notify_worst_on_finish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  home_code text;
  away_code text;
  jabs text[] := array[
    'Parabéns, mãe Dina sem previsão 🔮🫏',
    'Você não acertou NADA nessa partida, burrinho 🫏',
    'Tá chutando de olho fechado? 🙈🫏',
    'Palpite de quem nunca viu uma bola rolar 📺🫏',
    'Faria melhor no cara ou coroa 🪙🫏',
    'Nem a sorte quis te ajudar nesse jogo 🍀🫏',
    'Pior palpite do bolão, com folga 🫏',
    'Devolve o controle pra quem entende ⚽🫏',
    'Nostradamus tremeu… de rir de você 🤡🫏',
    'Esse palpite foi um atentado ao futebol 🚨🫏',
    'Melhor sortear os placares da próxima 🎲🫏',
    'O lanterninha da partida é você 🔦🫏',
    'Acertar não é seu forte, né 🫏',
    'Chuta menos e estuda mais, burrinho 📚🫏',
    'Você viajou nesse placar 🛸🫏'
  ];
begin
  if new.status = 'finished'
     and new.home_score is not null
     and new.away_score is not null then

    select th.code, ta.code into home_code, away_code
      from teams th, teams ta
     where th.id = new.home_team_id
       and ta.id = new.away_team_id;

    insert into notifications (user_id, type, title, body, match_id, pool_id)
    select p.user_id,
           'worst_match',
           jabs[1 + floor(random() * array_length(jabs, 1))::int],
           format('%s %s×%s %s', home_code, new.home_score, new.away_score, away_code),
           new.id,
           p.pool_id
      from predictions p
      join (
        select pool_id, min(points) as min_pts
          from predictions
         where match_id = new.id
         group by pool_id
        having count(*) >= 2
           and min(points) < max(points)
      ) worst on worst.pool_id = p.pool_id
     where p.match_id = new.id
       and p.points = worst.min_pts
    on conflict (user_id, match_id, type) do nothing;
  end if;

  return new;
end;
$$;
