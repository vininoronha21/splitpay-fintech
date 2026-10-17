-- SplitPay consistency checks. Each query returns the offending rows:
-- zero rows means the invariant holds. Every query is preceded by a
-- "-- check: <name>" line so tests can split the file and run them one by one.

-- check: split_transaction_has_exactly_one_share
SELECT t.id, t.split_mode, count(s.id) AS share_count
FROM transactions t
LEFT JOIN split_share s ON s.transaction_id = t.id
WHERE t.split_mode IS NOT NULL
GROUP BY t.id
HAVING count(s.id) <> 1;

-- check: non_split_transaction_has_no_share
SELECT t.id, s.id AS share_id
FROM transactions t
JOIN split_share s ON s.transaction_id = t.id
WHERE t.split_mode IS NULL;

-- check: share_within_amount
-- Friend share + user share (amount - share) must sum to the total, so the
-- friend share must stay between 0 and the amount.
SELECT s.id, s.transaction_id, s.share_cents, t.amount_cents
FROM split_share s
JOIN transactions t ON t.id = s.transaction_id
WHERE s.share_cents < 0 OR s.share_cents > t.amount_cents;

-- check: share_matches_split_mode
-- Business Rule 7: equal = floor(amount / 2); percentage = floor(amount * pct / 100);
-- fixed = 0 < share <= amount. Integer division in SQLite floors positive values.
SELECT s.id, s.transaction_id, t.split_mode, t.split_percent, t.amount_cents, s.share_cents
FROM split_share s
JOIN transactions t ON t.id = s.transaction_id
WHERE (t.split_mode = 'equal' AND s.share_cents <> t.amount_cents / 2)
   OR (t.split_mode = 'percentage' AND s.share_cents <> t.amount_cents * t.split_percent / 100)
   OR (t.split_mode = 'fixed' AND (s.share_cents <= 0 OR s.share_cents > t.amount_cents));

-- check: settled_on_iff_closed
SELECT s.id, s.status, s.settled_on
FROM split_share s
WHERE (s.status = 'em_aberto' AND s.settled_on IS NOT NULL)
   OR (s.status <> 'em_aberto' AND s.settled_on IS NULL);

-- check: settled_on_not_before_occurred_on
SELECT s.id, s.settled_on, t.occurred_on
FROM split_share s
JOIN transactions t ON t.id = s.transaction_id
WHERE s.settled_on IS NOT NULL AND s.settled_on < t.occurred_on;

-- check: income_has_no_split
SELECT t.id, t.split_mode, s.id AS share_id
FROM transactions t
LEFT JOIN split_share s ON s.transaction_id = t.id
WHERE t.type = 'income' AND (t.split_mode IS NOT NULL OR s.id IS NOT NULL);

-- check: dates_parse
SELECT 'transactions' AS tbl, id, occurred_on AS value
FROM transactions
WHERE date(occurred_on) IS NOT occurred_on OR datetime(created_at) IS NOT created_at
UNION ALL
SELECT 'split_share', id, settled_on
FROM split_share
WHERE settled_on IS NOT NULL AND date(settled_on) IS NOT settled_on
UNION ALL
SELECT 'balance_adjustment', id, created_at
FROM balance_adjustment
WHERE datetime(created_at) IS NOT created_at;

-- check: money_is_integer_cents
SELECT 'user_profile' AS tbl, id, initial_balance_cents AS value
FROM user_profile
WHERE typeof(initial_balance_cents) <> 'integer' OR typeof(monthly_budget_cents) <> 'integer'
UNION ALL
SELECT 'transactions', id, amount_cents
FROM transactions
WHERE typeof(amount_cents) <> 'integer'
UNION ALL
SELECT 'split_share', id, share_cents
FROM split_share
WHERE typeof(share_cents) <> 'integer'
UNION ALL
SELECT 'balance_adjustment', id, delta_cents
FROM balance_adjustment
WHERE typeof(delta_cents) <> 'integer';

-- check: profile_row_exists
SELECT 'user_profile row id = 1 is missing' AS problem
WHERE NOT EXISTS (SELECT 1 FROM user_profile WHERE id = 1);

-- check: foreign_keys_resolve
SELECT 'category_rule.category_id' AS fk, r.id, r.category_id AS value
FROM category_rule r LEFT JOIN category c ON c.id = r.category_id
WHERE c.id IS NULL
UNION ALL
SELECT 'transactions.category_id', t.id, t.category_id
FROM transactions t LEFT JOIN category c ON c.id = t.category_id
WHERE t.category_id IS NOT NULL AND c.id IS NULL
UNION ALL
SELECT 'split_share.transaction_id', s.id, s.transaction_id
FROM split_share s LEFT JOIN transactions t ON t.id = s.transaction_id
WHERE t.id IS NULL
UNION ALL
SELECT 'split_share.person_id', s.id, s.person_id
FROM split_share s LEFT JOIN person p ON p.id = s.person_id
WHERE p.id IS NULL;
