from origin_ms.domain.entities import Actor, Employee, LeaveBalance
from origin_ms.domain.enums import Role
from origin_ms.domain.errors import DomainError
from origin_ms.domain.permissions import can_read_employee
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

    def _get_employee(self, employee_id: str) -> Employee:
        employee = self._uow.employees.get(employee_id)
        if employee is None:
            raise DomainError(detail="Employee not found.", status_code=404, title="Not found")
        return employee
