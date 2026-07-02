from datetime import date

from origin_ms.core.ids import new_id
from origin_ms.core.time import today_istanbul, utc_now
from origin_ms.domain.entities import Actor, Employee, LeaveBalance, LeaveRequest
from origin_ms.domain.enums import LeaveStatus, LeaveType, Role
from origin_ms.domain.errors import DomainError, FieldError, field_error
from origin_ms.domain.leave_policy import business_days_between
from origin_ms.domain.leave_state_machine import transition_leave_request
from origin_ms.domain.permissions import (
    can_cancel_leave_request_endpoint,
    can_create_leave_request,
    can_decide_leave_request,
    can_list_all_leave_requests,
    can_read_leave_request,
)
from origin_ms.services.audit_service import record_audit
from origin_ms.services.notification_stub import notify_leave_request_created
from origin_ms.services.unit_of_work import UnitOfWork


class LeaveService:
    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    def create_leave_request(
        self,
        *,
        actor: Actor,
        employee_id: str,
        leave_type: LeaveType,
        start_date: date,
        end_date: date,
        note: str | None,
        request_id: str,
        ip: str | None,
    ) -> LeaveRequest:
        employee = self._get_employee(employee_id)
        if not can_create_leave_request(actor, employee_id):
            raise DomainError(
                detail="Cannot create leave request for this employee.",
                status_code=403,
                title="Forbidden",
            )

        self._validate_leave_input(
            employee_id=employee_id,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
        )
        business_days = business_days_between(
            start_date,
            end_date,
            list(self._uow.public_holidays.values()),
        )
        if business_days <= 0:
            raise DomainError(
                detail="Leave request must include at least one business day.",
                errors=[
                    field_error(
                        "start_date", "no_business_days", "No business days in selected range."
                    )
                ],
                status_code=422,
                title="Validation failed",
            )

        balance = self._get_balance(employee, start_date.year)
        if leave_type == LeaveType.ANNUAL and balance.remaining < business_days:
            raise DomainError(
                detail="Insufficient leave balance.",
                errors=[
                    field_error(
                        "start_date",
                        "insufficient_balance",
                        "Remaining annual leave is lower than requested business days.",
                    )
                ],
                status_code=422,
                title="Validation failed",
            )

        transition = transition_leave_request(
            current_status=None,
            target_status=LeaveStatus.PENDING,
            business_days=business_days,
            actor_is_requester=True,
            actor_is_hr_admin=actor.role == Role.HR_ADMIN,
            start_date=start_date,
            today=today_istanbul(),
        )
        request = LeaveRequest(
            id=new_id("lvr"),
            employee_id=employee_id,
            type=leave_type,
            start_date=start_date,
            end_date=end_date,
            business_days=business_days,
            note=note,
            status=LeaveStatus.PENDING,
            created_at=utc_now(),
        )
        self._uow.leave_requests[request.id] = request
        self._apply_balance_delta(
            balance, pending_delta=transition.pending_delta, used_delta=transition.used_delta
        )
        record_audit(
            self._uow,
            actor=actor,
            action="leave_request.create",
            entity_type="leave_request",
            entity_id=request.id,
            before={},
            after=request.model_dump(mode="json"),
            request_id=request_id,
            ip=ip,
        )
        notify_leave_request_created(request)
        return request

    def list_leave_requests(
        self,
        *,
        actor: Actor,
        status: LeaveStatus | None,
        cursor: str | None,
        limit: int,
    ) -> tuple[list[LeaveRequest], str | None]:
        visible = [
            request
            for request in self._uow.leave_requests.values()
            if self._can_actor_see_request(actor, request)
            and (status is None or request.status == status)
            and (cursor is None or request.id > cursor)
        ]
        visible.sort(key=lambda request: (request.created_at, request.id))
        bounded_limit = min(max(limit, 1), 100)
        page = visible[:bounded_limit]
        next_cursor = page[-1].id if len(visible) > bounded_limit and page else None
        return page, next_cursor

    def get_leave_request(self, *, actor: Actor, leave_request_id: str) -> LeaveRequest:
        request = self._get_request(leave_request_id)
        employee = self._get_employee(request.employee_id)
        if not can_read_leave_request(actor, request, employee):
            raise DomainError(
                detail="Leave request is outside actor scope.", status_code=403, title="Forbidden"
            )
        return request

    def approve_leave_request(
        self, *, actor: Actor, leave_request_id: str, request_id: str, ip: str | None
    ) -> LeaveRequest:
        request = self._get_request(leave_request_id)
        employee = self._get_employee(request.employee_id)
        if not can_decide_leave_request(actor, employee):
            raise DomainError(
                detail="Cannot approve this leave request.", status_code=403, title="Forbidden"
            )
        return self._transition(
            actor=actor,
            request=request,
            target_status=LeaveStatus.APPROVED,
            decision_reason=None,
            request_id=request_id,
            ip=ip,
        )

    def reject_leave_request(
        self,
        *,
        actor: Actor,
        leave_request_id: str,
        reason: str,
        request_id: str,
        ip: str | None,
    ) -> LeaveRequest:
        request = self._get_request(leave_request_id)
        employee = self._get_employee(request.employee_id)
        if not can_decide_leave_request(actor, employee):
            raise DomainError(
                detail="Cannot reject this leave request.", status_code=403, title="Forbidden"
            )
        return self._transition(
            actor=actor,
            request=request,
            target_status=LeaveStatus.REJECTED,
            decision_reason=reason,
            request_id=request_id,
            ip=ip,
        )

    def cancel_leave_request(
        self, *, actor: Actor, leave_request_id: str, request_id: str, ip: str | None
    ) -> LeaveRequest:
        request = self._get_request(leave_request_id)
        if not can_cancel_leave_request_endpoint(actor, request):
            raise DomainError(
                detail="Only requester can cancel through this endpoint.",
                status_code=403,
                title="Forbidden",
            )
        return self._transition(
            actor=actor,
            request=request,
            target_status=LeaveStatus.CANCELLED,
            decision_reason=None,
            request_id=request_id,
            ip=ip,
        )

    def cancel_approved_as_hr_admin(
        self, *, actor: Actor, leave_request_id: str, request_id: str, ip: str | None
    ) -> LeaveRequest:
        request = self._get_request(leave_request_id)
        if actor.role != Role.HR_ADMIN:
            raise DomainError(
                detail="Only hr_admin can cancel approved leave.",
                status_code=403,
                title="Forbidden",
            )
        return self._transition(
            actor=actor,
            request=request,
            target_status=LeaveStatus.CANCELLED,
            decision_reason=None,
            request_id=request_id,
            ip=ip,
        )

    def _transition(
        self,
        *,
        actor: Actor,
        request: LeaveRequest,
        target_status: LeaveStatus,
        decision_reason: str | None,
        request_id: str,
        ip: str | None,
    ) -> LeaveRequest:
        before = request.model_dump(mode="json")
        transition = transition_leave_request(
            current_status=request.status,
            target_status=target_status,
            business_days=request.business_days,
            actor_is_requester=actor.employee_id == request.employee_id,
            actor_is_hr_admin=actor.role == Role.HR_ADMIN,
            start_date=request.start_date,
            today=today_istanbul(),
            decision_reason=decision_reason,
        )
        balance = self._uow.leave_balances.get((request.employee_id, request.start_date.year))
        if balance is not None:
            self._apply_balance_delta(
                balance,
                pending_delta=transition.pending_delta,
                used_delta=transition.used_delta,
            )

        now = utc_now()
        updated = request.model_copy(
            update={
                "status": target_status,
                "decided_by": actor.actor_id
                if target_status in {LeaveStatus.APPROVED, LeaveStatus.REJECTED}
                else request.decided_by,
                "decided_at": now
                if target_status in {LeaveStatus.APPROVED, LeaveStatus.REJECTED}
                else request.decided_at,
                "decision_reason": decision_reason
                if target_status == LeaveStatus.REJECTED
                else request.decision_reason,
                "cancelled_at": now
                if target_status == LeaveStatus.CANCELLED
                else request.cancelled_at,
            }
        )
        self._uow.leave_requests[updated.id] = updated
        record_audit(
            self._uow,
            actor=actor,
            action=f"leave_request.{target_status.value}",
            entity_type="leave_request",
            entity_id=updated.id,
            before=before,
            after=updated.model_dump(mode="json"),
            request_id=request_id,
            ip=ip,
        )
        return updated

    def _validate_leave_input(
        self,
        *,
        employee_id: str,
        leave_type: LeaveType,
        start_date: date,
        end_date: date,
    ) -> None:
        errors: list[FieldError] = []
        today = today_istanbul()
        if end_date < start_date:
            errors.append(
                field_error("end_date", "date_order", "End date must be on or after start date.")
            )
        if leave_type == LeaveType.ANNUAL and start_date < today:
            errors.append(
                field_error("start_date", "past_annual", "Annual leave cannot start in the past.")
            )
        if self._has_overlap(employee_id=employee_id, start_date=start_date, end_date=end_date):
            errors.append(
                field_error(
                    "start_date",
                    "overlap",
                    "Leave request overlaps an existing non-cancelled request.",
                )
            )
        if errors:
            raise DomainError(
                detail="Leave request validation failed.",
                errors=errors,
                status_code=422,
                title="Validation failed",
            )

    def _has_overlap(self, *, employee_id: str, start_date: date, end_date: date) -> bool:
        return any(
            request.employee_id == employee_id
            and request.status != LeaveStatus.CANCELLED
            and request.start_date <= end_date
            and start_date <= request.end_date
            for request in self._uow.leave_requests.values()
        )

    def _can_actor_see_request(self, actor: Actor, request: LeaveRequest) -> bool:
        if can_list_all_leave_requests(actor):
            return True
        employee = self._get_employee(request.employee_id)
        return can_read_leave_request(actor, request, employee)

    def _get_employee(self, employee_id: str) -> Employee:
        employee = self._uow.employees.get(employee_id)
        if employee is None:
            raise DomainError(detail="Employee not found.", status_code=404, title="Not found")
        return employee

    def _get_request(self, leave_request_id: str) -> LeaveRequest:
        request = self._uow.leave_requests.get(leave_request_id)
        if request is None:
            raise DomainError(detail="Leave request not found.", status_code=404, title="Not found")
        return request

    def _get_balance(self, employee: Employee, year: int) -> LeaveBalance:
        balance = self._uow.leave_balances.get((employee.id, year))
        if balance is None:
            raise DomainError(detail="Leave balance not found.", status_code=404, title="Not found")
        return balance

    def _apply_balance_delta(
        self, balance: LeaveBalance, *, pending_delta: int, used_delta: int
    ) -> None:
        updated = balance.model_copy(
            update={
                "pending_days": balance.pending_days + pending_delta,
                "used_days": balance.used_days + used_delta,
            }
        )
        self._uow.leave_balances[(balance.employee_id, balance.year)] = updated
