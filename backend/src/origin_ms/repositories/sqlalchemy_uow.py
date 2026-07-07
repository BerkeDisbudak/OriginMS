from dataclasses import dataclass, field
from typing import TypeVar

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from origin_ms.domain.entities import (
    AuditEvent,
    Department,
    Employee,
    LeaveBalance,
    LeaveRequest,
    PublicHoliday,
    User,
)
from origin_ms.repositories.models import (
    AuditEventModel,
    DepartmentModel,
    EmployeeModel,
    LeaveBalanceModel,
    LeaveRequestModel,
    PublicHolidayModel,
    UserModel,
)

EntityT = TypeVar("EntityT", bound=BaseModel)


@dataclass
class _Snapshot:
    departments: dict[str, Department] = field(default_factory=dict[str, Department])
    employees: dict[str, Employee] = field(default_factory=dict[str, Employee])
    users: dict[str, User] = field(default_factory=dict[str, User])
    leave_balances: dict[tuple[str, int], LeaveBalance] = field(
        default_factory=dict[tuple[str, int], LeaveBalance]
    )
    public_holidays: dict[str, PublicHoliday] = field(
        default_factory=dict[str, PublicHoliday]
    )
    leave_requests: dict[str, LeaveRequest] = field(default_factory=dict[str, LeaveRequest])
    audit_event_ids: set[str] = field(default_factory=set[str])


class SqlAlchemyUnitOfWork:
    """Bridges the synchronous, dict-shaped `UnitOfWork` Protocol
    (services/unit_of_work.py) -- which every service already depends on via
    direct dict access, never `await` -- to a real async-SQLAlchemy-backed
    database.

    `load()` is the one place real I/O happens: it eagerly reads each table
    into the exact dict/list shape `InMemoryUnitOfWork` already provides, so
    services can mutate those collections synchronously exactly as they do
    today with zero changes to services/domain code. `commit()` diffs the
    current collections against a snapshot taken at `load()` time and
    flushes only what changed.

    No per-request isolation or conflict detection: two concurrent requests
    that load, then both mutate the same row, then commit, will silently
    last-write-wins -- the second commit overwrites the first with no
    warning. Acceptable at today's demo/v1 scale (matches the eager-full-
    table-load scale limitation below); would need real optimistic locking
    (e.g. a version column) before this could support concurrent real-world
    write traffic.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.departments: dict[str, Department] = {}
        self.employees: dict[str, Employee] = {}
        self.users: dict[str, User] = {}
        self.leave_balances: dict[tuple[str, int], LeaveBalance] = {}
        self.public_holidays: dict[str, PublicHoliday] = {}
        self.leave_requests: dict[str, LeaveRequest] = {}
        self.audit_events: list[AuditEvent] = []
        self._snapshot: _Snapshot | None = None

    async def load(self) -> None:
        """Eagerly loads every table. Fine at today's demo/v1 data volume;
        would need paginated/scoped loading before this could support a
        real deployment's row counts."""
        department_rows = (await self.session.execute(select(DepartmentModel))).scalars().all()
        self.departments = {
            row.id: Department.model_validate(row, from_attributes=True) for row in department_rows
        }

        employee_rows = (await self.session.execute(select(EmployeeModel))).scalars().all()
        self.employees = {
            row.id: Employee.model_validate(row, from_attributes=True) for row in employee_rows
        }

        user_rows = (await self.session.execute(select(UserModel))).scalars().all()
        self.users = {row.id: User.model_validate(row, from_attributes=True) for row in user_rows}

        balance_rows = (await self.session.execute(select(LeaveBalanceModel))).scalars().all()
        self.leave_balances = {
            (row.employee_id, row.year): LeaveBalance.model_validate(row, from_attributes=True)
            for row in balance_rows
        }

        holiday_rows = (await self.session.execute(select(PublicHolidayModel))).scalars().all()
        self.public_holidays = {
            row.id: PublicHoliday.model_validate(row, from_attributes=True) for row in holiday_rows
        }

        request_rows = (await self.session.execute(select(LeaveRequestModel))).scalars().all()
        self.leave_requests = {
            row.id: LeaveRequest.model_validate(row, from_attributes=True) for row in request_rows
        }

        event_rows = (await self.session.execute(select(AuditEventModel))).scalars().all()
        self.audit_events = [
            AuditEvent.model_validate(row, from_attributes=True) for row in event_rows
        ]

        self._snapshot = _Snapshot(
            departments=dict(self.departments),
            employees=dict(self.employees),
            users=dict(self.users),
            leave_balances=dict(self.leave_balances),
            public_holidays=dict(self.public_holidays),
            leave_requests=dict(self.leave_requests),
            audit_event_ids={event.id for event in self.audit_events},
        )

    async def commit(self) -> None:
        if self._snapshot is None:
            raise RuntimeError("SqlAlchemyUnitOfWork.commit() called before load()")

        await self._flush_dict(self.departments, self._snapshot.departments, DepartmentModel)
        await self._flush_dict(self.employees, self._snapshot.employees, EmployeeModel)
        await self._flush_dict(self.users, self._snapshot.users, UserModel)
        await self._flush_leave_balances()
        await self._flush_dict(
            self.public_holidays, self._snapshot.public_holidays, PublicHolidayModel
        )
        await self._flush_dict(
            self.leave_requests, self._snapshot.leave_requests, LeaveRequestModel
        )
        await self._flush_audit_events()

        await self.session.commit()
        # Force a fresh load() before this instance is used to commit again --
        # a stale snapshot would compare against data that's no longer current.
        self._snapshot = None

    async def rollback(self) -> None:
        await self.session.rollback()

    async def _flush_dict(
        self,
        current: dict[str, EntityT],
        previous: dict[str, EntityT],
        model_cls: type,
    ) -> None:
        # No key ever disappears from these dicts in this codebase (no hard
        # deletes -- CODEX_BRIEF §8 -- only status transitions), so deletions
        # are intentionally not handled here.
        for key, entity in current.items():
            if previous.get(key) != entity:
                await self.session.merge(model_cls(**entity.model_dump()))

    async def _flush_leave_balances(self) -> None:
        assert self._snapshot is not None
        for key, balance in self.leave_balances.items():
            if self._snapshot.leave_balances.get(key) == balance:
                continue
            employee_id, year = key
            existing = (
                await self.session.execute(
                    select(LeaveBalanceModel).where(
                        LeaveBalanceModel.employee_id == employee_id,
                        LeaveBalanceModel.year == year,
                    )
                )
            ).scalar_one_or_none()
            data = balance.model_dump(exclude={"remaining"})
            if existing is None:
                self.session.add(LeaveBalanceModel(**data))
            else:
                for field_name, value in data.items():
                    setattr(existing, field_name, value)

    async def _flush_audit_events(self) -> None:
        assert self._snapshot is not None
        new_ids = {event.id for event in self.audit_events} - self._snapshot.audit_event_ids
        for event in self.audit_events:
            if event.id in new_ids:
                self.session.add(AuditEventModel(**event.model_dump()))
