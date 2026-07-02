from collections.abc import Iterable
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Protocol

from origin_ms.core.security import hash_password
from origin_ms.core.time import today_istanbul, utc_now
from origin_ms.domain.entities import (
    AuditEvent,
    Department,
    Employee,
    LeaveBalance,
    LeaveRequest,
    PublicHoliday,
    User,
)
from origin_ms.domain.enums import EmployeeStatus, EmploymentType, LeaveStatus, LeaveType, Role
from origin_ms.domain.leave_policy import ensure_balance


class UnitOfWork(Protocol):
    departments: dict[str, Department]
    employees: dict[str, Employee]
    users: dict[str, User]
    leave_balances: dict[tuple[str, int], LeaveBalance]
    public_holidays: dict[str, PublicHoliday]
    leave_requests: dict[str, LeaveRequest]
    audit_events: list[AuditEvent]


@dataclass
class InMemoryUnitOfWork:
    departments: dict[str, Department] = field(default_factory=dict[str, Department])
    employees: dict[str, Employee] = field(default_factory=dict[str, Employee])
    users: dict[str, User] = field(default_factory=dict[str, User])
    leave_balances: dict[tuple[str, int], LeaveBalance] = field(
        default_factory=dict[tuple[str, int], LeaveBalance]
    )
    public_holidays: dict[str, PublicHoliday] = field(default_factory=dict[str, PublicHoliday])
    leave_requests: dict[str, LeaveRequest] = field(default_factory=dict[str, LeaveRequest])
    audit_events: list[AuditEvent] = field(default_factory=list[AuditEvent])

    def clone(self) -> "InMemoryUnitOfWork":
        return deepcopy(self)


def build_demo_uow(*, password: str = "password") -> InMemoryUnitOfWork:
    today = today_istanbul()
    uow = InMemoryUnitOfWork()

    departments = [
        Department(id="dep_hr", name="Human Resources"),
        Department(id="dep_ops", name="Operations"),
        Department(id="dep_fin", name="Finance"),
    ]
    for department in departments:
        uow.departments[department.id] = department

    hr = Employee(
        id="emp_hr",
        employee_no="EMP-0001",
        first_name="Hale",
        last_name="Yilmaz",
        email="hr@origin-fgl.local",
        department_id="dep_hr",
        title="HR Admin",
        hire_date=date(today.year - 8, 1, 10),
        birth_date=date(1985, 5, 10),
        status=EmployeeStatus.ACTIVE,
    )
    manager = Employee(
        id="emp_manager",
        employee_no="EMP-0002",
        first_name="Mert",
        last_name="Kaya",
        email="manager@origin-fgl.local",
        department_id="dep_ops",
        title="Operations Manager",
        manager_id=hr.id,
        hire_date=date(today.year - 6, 2, 2),
        birth_date=date(1988, 7, 1),
        status=EmployeeStatus.ACTIVE,
    )
    employee = Employee(
        id="emp_employee",
        employee_no="EMP-0003",
        first_name="Elif",
        last_name="Demir",
        email="employee@origin-fgl.local",
        department_id="dep_ops",
        title="Operations Specialist",
        manager_id=manager.id,
        hire_date=date(today.year - 2, 3, 15),
        birth_date=date(1996, 4, 4),
        status=EmployeeStatus.ACTIVE,
    )

    people = [hr, manager, employee]
    for index in range(4, 31):
        dept = departments[index % len(departments)]
        people.append(
            Employee(
                id=f"emp_seed_{index:02d}",
                employee_no=f"EMP-{index:04d}",
                first_name=f"Demo{index}",
                last_name="Employee",
                email=f"employee{index}@origin-fgl.local",
                department_id=dept.id,
                title="Team Member",
                manager_id=manager.id if dept.id == "dep_ops" else hr.id,
                employment_type=EmploymentType.FULL_TIME,
                hire_date=date(today.year - 1 - (index % 7), 1, min(index, 28)),
                birth_date=date(1990, (index % 12) + 1, min(index, 28)),
                status=EmployeeStatus.ACTIVE,
            )
        )

    for person in people:
        uow.employees[person.id] = person
        balance = ensure_balance(person, today.year, today)
        uow.leave_balances[(person.id, today.year)] = balance

    uow.departments["dep_hr"] = uow.departments["dep_hr"].model_copy(update={"manager_id": hr.id})
    uow.departments["dep_ops"] = uow.departments["dep_ops"].model_copy(
        update={"manager_id": manager.id}
    )

    for holiday in _tr_holidays(today.year):
        uow.public_holidays[holiday.id] = holiday

    password_hash = hash_password(password)
    users = [
        User(
            id="usr_hr",
            email="hr@origin-fgl.local",
            password_hash=password_hash,
            role=Role.HR_ADMIN,
            employee_id=hr.id,
        ),
        User(
            id="usr_manager",
            email="manager@origin-fgl.local",
            password_hash=password_hash,
            role=Role.MANAGER,
            employee_id=manager.id,
        ),
        User(
            id="usr_employee",
            email="employee@origin-fgl.local",
            password_hash=password_hash,
            role=Role.EMPLOYEE,
            employee_id=employee.id,
        ),
        User(
            id="usr_exec",
            email="executive@origin-fgl.local",
            password_hash=password_hash,
            role=Role.EXECUTIVE,
            employee_id=None,
        ),
    ]
    for user in users:
        uow.users[user.id] = user

    _seed_leave_requests(uow, employees=people, today=today)
    return uow


