-- SplitPay schema (SQLite). Rebuilt on every API start from this file + seed.sql.
-- Money is INTEGER cents. Dates are ISO 'YYYY-MM-DD' text, timestamps ISO 8601 text.
-- Enums are text values validated by CHECK constraints.

-- Single user profile (the demo has exactly one user, id = 1).
CREATE TABLE user_profile (
    id                    INTEGER PRIMARY KEY CHECK (id = 1),
    display_name          TEXT    NOT NULL CHECK (length(display_name) BETWEEN 1 AND 60),
    initial_balance_cents INTEGER NOT NULL CHECK (initial_balance_cents >= 0),
    monthly_budget_cents  INTEGER NOT NULL CHECK (monthly_budget_cents >= 0)
);

-- Friends the user can split an expense with.
CREATE TABLE person (
    id   INTEGER PRIMARY KEY,
    name TEXT    NOT NULL UNIQUE CHECK (length(name) BETWEEN 1 AND 60)
);

CREATE TABLE category (
    id   INTEGER PRIMARY KEY,
    name TEXT    NOT NULL UNIQUE CHECK (length(name) BETWEEN 1 AND 40)
);

-- Keyword -> category. Keywords are stored lowercase without accents,
-- so accent-insensitive matching is a plain comparison.
CREATE TABLE category_rule (
    id          INTEGER PRIMARY KEY,
    keyword     TEXT    NOT NULL UNIQUE
                CHECK (length(keyword) BETWEEN 1 AND 40 AND keyword = lower(keyword)),
    category_id INTEGER NOT NULL REFERENCES category (id),
    is_default  INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1))
);

-- Plural name because TRANSACTION is an SQL keyword.
CREATE TABLE transactions (
    id                 INTEGER PRIMARY KEY,
    type               TEXT    NOT NULL CHECK (type IN ('expense', 'income')),
    description        TEXT    NOT NULL CHECK (length(description) BETWEEN 1 AND 120),
    amount_cents       INTEGER NOT NULL CHECK (amount_cents > 0),
    category_id        INTEGER REFERENCES category (id),
    occurred_on        TEXT    NOT NULL CHECK (date(occurred_on) = occurred_on),
    place              TEXT    CHECK (place IS NULL OR length(place) <= 120),
    payment_method     TEXT    CHECK (payment_method IN ('pix', 'debito', 'credito', 'dinheiro')),
    installment_number INTEGER,
    installment_total  INTEGER,
    notes              TEXT    CHECK (notes IS NULL OR length(notes) <= 500),
    split_mode         TEXT    CHECK (split_mode IN ('equal', 'percentage', 'fixed')),
    split_percent      INTEGER,
    created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
                       CHECK (datetime(created_at) IS NOT NULL),
    -- Installment (display only): both null, or 1 <= number <= total.
    -- Explicit IS NOT NULL: a CHECK that evaluates to NULL would pass.
    CHECK (
        (installment_number IS NULL AND installment_total IS NULL)
        OR (installment_number IS NOT NULL AND installment_total IS NOT NULL
            AND installment_number >= 1 AND installment_number <= installment_total)
    ),
    -- Incomes are never split.
    CHECK (type = 'expense' OR split_mode IS NULL),
    -- The friend's percentage exists only in percentage mode, 0..100.
    CHECK (
        (split_mode IS 'percentage' AND split_percent IS NOT NULL AND split_percent BETWEEN 0 AND 100)
        OR (split_mode IS NOT 'percentage' AND split_percent IS NULL)
    )
);

-- The friend's share of a split expense. The user's share is always
-- amount_cents - share_cents, so the two sum to the total by construction.
-- UNIQUE (transaction_id) enforces 1-to-1; group splits will drop it later.
CREATE TABLE split_share (
    id             INTEGER PRIMARY KEY,
    transaction_id INTEGER NOT NULL UNIQUE REFERENCES transactions (id) ON DELETE CASCADE,
    person_id      INTEGER NOT NULL REFERENCES person (id),
    share_cents    INTEGER NOT NULL CHECK (share_cents >= 0),
    status         TEXT    NOT NULL DEFAULT 'em_aberto'
                   CHECK (status IN ('em_aberto', 'pago', 'acertado')),
    settled_on     TEXT    CHECK (settled_on IS NULL OR date(settled_on) = settled_on),
    -- settled_on is set if and only if the share left 'em_aberto'.
    CHECK ((status = 'em_aberto') = (settled_on IS NULL))
);

-- Manual balance corrections: a signed delta and a reason. The previous and
-- new balance are computed when listing, never stored.
CREATE TABLE balance_adjustment (
    id          INTEGER PRIMARY KEY,
    delta_cents INTEGER NOT NULL CHECK (delta_cents <> 0),
    reason      TEXT    NOT NULL CHECK (length(reason) BETWEEN 10 AND 200),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
                CHECK (datetime(created_at) IS NOT NULL)
);

CREATE INDEX idx_transactions_occurred_on ON transactions (occurred_on);
CREATE INDEX idx_split_share_person ON split_share (person_id);

-- Cross-table rules (CHECK cannot read another table), enforced by triggers.
-- A share must point to a split expense and never exceed its amount.
CREATE TRIGGER split_share_validate_insert
BEFORE INSERT ON split_share
BEGIN
    SELECT RAISE(ABORT, 'split_share: transaction is an income')
    WHERE (SELECT type FROM transactions WHERE id = NEW.transaction_id) = 'income';
    SELECT RAISE(ABORT, 'split_share: transaction has no split_mode')
    WHERE EXISTS (SELECT 1 FROM transactions WHERE id = NEW.transaction_id AND split_mode IS NULL);
    SELECT RAISE(ABORT, 'split_share: share_cents greater than amount_cents')
    WHERE NEW.share_cents > (SELECT amount_cents FROM transactions WHERE id = NEW.transaction_id);
END;

CREATE TRIGGER split_share_validate_update
BEFORE UPDATE ON split_share
BEGIN
    SELECT RAISE(ABORT, 'split_share: transaction is an income')
    WHERE (SELECT type FROM transactions WHERE id = NEW.transaction_id) = 'income';
    SELECT RAISE(ABORT, 'split_share: transaction has no split_mode')
    WHERE EXISTS (SELECT 1 FROM transactions WHERE id = NEW.transaction_id AND split_mode IS NULL);
    SELECT RAISE(ABORT, 'split_share: share_cents greater than amount_cents')
    WHERE NEW.share_cents > (SELECT amount_cents FROM transactions WHERE id = NEW.transaction_id);
END;

-- Editing a transaction must not invalidate its existing share.
CREATE TRIGGER transactions_validate_share_update
BEFORE UPDATE OF type, amount_cents, split_mode ON transactions
WHEN EXISTS (SELECT 1 FROM split_share WHERE transaction_id = NEW.id)
BEGIN
    SELECT RAISE(ABORT, 'transactions: split transaction cannot become an income')
    WHERE NEW.type = 'income';
    SELECT RAISE(ABORT, 'transactions: split transaction must keep a split_mode')
    WHERE NEW.split_mode IS NULL;
    SELECT RAISE(ABORT, 'transactions: amount_cents lower than the existing share')
    WHERE NEW.amount_cents < (SELECT share_cents FROM split_share WHERE transaction_id = NEW.id);
END;
