from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field, computed_field

from .enums import ActorType, EmployeeStatus, EmploymentType, LeaveStatus, LeaveType, Role


class Department(BaseModel):
    id: str
    name: str
    manager_id: str | None = None


class Employee(BaseModel):
    id: str
    employee_no: str
    first_name: str
    last_name: str
    email: str
    department_id: str
    title: str
    manager_id: str | None = None
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    hire_date: date
    birth_date: date
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    termination_date: date | None = None


class User(BaseModel):
    id: str
    email: str
    password_hash: str
    role: Role
    employee_id: str | None = None


class Actor(BaseModel):
    actor_type: ActorType = ActorType.USER
    actor_id: str
    role: Role
    employee_id: str | None = None


class LeaveBalance(BaseModel):
    employee_id: str
    year: int
    entitled_days: int
    carried_over: int = 0
    used_days: int = 0
    pending_days: int = 0

    @computed_field
    @property
    def remaining(self) -> int:
        return self.entitled_days + self.carried_over - self.used_days - self.pending_days


class PublicHoliday(BaseModel):
    id: str
    date: date
    name: str


class LeaveRequest(BaseModel):
    id: str
    employee_id: str
    type: LeaveType
    start_date: date
    end_date: date
    business_days: int
    note: str | None = None
    status: LeaveStatus = LeaveStatus.PENDING
    decided_by: str | None = None
    decided_at: datetime | None = None
    decision_reason: str | None = None
    created_at: datetime
    cancelled_at: datetime | None = None


class AuditEvent(BaseModel):
    id: str
    ts: datetime
    actor_type: ActorType
    actor_id: str
    action: str
    entity_type: str
    entity_id: str
    before: dict[str, Any] = Field(default_factory=dict)
    after: dict[str, Any] = Field(default_factory=dict)
    request_id: str
    ip: str | None = None
