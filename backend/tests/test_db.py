import re
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.db import SQL_DIR, connect
from app.main import create_app
from app.services import brasilia_today

# A valid split expense (id 100) and a valid income (id 101) that the
# constraint cases below build on.
FIXTURE_ROWS = """
INSERT INTO transactions (id, type, description, amount_cents, occurred_on, split_mode)
VALUES (100, 'expense', 'Teste', 1000, date('now'), 'fixed');
INSERT INTO transactions (id, type, description, amount_cents, occurred_on)
VALUES (101, 'income', 'Teste', 1000, date('now'));
"""


def insert_tx(columns: str, values: str) -> str:
    return (
        "INSERT INTO transactions (type, description, amount_cents, occurred_on"
        f"{columns}) VALUES ('expense', 'Teste', 1000, date('now'){values})"
    )


CONSTRAINT_CASES = {
    "amount_zero": insert_tx("", "").replace("1000", "0"),
    "amount_negative": insert_tx("", "").replace("1000", "-1"),
    "type_invalid": insert_tx("", "").replace("'expense'", "'transfer'"),
    "second_share_same_transaction": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (100, 1, 100);"
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (100, 2, 100)"
    ),
    "share_greater_than_amount": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (100, 1, 1001)"
    ),
    "share_negative": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (100, 1, -1)"
    ),
    "share_on_income": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (101, 1, 100)"
    ),
    "split_mode_on_income": insert_tx(", split_mode", ", 'equal'").replace(
        "'expense'", "'income'"
    ),
    "status_invalid": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents, status, settled_at)"
        " VALUES (100, 1, 100, 'cancelado', datetime('now', '-3 hours'))"
    ),
    "installment_number_above_total": insert_tx(
        ", installment_number, installment_total", ", 4, 3"
    ),
    "installment_number_zero": insert_tx(", installment_number, installment_total", ", 0, 3"),
    "installment_only_number": insert_tx(", installment_number", ", 1"),
    "installment_only_total": insert_tx(", installment_total", ", 3"),
    "percent_above_100": insert_tx(", split_mode, split_percent", ", 'percentage', 101"),
    "percent_below_0": insert_tx(", split_mode, split_percent", ", 'percentage', -1"),
    "percent_on_equal_split": insert_tx(", split_mode, split_percent", ", 'equal', 50"),
    "percent_without_split": insert_tx(", split_percent", ", 50"),
    "adjustment_delta_zero": (
        "INSERT INTO balance_adjustment (delta_cents, reason) VALUES (0, 'Motivo válido aqui')"
    ),
    "adjustment_reason_too_short": (
        "INSERT INTO balance_adjustment (delta_cents, reason) VALUES (100, 'Curto')"
    ),
    "initial_balance_negative": "UPDATE user_profile SET initial_balance_cents = -1",
    "monthly_budget_negative": "UPDATE user_profile SET monthly_budget_cents = -1",
    "fk_transaction_category": insert_tx(", category_id", ", 999"),
    "fk_share_person": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (100, 999, 100)"
    ),
    "fk_share_transaction": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (999, 1, 100)"
    ),
    "fk_rule_category": (
        "INSERT INTO category_rule (keyword, category_id) VALUES ('teste', 999)"
    ),
    # Type and format: INTEGER affinity and date() alone let these through.
    "occurred_on_text": insert_tx("", "").replace("date('now')", "'abc'"),
    "occurred_on_with_time": insert_tx("", "").replace("date('now')", "datetime('now')"),
    "created_at_text": insert_tx(", created_at", ", 'abc'"),
    "created_at_julian_number": insert_tx(", created_at", ", 2461000.5"),
    "settled_at_text": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents, status, settled_at)"
        " VALUES (100, 1, 100, 'pago', 'abc')"
    ),
    "settled_at_date_only": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents, status, settled_at)"
        " VALUES (100, 1, 100, 'pago', date('now', '-3 hours', '+1 day'))"
    ),
    "settled_at_iso_t_separator": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents, status, settled_at)"
        " VALUES (100, 1, 100, 'pago', strftime('%Y-%m-%dT%H:%M:%S', 'now', '-3 hours', '+1 hour'))"
    ),
    "settled_at_julian_number": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents, status, settled_at)"
        " VALUES (100, 1, 100, 'pago', julianday('now', '+1 hour'))"
    ),
    # settled_at is set if and only if the share left 'em_aberto'.
    "settled_at_on_open_share": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents, status, settled_at)"
        " VALUES (100, 1, 100, 'em_aberto', datetime('now', '-3 hours'))"
    ),
    "pago_without_settled_at": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents, status)"
        " VALUES (100, 1, 100, 'pago')"
    ),
    "acertado_without_settled_at": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents, status)"
        " VALUES (100, 1, 100, 'acertado')"
    ),
    "close_share_without_settled_at": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (100, 1, 100);"
        "UPDATE split_share SET status = 'pago' WHERE transaction_id = 100"
    ),
    # Never settled before the expense was recorded (trigger, insert and update).
    "settled_at_before_created_at": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents, status, settled_at)"
        " VALUES (100, 1, 100, 'pago', datetime('now', '-3 hours', '-1 day'))"
    ),
    "update_settled_at_before_created_at": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (100, 1, 100);"
        "UPDATE split_share SET status = 'pago', settled_at = datetime('now', '-3 hours', '-1 day')"
        " WHERE transaction_id = 100"
    ),
    "update_created_at_after_settled_at": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents, status, settled_at)"
        " VALUES (100, 1, 100, 'pago', datetime('now', '-3 hours'));"
        "UPDATE transactions SET created_at = datetime('now', '-3 hours', '+1 day') WHERE id = 100"
    ),
    "adjustment_created_at_text": (
        "INSERT INTO balance_adjustment (delta_cents, reason, created_at)"
        " VALUES (100, 'Motivo válido aqui', 'abc')"
    ),
    "amount_real": insert_tx("", "").replace("1000", "10.5"),
    "amount_text": insert_tx("", "").replace("1000", "'abc'"),
    "share_real": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (100, 1, 5.5)"
    ),
    "share_text": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (100, 1, 'abc')"
    ),
    "adjustment_delta_real": (
        "INSERT INTO balance_adjustment (delta_cents, reason) VALUES (0.5, 'Motivo válido aqui')"
    ),
    "adjustment_delta_text": (
        "INSERT INTO balance_adjustment (delta_cents, reason) VALUES ('abc', 'Motivo válido aqui')"
    ),
    "initial_balance_real": "UPDATE user_profile SET initial_balance_cents = 100.5",
    "monthly_budget_text": "UPDATE user_profile SET monthly_budget_cents = 'abc'",
    "installment_number_real": insert_tx(
        ", installment_number, installment_total", ", 1.5, 3"
    ),
    "installment_total_text": insert_tx(
        ", installment_number, installment_total", ", 1, 'abc'"
    ),
    "percent_real": insert_tx(", split_mode, split_percent", ", 'percentage', 33.3"),
    "is_default_text": (
        "INSERT INTO category_rule (keyword, category_id, is_default) VALUES ('teste', 1, 'abc')"
    ),
    # UPDATE paths: editing either side must not break the existing share.
    "update_amount_below_share": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (100, 1, 500);"
        "UPDATE transactions SET amount_cents = 499 WHERE id = 100"
    ),
    "update_clear_split_mode": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (100, 1, 500);"
        "UPDATE transactions SET split_mode = NULL WHERE id = 100"
    ),
    "update_split_expense_to_income": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (100, 1, 500);"
        "UPDATE transactions SET type = 'income', split_mode = NULL WHERE id = 100"
    ),
    "update_share_above_amount": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (100, 1, 500);"
        "UPDATE split_share SET share_cents = 1001 WHERE transaction_id = 100"
    ),
    "update_share_to_income": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (100, 1, 500);"
        "UPDATE split_share SET transaction_id = 101 WHERE transaction_id = 100"
    ),
    "update_share_real": (
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (100, 1, 500);"
        "UPDATE split_share SET share_cents = 500.5 WHERE transaction_id = 100"
    ),
}