def _tr_holidays(year: int) -> list[PublicHoliday]:
    return [
        PublicHoliday(id=f"hol_{year}_0101", date=date(year, 1, 1), name="New Year"),
        PublicHoliday(id=f"hol_{year}_0423", date=date(year, 4, 23), name="National Sovereignty"),
        PublicHoliday(id=f"hol_{year}_0501", date=date(year, 5, 1), name="Labour Day"),
        PublicHoliday(
            id=f"hol_{year}_0519", date=date(year, 5, 19), name="Commemoration of Ataturk"
        ),
        PublicHoliday(id=f"hol_{year}_0715", date=date(year, 7, 15), name="Democracy Day"),
        PublicHoliday(id=f"hol_{year}_0830", date=date(year, 8, 30), name="Victory Day"),
        PublicHoliday(id=f"hol_{year}_1029", date=date(year, 10, 29), name="Republic Day"),
    ]


def _seed_leave_requests(
    uow: InMemoryUnitOfWork, *, employees: Iterable[Employee], today: date
) -> None:
    employees_list = list(employees)
    created_at = utc_now()
    pending_seed = employees_list[2:14]
    decided_seed = employees_list[14:22]

    for offset, person in enumerate(pending_seed, start=1):
        start = today + timedelta(days=10 + offset)
        request = LeaveRequest(
            id=f"lvr_pending_{offset:02d}",
            employee_id=person.id,
            type=LeaveType.ANNUAL,
            start_date=start,
            end_date=start,
            business_days=1,
            note="Seed pending request",
            status=LeaveStatus.PENDING,
            created_at=created_at,
        )
        uow.leave_requests[request.id] = request
        balance = uow.leave_balances[(person.id, today.year)]
        uow.leave_balances[(person.id, today.year)] = balance.model_copy(
            update={"pending_days": balance.pending_days + 1}
        )

    for offset, person in enumerate(decided_seed, start=1):
        start = today + timedelta(days=30 + offset)
        status = LeaveStatus.APPROVED if offset <= 4 else LeaveStatus.REJECTED
        request = LeaveRequest(
            id=f"lvr_decided_{offset:02d}",
            employee_id=person.id,
            type=LeaveType.ANNUAL,
            start_date=start,
            end_date=start,
            business_days=1,
            note="Seed decided request",
            status=status,
            decided_by="usr_hr",
            decided_at=created_at,
            decision_reason="Seed rejection" if status == LeaveStatus.REJECTED else None,
            created_at=created_at,
        )
        uow.leave_requests[request.id] = request
        if status == LeaveStatus.APPROVED:
            balance = uow.leave_balances[(person.id, today.year)]
            uow.leave_balances[(person.id, today.year)] = balance.model_copy(
                update={"used_days": balance.used_days + 1}
            )
