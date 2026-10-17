"""Pure split math (Business Rule 7), tested without a database."""

import pytest

from app.services.transactions import friend_share


# --- equal ------------------------------------------------------------------


@pytest.mark.parametrize(
    ("amount", "friend"),
    [
        (10000, 5000),  # R$ 100,00 -> R$ 50,00 each
        (10001, 5000),  # R$ 100,01 -> friend R$ 50,00, user R$ 50,01
        (18790, 9395),
        (2, 1),
        (1, 0),  # 1 cent: the friend gets 0, the user keeps the cent
    ],
)
def test_equal_gives_friend_the_floor_of_half(amount, friend):
    assert friend_share(amount, "equal") == friend
    assert amount - friend_share(amount, "equal") >= friend


def test_equal_remainder_cent_goes_to_user():
    friend = friend_share(10001, "equal")

    assert friend == 5000
    assert 10001 - friend == 5001


# --- percentage -------------------------------------------------------------


@pytest.mark.parametrize(
    ("amount", "percent", "friend"),
    [
        (10000, 0, 0),
        (10000, 33, 3300),
        (10000, 50, 5000),
        (10000, 100, 10000),
        (34280, 40, 13712),
        (21437, 50, 10718),  # 10718.5 rounds down
        (15990, 25, 3997),  # 3997.5 rounds down
        (100, 33, 33),
        (1, 99, 0),  # 0.99 cent rounds down to 0
    ],
)
def test_percentage_gives_friend_the_floor_of_the_percent(amount, percent, friend):
    assert friend_share(amount, "percentage", percent=percent) == friend


# --- fixed ------------------------------------------------------------------


@pytest.mark.parametrize(("amount", "share"), [(10000, 1), (10000, 9000), (10000, 10000), (1, 1)])
def test_fixed_returns_the_given_share(amount, share):
    assert friend_share(amount, "fixed", share=share) == share


# --- invalid combinations ---------------------------------------------------


@pytest.mark.parametrize(
    ("amount", "mode", "percent", "share"),
    [
        (0, "equal", None, None),
        (-100, "equal", None, None),
        (100, "equal", 50, None),
        (100, "equal", None, 10),
        (100, "percentage", None, None),
        (100, "percentage", -1, None),
        (100, "percentage", 101, None),
        (100, "percentage", 50, 10),
        (100, "fixed", None, None),
        (100, "fixed", None, 0),
        (100, "fixed", None, -1),
        (100, "fixed", None, 101),
        (100, "fixed", 50, 10),
        (100, "group", None, None),
        (100.0, "equal", None, None),
        (100, "percentage", 33.3, None),
        (100, "fixed", None, 10.0),
        (True, "equal", None, None),
    ],
    ids=[
        "amount_zero",
        "amount_negative",
        "equal_with_percent",
        "equal_with_share",
        "percentage_without_percent",
        "percentage_below_0",
        "percentage_above_100",
        "percentage_with_share",
        "fixed_without_share",
        "fixed_share_zero",
        "fixed_share_negative",
        "fixed_share_above_amount",
        "fixed_with_percent",
        "unknown_mode",
        "float_amount",
        "float_percent",
        "float_share",
        "bool_amount",
    ],
)
def test_invalid_combinations_raise_value_error(amount, mode, percent, share):
    with pytest.raises(ValueError):
        friend_share(amount, mode, percent=percent, share=share)


# --- property: the two shares always sum to the amount ----------------------


def sample_amounts() -> list[int]:
    small = range(1, 2001)  # every amount up to R$ 20,00
    large = [10**k + d for k in range(3, 13) for d in (-1, 0, 1) if 10**k + d <= 10**12]
    return [*small, *large, 99999, 123457, 10**12]


@pytest.mark.parametrize("percent", range(0, 101))
def test_percentage_shares_always_sum_to_amount(percent):
    for amount in sample_amounts():
        friend = friend_share(amount, "percentage", percent=percent)
        user = amount - friend
        assert 0 <= friend <= amount
        assert friend + user == amount
        assert friend == amount * percent // 100


def test_equal_and_fixed_shares_always_sum_to_amount():
    for amount in sample_amounts():
        friend = friend_share(amount, "equal")
        user = amount - friend
        assert friend + user == amount
        assert 0 <= user - friend <= 1  # the user keeps at most the one odd cent

        for share in {1, amount // 3 or 1, amount}:
            friend = friend_share(amount, "fixed", share=share)
            assert friend + (amount - friend) == amount
            assert 0 < friend <= amount