@pytest.mark.parametrize("sql", CONSTRAINT_CASES.values(), ids=CONSTRAINT_CASES.keys())
def test_constraint_rejects_invalid_data(db, sql):
    db.executescript(FIXTURE_ROWS)

    with pytest.raises(sqlite3.IntegrityError):
        db.executescript(sql)


def test_fixture_rows_are_valid(db):
    # Guards the cases above: they must fail because of the bad value only.
    db.executescript(FIXTURE_ROWS)
    db.execute(
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (100, 1, 1000)"
    )


def test_valid_edits_and_integer_like_values_are_accepted(db):
    # Guards the type and UPDATE cases: valid edits pass, and values that
    # INTEGER affinity converts losslessly ('1000', 10.0) are stored as integers.
    db.executescript(FIXTURE_ROWS)
    db.execute(
        "INSERT INTO split_share (transaction_id, person_id, share_cents) VALUES (100, 1, 500)"
    )
    db.execute("UPDATE transactions SET amount_cents = 500, split_mode = 'equal' WHERE id = 100")
    db.execute("UPDATE split_share SET share_cents = 250 WHERE transaction_id = 100")
    db.execute(
        "INSERT INTO transactions (type, description, amount_cents, occurred_on, created_at)"
        " VALUES ('expense', 'Teste', '1000', date('now'), datetime('now'))"
    )
    db.execute(
        "INSERT INTO balance_adjustment (delta_cents, reason) VALUES (10.0, 'Motivo válido aqui')"
    )

    for check_name, sql in CHECKS:
        assert db.execute(sql).fetchall() == [], check_name


