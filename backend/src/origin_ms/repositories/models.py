from datetime import date as date_type
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from origin_ms.repositories.database import Base

# create_type=False everywhere below: the migration
# (20260702_0001_phase2a_hr_leave_auth_audit.py) already creates these
# native Postgres enum types explicitly; these just need to bind to them by
# name so INSERT/UPDATE values are sent with the right type instead of a
# plain VARCHAR (which Postgres rejects for a column typed as a real enum).
RoleEnum = Enum(
    "employee", "manager", "hr_admin", "executive", "admin", name="role", create_type=False
)
ActorTypeEnum = Enum("user", "agent", "system", name="actor_type", create_type=False)
EmploymentTypeEnum = Enum(
    "full_time", "part_time", "contractor", name="employment_type", create_type=False
)
EmployeeStatusEnum = Enum(
    "active", "on_leave", "terminated", name="employee_status", create_type=False
)
LeaveTypeEnum = Enum(
    "ANNUAL",
    "SICK",
    "UNPAID",
    "EXCUSE",
    "MARRIAGE",
    "BEREAVEMENT",
    name="leave_type",
    create_type=False,
)
LeaveStatusEnum = Enum(
    "pending", "approved", "rejected", "cancelled", name="leave_status", create_type=False
)


class DepartmentModel(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    manager_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id"), nullable=True)


class EmployeeModel(Base):
    __tablename__ = "employees"
    __table_args__ = (
        UniqueConstraint("employee_no", name="uq_employees_employee_no"),
        UniqueConstraint("email", name="uq_employees_email"),
        Index("ix_employees_manager_id", "manager_id"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    employee_no: Mapped[str] = mapped_column(String(32), nullable=False)
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    manager_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    employment_type: Mapped[str] = mapped_column(EmploymentTypeEnum, nullable=False)
    hire_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    birth_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(EmployeeStatusEnum, nullable=False)
    termination_date: Mapped[date_type | None] = mapped_column(Date, nullable=True)


class UserModel(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(RoleEnum, nullable=False)
    employee_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id"), nullable=True)


class LeaveBalanceModel(Base):
    __tablename__ = "leave_balances"
    __table_args__ = (
        UniqueConstraint("employee_id", "year", name="uq_leave_balances_employee_year"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id"), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    entitled_days: Mapped[int] = mapped_column(Integer, nullable=False)
    carried_over: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    used_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pending_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class PublicHolidayModel(Base):
    __tablename__ = "public_holidays"
    __table_args__ = (UniqueConstraint("date", name="uq_public_holidays_date"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    date: Mapped[date_type] = mapped_column(Date, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)


class LeaveRequestModel(Base):
    __tablename__ = "leave_requests"
    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="ck_leave_requests_date_order"),
        Index("ix_leave_requests_status_created", "status", "created_at", "id"),
        Index("ix_leave_requests_employee_id", "employee_id"),
        Index("ix_leave_requests_decided_by", "decided_by"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id"), nullable=False)
    type: Mapped[str] = mapped_column(LeaveTypeEnum, nullable=False)
    start_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    end_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    business_days: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(LeaveStatusEnum, nullable=False)
    decided_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AuditEventModel(Base):
    __tablename__ = "audit_events"
    __table_args__ = (
        Index("ix_audit_events_entity", "entity_type", "entity_id"),
        Index("ix_audit_events_request_id", "request_id"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    actor_type: Mapped[str] = mapped_column(ActorTypeEnum, nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(64), nullable=False)
    before: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    after: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    request_id: Mapped[str] = mapped_column(String(64), nullable=False)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
