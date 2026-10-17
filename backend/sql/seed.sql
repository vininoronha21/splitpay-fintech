-- SplitPay demo data (pt-BR). Every date is relative to the moment the API
-- starts, so the current week, month and year always have data and nothing is
-- older than 12 months. "Now" is Brasília time: 'now', '-3 hours' always comes
-- first, so 'start of month', 'weekday N' etc. apply to the Brasília date.
-- Shares follow Business Rule 7:
--   equal      -> floor(amount / 2)
--   percentage -> floor(amount * pct / 100)
--   fixed      -> any 0 < share <= amount
-- Explicit ids so split_share rows can reference their transactions.
-- Story: salary R$ 3.200,00 on the 5th of every month with expenses; rent is
-- paid alone until Pedro moves in 3 months back (after the room renovation),
-- so the running balance stays positive at every day, month end and adjustment.

INSERT INTO user_profile (id, display_name, initial_balance_cents, monthly_budget_cents)
VALUES (1, 'Usuário', 250000, 300000);

INSERT INTO person (id, name) VALUES
    (1, 'Ana Lima'),
    (2, 'Carlos Mendes'),
    (3, 'Juliana Ramos'),
    (4, 'Pedro Souza'),
    (5, 'Fernanda Costa'),
    (6, 'Lucas Oliveira'),
    (7, 'Mariana Duarte'),
    (8, 'Thiago Ferreira');

INSERT INTO category (id, name) VALUES
    (1, 'Alimentação'),
    (2, 'Transporte'),
    (3, 'Lazer'),
    (4, 'Compras'),
    (5, 'Moradia'),
    (6, 'Saúde'),
    (7, 'Educação'),
    (8, 'Outros');

-- Default rules: keywords lowercase and without accents.
INSERT INTO category_rule (keyword, category_id, is_default) VALUES
    ('janta', 1, 1), ('jantar', 1, 1), ('almoco', 1, 1), ('restaurante', 1, 1),
    ('mercado', 1, 1), ('ifood', 1, 1), ('padaria', 1, 1),
    ('combustivel', 2, 1), ('gasolina', 2, 1), ('uber', 2, 1), ('onibus', 2, 1),
    ('metro', 2, 1), ('estacionamento', 2, 1),
    ('cinema', 3, 1), ('show', 3, 1), ('bar', 3, 1), ('viagem', 3, 1),
    ('roupa', 4, 1), ('presente', 4, 1), ('tenis', 4, 1),
    ('aluguel', 5, 1), ('luz', 5, 1), ('internet', 5, 1), ('condominio', 5, 1),
    ('farmacia', 6, 1), ('consulta', 6, 1), ('academia', 6, 1),
    ('curso', 7, 1), ('livro', 7, 1), ('faculdade', 7, 1),
    ('doacao', 8, 1);

INSERT INTO transactions
    (id, type, description, amount_cents, category_id, occurred_on, place, payment_method,
     installment_number, installment_total, notes, split_mode, split_percent)