def test_valid_settlements_are_accepted(db):
    # Guards the settled_at cases: closing a share at the very moment its
    # expense was recorded, or later, passes; reopening clears settled_at.
    db.executescript(FIXTURE_ROWS)
    created_at = db.execute("SELECT created_at FROM transactions WHERE id = 100").fetchone()[0]
    db.execute(
        "INSERT INTO split_share (transaction_id, person_id, share_cents, status, settled_at)"
        " VALUES (100, 1, 100, 'acertado', ?)",
        (created_at,),
    )
    db.execute(
        "UPDATE split_share SET status = 'pago', settled_at = datetime('now', '-3 hours')"
        " WHERE transaction_id = 100"
    )
    db.execute(
        "UPDATE split_share SET status = 'em_aberto', settled_at = NULL WHERE transaction_id = 100"
    )

    for check_name, sql in CHECKS:
        assert db.execute(sql).fetchall() == [], check_name


def test_schema_accepts_future_settled_at_and_checks_flag_it(db):
    # Not future-safe by design: "now" moves, so a CHECK or trigger cannot judge
    # it once and for all. The API always writes now; checks.sql catches the rest.
    db.executescript(FIXTURE_ROWS)
    db.execute(
        "INSERT INTO split_share (transaction_id, person_id, share_cents, status, settled_at)"
        " VALUES (100, 1, 100, 'pago', datetime('now', '-3 hours', '+1 day'))"
    )

    flagged = {name for name, sql in CHECKS if db.execute(sql).fetchall()}
    assert flagged == {"settled_at_not_in_future"}


def test_check_flags_settled_at_before_created_at(db):
    # The trigger blocks this; the check must still see it if the rule is
    # bypassed (triggers dropped, rows loaded by another tool).
    db.executescript(FIXTURE_ROWS)
    db.execute("DROP TRIGGER split_share_validate_insert")
    db.execute(
        "INSERT INTO split_share (transaction_id, person_id, share_cents, status, settled_at)"
        " VALUES (100, 1, 100, 'pago', datetime('now', '-3 hours', '-1 hour'))"
    )

    flagged = {name for name, sql in CHECKS if db.execute(sql).fetchall()}
    assert "settled_at_not_before_created_at" in flagged


