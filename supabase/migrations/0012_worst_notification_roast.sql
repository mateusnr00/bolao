-- 0012 — frases do "pior palpite" ainda mais ácidas (humilhação nível bolão)
-- Substitui só a lista de zoeiras da função; resto da lógica igual à 0011.

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
    'Que vergonha alheia, hein 🫏',
    'Você foi pago pra errar? Porque tá funcionando 💸🫏',
    'Existe ruim, existe péssimo, e existe você palpitando 🫏',
    'Nem chutando com os dois pés você acertava 🦵🫏',
    'Seu palpite é crime contra o futebol ⚖️🫏',
    'A zebra te respeita de tão imprevisível… de RUIM 🦓🫏',
    'Desiste, meu filho, isso não é pra você 🫏',
    'Você tem um dom raro: errar absolutamente tudo 🎁🫏',
    'Palpite tão ruim que dói na alma 🤕🫏',
    'Cego, surdo e de costas eu palpitava melhor 🫏',
    'Você é o motivo do grupo rir hoje 🤣🫏',
    'A burrice tem limite, e você ultrapassou faz tempo 🫏',
    'Devolve teu CPF de palpiteiro, perdeu o direito 🪪🫏',
    'Errou tão feio que merece moldura na parede 🖼️🫏',
    'Você palpita igual quem ODEIA futebol 🫏',
    'Burrinho oficial da rodada, com diploma e louvor 🎓🫏',
    'Acertar? Você? Nunca nem vi 🫏',
    'Manda esse palpite direto pra autópsia ⚰️🫏',
    'Você fez história: a PIOR de todas 📉🫏',
    'Tá competindo pra ser o pior? Pode subir no pódio 🏆🫏',
    'Cada palpite teu é um pedido de desculpa ao futebol ⚽🫏',
    'Você não joga no bolão, você DOA pontos pra galera 🎁🫏',
    'Lê a sorte na borra do café, quem sabe melhora 🔮🫏',
    'Tão ruim que até o burrinho ficou com vergonha de você 🫏',
    'Parabéns, mãe Dina sem previsão 🔮🫏',
    'Esse placar você tirou de onde, do além? 👻🫏',
    'Bate uma foto, é raro alguém ser tão ruim assim 📸🫏',
    'Você erra com uma consistência admirável 📊🫏',
    'O VAR revisou e confirmou: palpite lixo 🗑️🫏',
    'Senta que o sermão é longo: você foi PÉSSIMO 🪑🫏'
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