VALUES
    -- Current month / week / last days
    -- Salary lands on the 5th; min() keeps it on Brasília today during days 1-4.
    (1,  'income',  'Salário', 320000, NULL,
         min(date('now', '-3 hours', 'start of month', '+4 days'), date('now', '-3 hours')),
         'Empresa Tech Ltda.', 'pix', NULL, NULL, NULL, NULL, NULL),
    (2,  'expense', 'Janta no restaurante japonês', 18790, 1, date('now', '-3 hours'),
         'Sushi Kenzo', 'credito', NULL, NULL, 'Ana vai me pagar 50% em 3 dias', 'equal', NULL),
    (3,  'expense', 'Uber para o trabalho', 2350, 2, date('now', '-3 hours'),
         NULL, 'credito', NULL, NULL, NULL, NULL, NULL),
    (4,  'expense', 'Mercado da semana', 34280, 1, date('now', '-3 hours', '-1 day'),
         'Pão de Açúcar', 'debito', NULL, NULL, 'Carlos fica com 40% das compras', 'percentage', 40),
    (5,  'expense', 'Combustível', 25000, 2, date('now', '-3 hours', '-2 days'),
         'Posto Shell', 'debito', NULL, NULL, NULL, NULL, NULL),
    (6,  'expense', 'Cinema com a Juliana', 9600, 3, date('now', '-3 hours', 'weekday 0', '-6 days'),
         'Cinemark', 'pix', NULL, NULL, NULL, 'equal', NULL),
    (7,  'expense', 'Aluguel', 180000, 5, date('now', '-3 hours', 'start of month'),
         'Apartamento', 'pix', NULL, NULL, 'Pedro paga R$ 900,00 da parte dele', 'fixed', NULL),
    (8,  'expense', 'Conta de luz', 21437, 5, date('now', '-3 hours', '-5 days'),
         'Enel', 'pix', NULL, NULL, NULL, 'percentage', 50),
    (9,  'expense', 'Curso de inglês', 39900, 7, date('now', '-3 hours', '-6 days'),
         'Online', 'credito', 3, 10, NULL, NULL, NULL),
    (10, 'income',  'Freela de design', 120000, NULL, date('now', '-3 hours', '-8 days'),
         NULL, 'pix', NULL, NULL, 'Logo para uma padaria', NULL, NULL),
    (11, 'expense', 'iFood pizza', 8990, 1, date('now', '-3 hours', '-9 days'),
         'iFood', 'credito', NULL, NULL, NULL, 'equal', NULL),
    (12, 'expense', 'Farmácia', 6745, 6, date('now', '-3 hours', '-12 days'),
         'Drogasil', 'debito', NULL, NULL, NULL, NULL, NULL),
    (13, 'expense', 'Bar com amigos', 15680, 3, date('now', '-3 hours', '-14 days'),
         'Boteco do Zé', 'dinheiro', NULL, NULL, 'Thiago deixou R$ 70,00', 'fixed', NULL),
    (14, 'expense', 'Tênis de corrida', 32990, 4, date('now', '-3 hours', '-20 days'),
         'Centauro', 'credito', 2, 5, NULL, NULL, NULL),
    -- Previous months (always before the current month starts)
    (15, 'income',  'Salário', 320000, NULL, date('now', '-3 hours', 'start of month', '-1 month', '+4 days'),
         'Empresa Tech Ltda.', 'pix', NULL, NULL, NULL, NULL, NULL),
    (16, 'expense', 'Aluguel', 180000, 5, date('now', '-3 hours', 'start of month', '-1 month'),
         'Apartamento', 'pix', NULL, NULL, NULL, 'fixed', NULL),
    (17, 'expense', 'Mercado do mês', 61230, 1, date('now', '-3 hours', 'start of month', '-1 month', '+5 days'),
         'Carrefour', 'debito', NULL, NULL, NULL, 'percentage', 30),
    (18, 'expense', 'Passagem de ônibus', 1250, 2, date('now', '-3 hours', 'start of month', '-1 month', '+8 days'),
         NULL, 'debito', NULL, NULL, NULL, NULL, NULL),
    (19, 'expense', 'Ingresso de show', 45000, 3, date('now', '-3 hours', 'start of month', '-1 month', '+12 days'),
         'Allianz Parque', 'credito', NULL, NULL, NULL, 'equal', NULL),
    (20, 'income',  'Salário', 320000, NULL, date('now', '-3 hours', 'start of month', '-2 months', '+4 days'),
         'Empresa Tech Ltda.', 'pix', NULL, NULL, NULL, NULL, NULL),
    (21, 'expense', 'Aluguel', 180000, 5, date('now', '-3 hours', 'start of month', '-2 months'),
         'Apartamento', 'pix', NULL, NULL, NULL, 'fixed', NULL),
    (22, 'expense', 'Presente de aniversário da mãe', 15990, 4, date('now', '-3 hours', 'start of month', '-2 months', '+18 days'),
         'Renner', 'credito', NULL, NULL, 'Juliana ajudou com 25%', 'percentage', 25),
    (23, 'expense', 'Aluguel', 180000, 5, date('now', '-3 hours', 'start of month', '-3 months'),
         'Apartamento', 'pix', NULL, NULL, NULL, 'fixed', NULL),
    (24, 'expense', 'Consulta médica', 35000, 6, date('now', '-3 hours', 'start of month', '-3 months', '+7 days'),
         'Clínica Vida', 'pix', NULL, NULL, NULL, NULL, NULL),
    (25, 'expense', 'Doação para ONG', 5000, 8, date('now', '-3 hours', 'start of month', '-3 months', '+22 days'),
         NULL, 'pix', NULL, NULL, NULL, NULL, NULL),
    (26, 'income',  'Freela de site', 150000, NULL, date('now', '-3 hours', 'start of month', '-4 months', '+15 days'),
         NULL, 'pix', NULL, NULL, NULL, NULL, NULL),
    (27, 'expense', 'Reforma do quarto', 250000, 5, date('now', '-3 hours', 'start of month', '-4 months', '+20 days'),
         'Leroy Merlin', 'debito', NULL, NULL, NULL, NULL, NULL),
    (28, 'expense', 'Viagem para Paraty - hospedagem', 96000, 3, date('now', '-3 hours', 'start of month', '-5 months', '+20 days'),
         'Pousada Mar Azul', 'credito', NULL, NULL, NULL, 'equal', NULL),
    (29, 'expense', 'Viagem para Paraty - passagens', 56000, 3, date('now', '-3 hours', 'start of month', '-5 months', '+10 days'),
         'Rodoviária Tietê', 'pix', NULL, NULL, NULL, 'equal', NULL),
    (30, 'expense', 'Notebook', 45000, 4, date('now', '-3 hours', 'start of month', '-6 months', '+3 days'),
         'Kabum', 'credito', 7, 12, NULL, NULL, NULL),
    (31, 'expense', 'Seguro do carro', 180000, 2, date('now', '-3 hours', 'start of month', '-7 months', '+4 days'),
         'Porto Seguro', 'debito', NULL, NULL, NULL, NULL, NULL),
    (32, 'expense', 'Livro de finanças pessoais', 6990, 7, date('now', '-3 hours', 'start of month', '-7 months', '+11 days'),
         'Livraria Cultura', 'credito', NULL, NULL, NULL, NULL, NULL),
    (33, 'expense', 'Uber para o aeroporto', 7840, 2, date('now', '-3 hours', 'start of month', '-8 months', '+14 days'),
         NULL, 'credito', NULL, NULL, 'Fernanda ainda não pagou', 'equal', NULL),
    (34, 'expense', 'Academia', 11990, 6, date('now', '-3 hours', 'start of month', '-10 months', '+2 days'),
         'Smart Fit', 'credito', NULL, NULL, NULL, NULL, NULL),
    (35, 'expense', 'Jantar de aniversário', 24850, 1, date('now', '-3 hours', 'start of month', '-11 months', '+9 days'),
         'Fogo de Chão', 'credito', NULL, NULL, NULL, 'percentage', 50),
    -- Salary on the 5th of every earlier month that has expenses (not 9 months
    -- back, the empty period).
    (36, 'income',  'Salário', 320000, NULL, date('now', '-3 hours', 'start of month', '-3 months', '+4 days'),
         'Empresa Tech Ltda.', 'pix', NULL, NULL, NULL, NULL, NULL),
    (37, 'income',  'Salário', 320000, NULL, date('now', '-3 hours', 'start of month', '-4 months', '+4 days'),
         'Empresa Tech Ltda.', 'pix', NULL, NULL, NULL, NULL, NULL),
    (38, 'income',  'Salário', 320000, NULL, date('now', '-3 hours', 'start of month', '-5 months', '+4 days'),
         'Empresa Tech Ltda.', 'pix', NULL, NULL, NULL, NULL, NULL),
    (39, 'income',  'Salário', 320000, NULL, date('now', '-3 hours', 'start of month', '-6 months', '+4 days'),
         'Empresa Tech Ltda.', 'pix', NULL, NULL, NULL, NULL, NULL),
    (40, 'income',  'Salário', 320000, NULL, date('now', '-3 hours', 'start of month', '-7 months', '+4 days'),
         'Empresa Tech Ltda.', 'pix', NULL, NULL, NULL, NULL, NULL),
    (41, 'income',  'Salário', 320000, NULL, date('now', '-3 hours', 'start of month', '-8 months', '+4 days'),
         'Empresa Tech Ltda.', 'pix', NULL, NULL, NULL, NULL, NULL),
    (42, 'income',  'Salário', 320000, NULL, date('now', '-3 hours', 'start of month', '-10 months', '+4 days'),
         'Empresa Tech Ltda.', 'pix', NULL, NULL, NULL, NULL, NULL),
    (43, 'income',  'Salário', 320000, NULL, date('now', '-3 hours', 'start of month', '-11 months', '+4 days'),
         'Empresa Tech Ltda.', 'pix', NULL, NULL, NULL, NULL, NULL),
    -- Rent before Pedro moved in (3 months back): paid in full, no split.
    (44, 'expense', 'Aluguel', 180000, 5, date('now', '-3 hours', 'start of month', '-4 months'),
         'Apartamento', 'pix', NULL, NULL, NULL, NULL, NULL),
    (45, 'expense', 'Aluguel', 180000, 5, date('now', '-3 hours', 'start of month', '-5 months'),
         'Apartamento', 'pix', NULL, NULL, NULL, NULL, NULL),
    (46, 'expense', 'Aluguel', 180000, 5, date('now', '-3 hours', 'start of month', '-6 months'),
         'Apartamento', 'pix', NULL, NULL, NULL, NULL, NULL),
    (47, 'expense', 'Aluguel', 180000, 5, date('now', '-3 hours', 'start of month', '-7 months'),
         'Apartamento', 'pix', NULL, NULL, NULL, NULL, NULL),
    (48, 'expense', 'Aluguel', 180000, 5, date('now', '-3 hours', 'start of month', '-8 months'),
         'Apartamento', 'pix', NULL, NULL, NULL, NULL, NULL),
    (49, 'expense', 'Aluguel', 180000, 5, date('now', '-3 hours', 'start of month', '-10 months'),
         'Apartamento', 'pix', NULL, NULL, NULL, NULL, NULL),
    (50, 'expense', 'Aluguel', 180000, 5, date('now', '-3 hours', 'start of month', '-11 months'),
         'Apartamento', 'pix', NULL, NULL, NULL, NULL, NULL),
    -- Monthly groceries and power bill in earlier months.
    (51, 'expense', 'Mercado do mês', 58740, 1, date('now', '-3 hours', 'start of month', '-2 months', '+6 days'),
         'Assaí Atacadista', 'debito', NULL, NULL, NULL, NULL, NULL),
    (52, 'expense', 'Mercado do mês', 62315, 1, date('now', '-3 hours', 'start of month', '-3 months', '+5 days'),
         'Carrefour', 'debito', NULL, NULL, NULL, NULL, NULL),
    (53, 'expense', 'Mercado do mês', 54980, 1, date('now', '-3 hours', 'start of month', '-4 months', '+7 days'),
         'Assaí Atacadista', 'debito', NULL, NULL, NULL, NULL, NULL),
    (54, 'expense', 'Mercado do mês', 66120, 1, date('now', '-3 hours', 'start of month', '-5 months', '+6 days'),
         'Carrefour', 'debito', NULL, NULL, NULL, NULL, NULL),
    (55, 'expense', 'Mercado do mês', 59870, 1, date('now', '-3 hours', 'start of month', '-6 months', '+8 days'),
         'Pão de Açúcar', 'debito', NULL, NULL, NULL, NULL, NULL),
    (56, 'expense', 'Mercado do mês', 61450, 1, date('now', '-3 hours', 'start of month', '-7 months', '+5 days'),
         'Carrefour', 'debito', NULL, NULL, NULL, NULL, NULL),
    (57, 'expense', 'Mercado do mês', 57230, 1, date('now', '-3 hours', 'start of month', '-8 months', '+6 days'),
         'Assaí Atacadista', 'debito', NULL, NULL, NULL, NULL, NULL),
    (58, 'expense', 'Mercado do mês', 63980, 1, date('now', '-3 hours', 'start of month', '-10 months', '+7 days'),
         'Carrefour', 'debito', NULL, NULL, NULL, NULL, NULL),
    (59, 'expense', 'Mercado do mês', 55610, 1, date('now', '-3 hours', 'start of month', '-11 months', '+6 days'),
         'Pão de Açúcar', 'debito', NULL, NULL, NULL, NULL, NULL),
    (60, 'expense', 'Conta de luz', 19875, 5, date('now', '-3 hours', 'start of month', '-1 month', '+14 days'),
         'Enel', 'pix', NULL, NULL, NULL, NULL, NULL),
    (61, 'expense', 'Conta de luz', 18960, 5, date('now', '-3 hours', 'start of month', '-2 months', '+13 days'),
         'Enel', 'pix', NULL, NULL, NULL, NULL, NULL),
    (62, 'expense', 'Conta de luz', 21345, 5, date('now', '-3 hours', 'start of month', '-3 months', '+15 days'),
         'Enel', 'pix', NULL, NULL, NULL, NULL, NULL),
    (63, 'expense', 'Conta de luz', 16780, 5, date('now', '-3 hours', 'start of month', '-4 months', '+14 days'),
         'Enel', 'pix', NULL, NULL, NULL, NULL, NULL),
    (64, 'expense', 'Conta de luz', 19420, 5, date('now', '-3 hours', 'start of month', '-5 months', '+12 days'),
         'Enel', 'pix', NULL, NULL, NULL, NULL, NULL),
    (65, 'expense', 'Conta de luz', 23150, 5, date('now', '-3 hours', 'start of month', '-6 months', '+16 days'),
         'Enel', 'pix', NULL, NULL, NULL, NULL, NULL),
    (66, 'expense', 'Conta de luz', 17890, 5, date('now', '-3 hours', 'start of month', '-7 months', '+14 days'),
         'Enel', 'pix', NULL, NULL, NULL, NULL, NULL),
    (67, 'expense', 'Conta de luz', 20510, 5, date('now', '-3 hours', 'start of month', '-8 months', '+13 days'),
         'Enel', 'pix', NULL, NULL, NULL, NULL, NULL),
    (68, 'expense', 'Conta de luz', 22740, 5, date('now', '-3 hours', 'start of month', '-10 months', '+15 days'),
         'Enel', 'pix', NULL, NULL, NULL, NULL, NULL),
    (69, 'expense', 'Conta de luz', 18330, 5, date('now', '-3 hours', 'start of month', '-11 months', '+14 days'),
         'Enel', 'pix', NULL, NULL, NULL, NULL, NULL);

