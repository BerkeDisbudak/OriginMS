"""phase2a hr leave auth audit

Revision ID: 20260702_0001
Revises:
Create Date: 2026-07-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260702_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

role_enum = postgresql.ENUM("employee", "manager", "hr_admin", "executive", "admin", name="role")
actor_type_enum = postgresql.ENUM("user", "agent", "system", name="actor_type")
employment_type_enum = postgresql.ENUM(
    "full_time", "part_time", "contractor", name="employment_type"
)
employee_status_enum = postgresql.ENUM("active", "on_leave", "terminated", name="employee_status")
leave_type_enum = postgresql.ENUM(
    "ANNUAL", "SICK", "UNPAID", "EXCUSE", "MARRIAGE", "BEREAVEMENT", name="leave_type"
)
leave_status_enum = postgresql.ENUM(
    "pending", "approved", "rejected", "cancelled", name="leave_status"
)


def upgrade() -> None:
    bind = op.get_bind()
    for enum in (
        role_enum,
        actor_type_enum,
        employment_type_enum,
        employee_status_enum,
        leave_type_enum,
        leave_status_enum,
    ):
        enum.create(bind, checkfirst=True)

    op.create_table(
        "departments",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("manager_id", sa.String(length=32), nullable=True),
        sa.UniqueConstraint("name", name="uq_departments_name"),
    )
    op.create_table(
        "employees",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("employee_no", sa.String(length=32), nullable=False),
        sa.Column("first_name", sa.String(length=80), nullable=False),
        sa.Column("last_name", sa.String(length=80), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column(
            "department_id", sa.String(length=32), sa.ForeignKey("departments.id"), nullable=False
        ),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("manager_id", sa.String(length=32), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("employment_type", employment_type_enum, nullable=False),
        sa.Column("hire_date", sa.Date(), nullable=False),
        sa.Column("birth_date", sa.Date(), nullable=False),
        sa.Column("status", employee_status_enum, nullable=False),
        sa.Column("termination_date", sa.Date(), nullable=True),
        sa.UniqueConstraint("employee_no", name="uq_employees_employee_no"),
        sa.UniqueConstraint("email", name="uq_employees_email"),
    )
    op.create_foreign_key(
        "fk_departments_manager_id", "departments", "employees", ["manager_id"], ["id"]
    )
    op.create_index("ix_employees_manager_id", "employees", ["manager_id"])
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", role_enum, nullable=False),
        sa.Column(
            "employee_id", sa.String(length=32), sa.ForeignKey("employees.id"), nullable=True
        ),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_table(
        "leave_balances",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "employee_id", sa.String(length=32), sa.ForeignKey("employees.id"), nullable=False
        ),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("entitled_days", sa.Integer(), nullable=False),
        sa.Column("carried_over", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("used_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("pending_days", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("employee_id", "year", name="uq_leave_balances_employee_year"),
    )
    op.create_table(
        "public_holidays",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.UniqueConstraint("date", name="uq_public_holidays_date"),
    )
    op.create_table(
        "leave_requests",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column(
            "employee_id", sa.String(length=32), sa.ForeignKey("employees.id"), nullable=False
        ),
        sa.Column("type", leave_type_enum, nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("business_days", sa.Integer(), nullable=False),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column("status", leave_status_enum, nullable=False),
        sa.Column("decided_by", sa.String(length=32), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_reason", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("end_date >= start_date", name="ck_leave_requests_date_order"),
    )
    op.create_index(
        "ix_leave_requests_status_created", "leave_requests", ["status", "created_at", "id"]
    )
    op.create_index("ix_leave_requests_employee_id", "leave_requests", ["employee_id"])
    op.create_index("ix_leave_requests_decided_by", "leave_requests", ["decided_by"])
    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("actor_type", actor_type_enum, nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.String(length=64), nullable=False),
        sa.Column("before", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("after", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("ip", sa.String(length=64), nullable=True),
    )
    op.create_index("ix_audit_events_entity", "audit_events", ["entity_type", "entity_id"])
    op.create_index("ix_audit_events_request_id", "audit_events", ["request_id"])
    op.execute(
        """
        CREATE FUNCTION prevent_audit_event_mutation()
        RETURNS trigger AS $$
        BEGIN
          RAISE EXCEPTION 'audit_events is append-only';
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_prevent_audit_event_update_delete
        BEFORE UPDATE OR DELETE ON audit_events
        FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_prevent_audit_event_update_delete ON audit_events")
    op.execute("DROP FUNCTION IF EXISTS prevent_audit_event_mutation")
    op.drop_table("audit_events")
    op.drop_table("leave_requests")
    op.drop_table("public_holidays")
    op.drop_table("leave_balances")
    op.drop_table("users")
    op.drop_constraint("fk_departments_manager_id", "departments", type_="foreignkey")
    op.drop_table("employees")
    op.drop_table("departments")
    bind = op.get_bind()
    for enum in (
        leave_status_enum,
        leave_type_enum,
        employee_status_enum,
        employment_type_enum,
        actor_type_enum,
        role_enum,
    ):
        enum.drop(bind, checkfirst=True)
