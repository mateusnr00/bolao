-- 0013 — humilhação em dois níveis no "pior palpite"
--
-- Quem ZEROU (0 pontos = não acertou nada) recebe as frases mais brutais.
-- Quem foi o pior mas pontuou algo recebe frases ácidas porém menos pesadas.
-- Em ambos os casos o título é sorteado (random por linha → mais variação).

create or replace function notify_worst_on_finish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  home_code text;
  away_code text;
  -- nível ZERO: não acertou absolutamente nada
  jabs_zero text[] := array[
    'ZERO pontos. O futebol inteiro tá decepcionado com você ⚽🫏',
    'Você zerou tão bonito que merece estátua de burro 🗿🫏',
    'NADA. Você não acertou absolutamente NADA nesse jogo 🫏',
    'Tirou 0. Até apagão acerta mais que você 💡🫏',
    'Big ZERO! Devolve o oxigênio pra quem usa direito 🫁🫏',
    'ZERO. Repete comigo: eu não entendo nada de futebol 📢🫏',
    'Cravou o nada com louvor. Parabéns pelo vácuo 🕳️🫏',
    'Você zerou e ainda teve coragem de abrir o app 😭🫏',
    'Nem se o jogo fosse de mentira você acertava 🎭🫏',
    'Zero pontos: o talento raro de ser totalmente inútil 🏅🫏',
    'Tirou zero igual quem chutou dormindo 😴🫏',
    'Você não errou UM palpite, errou TODOS 💯🫏',
    'Marcou 0. Vai jogar par ou ímpar, é mais a sua área ✋🫏',
    'Zerou com folga. Aplausos de pé pra essa tragédia 👏🫏',
    'Conseguiu o impossível: não acertar nem por acidente 🎯🫏',
    'Nota da partida: ZERO. Reprovado com louvor 📝🫏',
    'Zero pontos e zero noção, a combinação perfeita 🫏',
    'Você palpitou ou espirrou nos números? 🤧🫏',
    'Tão ruim que o burrinho pediu demissão de você 🫏',
    'ZERO. Tá esperando o quê pra deletar a conta? 🗑️🫏',
    'Você é a prova viva de que palpitar não é pra todos 🧬🫏',
    'O VAR revisou seu palpite e mandou pra lixeira 🗑️🫏',
    'Nem chutando de olho fechado dava pra ser tão ruim 🙈🫏',
    'Zerada histórica. Vão lembrar disso por anos 📉🫏',
    'Você fez 0 e a vergonha fez 10 🤦🫏',
    'Mereces um troféu… de pior palpiteiro da humanidade 🏆🫏'
  ];
  -- nível PIOR (mas pontuou algo)
  jabs_mid text[] := array[
    'Foi o pior do bolão. Relaxa, podia ter zerado 🫏',
    'Lanterninha da rodada, com migalhas de ponto 🔦🫏',
    'Pior palpite do grupo. Pelo menos não zerou… né 🫏',
    'Parabéns, você foi o mais ruim de todos 🏅🫏',
    'Pódio dos piores: 1º lugar é todo seu 🥇🫏',
    'Quase zerou. Quase virou teu sobrenome 🫏',
    'O pior do bolão, com orgulho zero 🫏',
    'Você foi mal. Bem mal. O pior, na real 🫏',
    'Acertou pouco e errou muito: o pior combo 🫏',
    'Disputando a lanterna e ganhando fácil 🔦🫏',
    'Pior palpite da galera. Treina mais, craque 🙃🫏',
    'Você é ruim com requinte de crueldade 🫏',
    'Migalhou uns pontinhos e mesmo assim foi o pior 🫏',
    'Que vergonha alheia, hein 🫏',
    'Seu palpite foi um atentado ao futebol ⚖️🫏',
    'A zebra te respeita de tão imprevisível… de RUIM 🦓🫏',
    'Você não joga no bolão, você DOA pontos pra galera 🎁🫏',
    'Errou tão feio que merece moldura na parede 🖼️🫏',
    'Burrinho oficial da rodada, com diploma e louvor 🎓🫏',
    'Esse placar você tirou de onde, do além? 👻🫏',
    'Bate uma foto, é raro alguém ser tão ruim assim 📸🫏',
    'Você erra com uma consistência admirável 📊🫏',
    'Senta que o sermão é longo: você foi PÉSSIMO 🪑🫏',
    'Devolve teu CPF de palpiteiro, perdeu o direito 🪪🫏'
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
           case
             when p.points = 0
               then jabs_zero[1 + floor(random() * array_length(jabs_zero, 1))::int]
             else jabs_mid[1 + floor(random() * array_length(jabs_mid, 1))::int]
           end,
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