-- Each transaction was recorded on the day it happened, during the day
-- (08:00-17:59, varied by id), never later than now. Without this, created_at
-- would be the seed's own moment, and the adjustment history (which compares
-- same-day movements by created_at) would treat every seeded movement as
-- recorded after the adjustments of its day.
UPDATE transactions
SET created_at = min(
    datetime(occurred_on, '+' || (8 + id % 10) || ' hours', '+' || (id * 7 % 60) || ' minutes'),
    datetime('now', '-3 hours')
);

-- Friend shares. A closed share was settled days_after its expense, in the
-- afternoon (12:00-17:59, varied by id; before the 18:00 adjustment, so it
-- counts toward that day's history as it did with a date only). max() keeps it
-- at or after the expense's created_at (set by the UPDATE above, so this
-- INSERT must come after it) and min() caps it at now, so it is never in the
-- future. settled_at is NULL iff the share is still 'em_aberto'.
WITH share (transaction_id, person_id, share_cents, status, days_after) AS (VALUES
    (2,  1, 9395,  'em_aberto', NULL),  -- equal 18790 / 2
    (4,  2, 13712, 'em_aberto', NULL),  -- 40% of 34280
    (6,  3, 4800,  'pago',      1),
    (7,  4, 90000, 'pago',      2),
    (8,  4, 10718, 'em_aberto', NULL),  -- 50% of 21437 (floor)
    (11, 6, 4495,  'acertado',  3),
    (13, 8, 7000,  'pago',      0),
    (16, 4, 90000, 'pago',      2),
    (17, 5, 18369, 'pago',      4),     -- 30% of 61230
    (19, 7, 22500, 'acertado',  6),
    (21, 4, 90000, 'pago',      1),
    (22, 3, 3997,  'acertado',  5),     -- 25% of 15990 (floor)
    (23, 4, 90000, 'pago',      0),     -- Pedro's first month: paid on rent day
    (28, 1, 48000, 'pago',      7),
    (29, 1, 28000, 'acertado',  10),
    (33, 5, 3920,  'em_aberto', NULL),  -- equal 7840 / 2
    (35, 2, 12425, 'pago',      2)      -- 50% of 24850
)
INSERT INTO split_share (transaction_id, person_id, share_cents, status, settled_at)
SELECT s.transaction_id, s.person_id, s.share_cents, s.status,
       CASE WHEN s.status <> 'em_aberto' THEN min(
           max(datetime(t.occurred_on, '+' || s.days_after || ' days',
                        '+' || (12 + t.id % 6) || ' hours', '+' || (t.id * 11 % 60) || ' minutes'),
               t.created_at),
           datetime('now', '-3 hours')
       ) END
FROM share s
JOIN transactions t ON t.id = s.transaction_id;

INSERT INTO balance_adjustment (delta_cents, reason, created_at) VALUES
    (5000,   'Correção após conferir o extrato do banco', datetime('now', '-3 hours', 'start of month', '-3 months', '+25 days', '+10 hours')),
    (-12000, 'Saque em dinheiro não registrado', datetime('now', '-3 hours', '-10 days', 'start of day', '+18 hours'));
