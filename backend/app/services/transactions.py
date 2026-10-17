"""Transactions (expenses and incomes) and the strictly 1-to-1 split.

Business Rule 7: the request gives one number for the friend, the friend's
share is computed from it, and the user's share is always amount - friend
share, so the two sum to the total by construction. Integer arithmetic only.
"""

from typing import Literal

SplitMode = Literal["equal", "percentage", "fixed"]


def _is_int(value: object) -> bool:
    # bool is a subclass of int in Python; True must not count as 1 cent.
    return isinstance(value, int) and not isinstance(value, bool)


def friend_share(
    amount: int,
    mode: SplitMode,
    percent: int | None = None,
    share: int | None = None,
) -> int:
    """The friend's share in cents. The user keeps amount - friend_share.

    - equal: floor(amount / 2); the odd cent stays with the user.
    - percentage: floor(amount * percent / 100), percent a whole 0..100.
    - fixed: the given share, 0 < share <= amount.

    Raises ValueError for any other combination. Pydantic rejects these first;
    this is the last check before money is computed.
    """
    if not _is_int(amount) or amount <= 0:
        raise ValueError("amount must be a positive integer number of cents")

    if mode == "equal":
        if percent is not None or share is not None:
            raise ValueError("equal mode takes no percent or share")
        return amount // 2

    if mode == "percentage":
        if share is not None:
            raise ValueError("percentage mode takes no share")
        if not _is_int(percent) or not 0 <= percent <= 100:
            raise ValueError("percent must be a whole number from 0 to 100")
        return amount * percent // 100

    if mode == "fixed":
        if percent is not None:
            raise ValueError("fixed mode takes no percent")
        if not _is_int(share) or not 0 < share <= amount:
            raise ValueError("share must be an integer with 0 < share <= amount")
        return share

    raise ValueError(f"unknown split mode: {mode!r}")
