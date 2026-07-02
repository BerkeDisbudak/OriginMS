from dataclasses import dataclass
from datetime import date

from .enums import LeaveStatus
from .errors import DomainError, field_error


@dataclass(frozen=True)
class TransitionResult:
    pending_delta: int = 0
    used_delta: int = 0


def transition_leave_request(
    *,
    current_status: LeaveStatus | None,
    target_status: LeaveStatus,
    business_days: int,
    actor_is_requester: bool,
    actor_is_hr_admin: bool,
    start_date: date,
    today: date,
    decision_reason: str | None = None,
) -> TransitionResult:
    if current_status is None and target_status == LeaveStatus.PENDING:
        return TransitionResult(pending_delta=business_days)

    if current_status == LeaveStatus.PENDING and target_status == LeaveStatus.APPROVED:
        if actor_is_requester:
            raise _forbidden("requester cannot approve own leave request")
        return TransitionResult(pending_delta=-business_days, used_delta=business_days)

    if current_status == LeaveStatus.PENDING and target_status == LeaveStatus.REJECTED:
        if actor_is_requester:
            raise _forbidden("requester cannot reject own leave request")
        if decision_reason is None or len(decision_reason.strip()) < 5:
            raise DomainError(
                detail="Decision reason is required.",
                errors=[
                    field_error("reason", "too_short", "Reason must be at least 5 characters.")
                ],
                status_code=422,
                title="Validation failed",
            )
        return TransitionResult(pending_delta=-business_days)

    if current_status == LeaveStatus.PENDING and target_status == LeaveStatus.CANCELLED:
        if not actor_is_requester:
            raise _forbidden("only requester can cancel pending leave request")
        return TransitionResult(pending_delta=-business_days)

    if current_status == LeaveStatus.APPROVED and target_status == LeaveStatus.CANCELLED:
        if not actor_is_hr_admin:
            raise _forbidden("only hr_admin can cancel an approved leave request")
        if start_date <= today:
            raise DomainError(
                detail="Approved leave can only be cancelled before its start date.",
                status_code=409,
                title="Transition conflict",
            )
        return TransitionResult(used_delta=-business_days)

    raise _conflict(current_status=current_status, target_status=target_status)


def _forbidden(detail: str) -> DomainError:
    return DomainError(detail=detail, status_code=403, title="Forbidden")


def _conflict(*, current_status: LeaveStatus | None, target_status: LeaveStatus) -> DomainError:
    current = "none" if current_status is None else current_status.value
    return DomainError(
        detail=f"Cannot transition leave request from {current} to {target_status.value}.",
        status_code=409,
        title="Transition conflict",
    )