def load_checks() -> list[tuple[str, str]]:
    text = (SQL_DIR / "checks.sql").read_text(encoding="utf-8")
    blocks = re.split(r"^-- check: (\S+)\n", text, flags=re.MULTILINE)[1:]
    return list(zip(blocks[::2], blocks[1::2]))


CHECKS = load_checks()


def test_checks_file_has_queries():
    assert len(CHECKS) >= 8


@pytest.mark.parametrize("sql", [sql for _, sql in CHECKS], ids=[name for name, _ in CHECKS])
def test_check_returns_no_rows_on_seed(db, sql):
    assert db.execute(sql).fetchall() == []


def count(db, sql: str) -> int:
    return db.execute(sql).fetchone()[0]


@pytest.mark.parametrize(
    "period_start",
    [
        "date('now', '-3 hours', 'weekday 0', '-6 days')",  # Monday of the current week
        "date('now', '-3 hours', 'start of month')",
        "date('now', '-3 hours', 'start of year')",
    ],
    ids=["week", "month", "year"],
)
def test_seed_covers_current_period(db, period_start):
    rows = count(
        db,
        f"SELECT count(*) FROM transactions WHERE occurred_on BETWEEN {period_start}"
        " AND date('now', '-3 hours')",
    )

    assert rows > 0


def test_seed_has_nothing_older_than_12_months_or_in_the_future(db):
    assert count(
        db,
        "SELECT count(*) FROM transactions"
        " WHERE occurred_on < date('now', '-3 hours', '-12 months')"
        " OR occurred_on > date('now', '-3 hours')",
    ) == 0
    assert count(
        db,
        "SELECT count(*) FROM split_share"
        " WHERE settled_at < datetime('now', '-3 hours', '-12 months')"
        " OR settled_at > datetime('now', '-3 hours')",
    ) == 0
    assert count(
        db,
        "SELECT count(*) FROM balance_adjustment"
        " WHERE created_at < datetime('now', '-3 hours', '-12 months')"
        " OR created_at > datetime('now', '-3 hours')",
    ) == 0


def test_seed_newest_dates_are_not_after_brasilia_today(db):
    # AC7: "today" is Brasília time (UTC-3), so a seed built on UTC 'now'
    # between 21:00 and 23:59 Brasília would be dated tomorrow.
    row = db.execute(
        "SELECT (SELECT max(occurred_on) FROM transactions),"
        " (SELECT max(date(settled_at)) FROM split_share),"
        " date('now', '-3 hours')"
    ).fetchone()
    newest_occurred_on, newest_settled_on, today = row

    assert newest_occurred_on is not None and newest_occurred_on <= today
    assert newest_settled_on is not None and newest_settled_on <= today


def test_seed_transactions_were_recorded_on_their_day_during_the_day(db):
    # The adjustment history compares same-day movements by created_at, so a
    # seeded row must look recorded on its own day, not at seed time.
    assert count(
        db,
        "SELECT count(*) FROM transactions"
        " WHERE date(created_at) IS NOT occurred_on"
        " OR created_at > datetime('now', '-3 hours')",
    ) == 0
    assert count(
        db,
        "SELECT count(*) FROM transactions"
        " WHERE created_at < datetime('now', '-3 hours', 'start of day')"
        " AND time(created_at) NOT BETWEEN '08:00:00' AND '17:59:59'",
    ) == 0


def test_seed_shares_were_settled_after_their_expense_during_the_day(db):
    # The adjustment history orders a settlement against an adjustment by
    # settled_at, so a seeded one must not predate its expense's created_at and
    # must look like a daytime payment (unless capped at a "now" before noon).
    assert count(
        db,
        "SELECT count(*) FROM split_share s JOIN transactions t ON t.id = s.transaction_id"
        " WHERE s.settled_at < t.created_at",
    ) == 0
    assert count(
        db,
        "SELECT count(*) FROM split_share"
        " WHERE settled_at < datetime('now', '-3 hours', 'start of day')"
        " AND time(settled_at) NOT BETWEEN '08:00:00' AND '17:59:59'",
    ) == 0


