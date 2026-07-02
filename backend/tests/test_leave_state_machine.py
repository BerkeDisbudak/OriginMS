from datetime import timedelta

import pytest

from origin_ms.core.time import today_istanbul
from origin_ms.domain.enums import LeaveStatus
from origin_ms.domain.errors import DomainError
from origin_ms.domain.leave_state_machine import transition_leave_request


def test_state_machine_allows_documented_transitions() -> None:
    today = today_istanbul()
    future = today + timedelta(days=5)

    assert (
        transition_leave_request(
            current_status=None,
            target_status=LeaveStatus.PENDING,
            business_days=2,
            actor_is_requester=True,
            actor_is_hr_admin=False,
            start_date=future,
            today=today,
        ).pending_delta
        == 2
    )
    assert (
        transition_leave_request(
            current_status=LeaveStatus.PENDING,
            target_status=LeaveStatus.APPROVED,
            business_days=2,
            actor_is_requester=False,
            actor_is_hr_admin=False,
            start_date=future,
            today=today,
        ).used_delta
        == 2
    )
    assert (
        transition_leave_request(
            current_status=LeaveStatus.PENDING,
            target_status=LeaveStatus.REJECTED,
            business_days=2,
            actor_is_requester=False,
            actor_is_hr_admin=False,
            start_date=future,
            today=today,
            decision_reason="valid reason",
        ).pending_delta
        == -2
    )
    assert (
        transition_leave_request(
            current_status=LeaveStatus.PENDING,
            target_status=LeaveStatus.CANCELLED,
            business_days=2,
            actor_is_requester=True,
            actor_is_hr_admin=False,
            start_date=future,
            today=today,
        ).pending_delta
        == -2
    )
    assert (
        transition_leave_request(
            current_status=LeaveStatus.APPROVED,
            target_status=LeaveStatus.CANCELLED,
            business_days=2,
            actor_is_requester=False,
            actor_is_hr_admin=True,
            start_date=future,
            today=today,
        ).used_delta
        == -2
    )


@pytest.mark.parametrize(
    ("current_status", "target_status"),
    [
        (LeaveStatus.APPROVED, LeaveStatus.REJECTED),
        (LeaveStatus.REJECTED, LeaveStatus.APPROVED),
        (LeaveStatus.REJECTED, LeaveStatus.CANCELLED),
        (LeaveStatus.CANCELLED, LeaveStatus.APPROVED),
        (LeaveStatus.CANCELLED, LeaveStatus.REJECTED),
        (LeaveStatus.PENDING, LeaveStatus.PENDING),
    ],
)
def test_state_machine_forbidden_transitions_return_conflict(
    current_status: LeaveStatus,
    target_status: LeaveStatus,
) -> None:
    today = today_istanbul()

    with pytest.raises(DomainError) as error:
        transition_leave_request(
            current_status=current_status,
            target_status=target_status,
            business_days=1,
            actor_is_requester=False,
            actor_is_hr_admin=False,
            start_date=today + timedelta(days=5),
            today=today,
            decision_reason="valid reason",
        )

    assert error.value.status_code == 409


def test_reject_requires_reason() -> None:
    today = today_istanbul()

    with pytest.raises(DomainError) as error:
        transition_leave_request(
            current_status=LeaveStatus.PENDING,
            target_status=LeaveStatus.REJECTED,
            business_days=1,
            actor_is_requester=False,
            actor_is_hr_admin=False,
            start_date=today + timedelta(days=5),
            today=today,
            decision_reason="no",
        )

    assert error.value.status_code == 422
