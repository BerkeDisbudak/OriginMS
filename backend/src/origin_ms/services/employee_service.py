from typing import Any

from origin_ms.domain.entities import Actor, Employee, LeaveBalance, LeaveRequest
from origin_ms.domain.enums import LeaveStatus, Role
from origin_ms.domain.errors import DomainError, field_error
from origin_ms.domain.permissions import can_read_employee, can_update_employee
from origin_ms.services.audit_service import record_audit
from origin_ms.services.unit_of_work import UnitOfWork


class EmployeeService:
    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    def get_employee(
        self, *, actor: Actor, employee_id: str, request_id: str, ip: str | None
    ) -> Employee:
        employee = self._get_employee(employee_id)
        if not can_read_employee(actor, employee):
            raise DomainError(
                detail="Employee is outside actor scope.", status_code=403, title="Forbidden"
            )
        if (
            actor.role in {Role.HR_ADMIN, Role.EXECUTIVE, Role.ADMIN}
            and actor.employee_id != employee.id
        ):
            record_audit(
                self._uow,
                actor=actor,
                action="employee.read",
                entity_type="employee",
                entity_id=employee.id,
                before={},
                after={"id": employee.id},
                request_id=request_id,
                ip=ip,
            )
        return employee

    def get_leave_balance(
        self, *, actor: Actor, employee_id: str, year: int, request_id: str, ip: str | None
    ) -> LeaveBalance:
        employee = self.get_employee(
            actor=actor, employee_id=employee_id, request_id=request_id, ip=ip
        )
        balance = self._uow.leave_balances.get((employee.id, year))
        if balance is None:
            raise DomainError(detail="Leave balance not found.", status_code=404, title="Not found")
        return balance

    def list_employees(
        self, *, actor: Actor, cursor: str | None, limit: int
    ) -> tuple[list[Employee], str | None]:
        visible = [
            employee
            for employee in self._uow.employees.values()
            if can_read_employee(actor, employee) and (cursor is None or employee.id > cursor)
        ]
        visible.sort(key=lambda employee: employee.id)
        bounded_limit = min(max(limit, 1), 100)
        page = visible[:bounded_limit]
        next_cursor = page[-1].id if len(visible) > bounded_limit and page else None
        return page, next_cursor

    def update_employee(
        self,
        *,
        actor: Actor,
        employee_id: str,
        patch: dict[str, Any],
        request_id: str,
        ip: str | None,
    ) -> Employee:
        employee = self._get_employee(employee_id)
        if not can_update_employee(actor):
            raise DomainError(
                detail="Only hr_admin can update employees.", status_code=403, title="Forbidden"
            )

        new_email = patch.get("email")
        if (
            new_email is not None
            and new_email != employee.email
            and any(
                other.id != employee.id and other.email == new_email
                for other in self._uow.employees.values()
            )
        ):
            raise DomainError(
                detail="Employee update validation failed.",
                errors=[
                    field_error(
                        "email", "email_taken", "Email is already in use by another employee."
                    )
                ],
                status_code=422,
                title="Validation failed",
            )

        if (
            "manager_id" in patch
            and patch["manager_id"] is not None
            and patch["manager_id"] not in self._uow.employees
        ):
            raise DomainError(
                detail="Employee update validation failed.",
                errors=[
                    field_error(
                        "manager_id",
                        "unknown_manager",
                        "Manager id does not reference an existing employee.",
                    )
                ],
                status_code=422,
                title="Validation failed",
            )

        if (
            "manager_id" in patch
            and patch["manager_id"] is not None
            and patch["manager_id"] == employee.id
        ):
            raise DomainError(
                detail="Employee update validation failed.",
                errors=[
                    field_error(
                        "manager_id",
                        "self_management",
                        "An employee cannot be their own manager.",
                    )
                ],
                status_code=422,
                title="Validation failed",
            )

        if (
            "manager_id" in patch
            and patch["manager_id"] is not None
            and self._creates_manager_cycle(
                employee_id=employee.id, proposed_manager_id=patch["manager_id"]
            )
        ):
            raise DomainError(
                detail="Employee update validation failed.",
                errors=[
                    field_error(
                        "manager_id",
                        "circular_management",
                        "Manager assignment would create a circular reporting chain.",
                    )
                ],
                status_code=422,
                title="Validation failed",
            )

        updated = employee.model_copy(update=patch)
        self._uow.employees[updated.id] = updated

        before_full = employee.model_dump(mode="json")
        after_full = updated.model_dump(mode="json")
        changed_keys = {key for key in patch if before_full[key] != after_full[key]}
        record_audit(
            self._uow,
            actor=actor,
            action="employee.update",
            entity_type="employee",
            entity_id=updated.id,
            before={key: before_full[key] for key in changed_keys},
            after={key: after_full[key] for key in changed_keys},
            request_id=request_id,
            ip=ip,
        )
        return updated

    def _creates_manager_cycle(self, *, employee_id: str, proposed_manager_id: str) -> bool:
        current: str | None = proposed_manager_id
        steps = 0
        limit = len(self._uow.employees)
        while current is not None and steps <= limit:
            if current == employee_id:
                return True
            manager = self._uow.employees.get(current)
            current = manager.manager_id if manager is not None else None
            steps += 1
        return False

    def list_employee_leave_history(
        self,
        *,
        actor: Actor,
        employee_id: str,
        status: LeaveStatus | None,
        cursor: str | None,
        limit: int,
        request_id: str,
        ip: str | None,
    ) -> tuple[list[LeaveRequest], str | None]:
        self.get_employee(actor=actor, employee_id=employee_id, request_id=request_id, ip=ip)
        visible = [
            request
            for request in self._uow.leave_requests.values()
            if request.employee_id == employee_id
            and (status is None or request.status == status)
            and (cursor is None or request.id < cursor)
        ]
        visible.sort(key=lambda request: request.id, reverse=True)
        bounded_limit = min(max(limit, 1), 100)
        page = visible[:bounded_limit]
        next_cursor = page[-1].id if len(visible) > bounded_limit and page else None
        return page, next_cursor

    def _get_employee(self, employee_id: str) -> Employee:
        employee = self._uow.employees.get(employee_id)
        if employee is None:
            raise DomainError(detail="Employee not found.", status_code=404, title="Not found")
        return employee