def test_seed_has_every_status_split_mode_and_incomes(db):
    statuses = {row[0] for row in db.execute("SELECT DISTINCT status FROM split_share")}
    modes = {
        row[0]
        for row in db.execute(
            "SELECT DISTINCT split_mode FROM transactions WHERE split_mode IS NOT NULL"
        )
    }

    assert statuses == {"em_aberto", "pago", "acertado"}
    assert modes == {"equal", "percentage", "fixed"}
    assert count(db, "SELECT count(*) FROM transactions WHERE type = 'income'") > 0
    assert count(db, "SELECT count(*) FROM transactions WHERE installment_total IS NOT NULL") > 0
    assert count(db, "SELECT count(*) FROM balance_adjustment") > 0


def test_seed_profile_friends_categories_and_rules(db):
    profile = db.execute("SELECT * FROM user_profile").fetchone()

    assert profile["display_name"] == "Usuário"
    assert profile["initial_balance_cents"] == 250000
    assert profile["monthly_budget_cents"] == 300000
    assert count(db, "SELECT count(*) FROM person") == 8
    assert count(db, "SELECT count(*) FROM category") == 8
    rules = dict(
        db.execute(
            "SELECT r.keyword, c.name FROM category_rule r JOIN category c ON c.id = r.category_id"
        ).fetchall()
    )
    assert rules["janta"] == "Alimentação"
    assert rules["combustivel"] == "Transporte"
    assert rules["uber"] == "Transporte"


def test_seed_computed_balance_is_positive(db):
    balance = count(
        db,
        """
        SELECT
            (SELECT initial_balance_cents FROM user_profile WHERE id = 1)
          + (SELECT coalesce(sum(amount_cents), 0) FROM transactions WHERE type = 'income')
          + (SELECT coalesce(sum(share_cents), 0) FROM split_share WHERE status = 'pago')
          - (SELECT coalesce(sum(amount_cents), 0) FROM transactions WHERE type = 'expense')
          + (SELECT coalesce(sum(delta_cents), 0) FROM balance_adjustment)
        """,
    )

    assert balance > 0
    # The seeded total does not depend on the start date (audits 003/004).
    assert balance == 706397


def test_connect_enables_foreign_keys_and_named_columns(database_path):
    conn = connect(database_path)
    try:
        row = conn.execute("PRAGMA foreign_keys").fetchone()
        assert row[0] == 1
        assert isinstance(row, sqlite3.Row)
    finally:
        conn.close()


def test_connect_waits_for_other_writers(database_path):
    conn = connect(database_path)
    try:
        assert conn.execute("PRAGMA busy_timeout").fetchone()[0] == 5000
    finally:
        conn.close()


def test_app_startup_rebuilds_database_file(database_path):
    Path(database_path).write_bytes(b"not a database")

    with TestClient(create_app(database_path)) as client:
        assert client.get("/health").status_code == 200

    conn = connect(database_path)
    try:
        assert conn.execute("SELECT id FROM user_profile").fetchone()["id"] == 1
    finally:
        conn.close()


def test_app_startup_discards_previous_data(database_path):
    with TestClient(create_app(database_path)):
        pass
    conn = connect(database_path)
    conn.execute("DELETE FROM balance_adjustment")
    conn.commit()
    conn.close()

    with TestClient(create_app(database_path)):
        pass

    conn = connect(database_path)
    try:
        assert conn.execute("SELECT count(*) FROM balance_adjustment").fetchone()[0] == 2
    finally:
        conn.close()


def test_brasilia_today_matches_sql_brasilia_date(db):
    sql_today = db.execute("SELECT date('now', '-3 hours')").fetchone()[0]

    assert brasilia_today().isoformat() == sql_today
