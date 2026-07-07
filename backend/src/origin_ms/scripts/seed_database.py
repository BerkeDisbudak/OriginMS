import asyncio

from origin_ms.repositories.database import SessionLocal
from origin_ms.repositories.models import (
    AuditEventModel,
    DepartmentModel,
    EmployeeModel,
    LeaveBalanceModel,
    LeaveRequestModel,
    PublicHolidayModel,
    UserModel,
)
from origin_ms.services.unit_of_work import build_demo_uow


async def seed() -> None:
    """Writes the same demo dataset every test/in-memory run already uses
    (`build_demo_uow()`) into a real database via `ORIGIN_MS_DATABASE_URL`.
    Run `alembic upgrade head` first."""
    uow = build_demo_uow()

    async with SessionLocal() as session:
        # departments.manager_id -> employees.id and employees.manager_id ->
        # employees.id are circular/self references, so each collection is
        # inserted first with those columns nulled out, then patched in a
        # second pass once every row they could reference already exists.
        for department in uow.departments.values():
            data = department.model_dump()
            data["manager_id"] = None
            await session.merge(DepartmentModel(**data))

        for employee in uow.employees.values():
            data = employee.model_dump()
            data["manager_id"] = None
            await session.merge(EmployeeModel(**data))
        await session.flush()

        for employee in uow.employees.values():
            if employee.manager_id is not None:
                await session.merge(EmployeeModel(**employee.model_dump()))

        for department in uow.departments.values():
            if department.manager_id is not None:
                await session.merge(DepartmentModel(**department.model_dump()))

        for user in uow.users.values():
            await session.merge(UserModel(**user.model_dump()))

        for holiday in uow.public_holidays.values():
            await session.merge(PublicHolidayModel(**holiday.model_dump()))

        for balance in uow.leave_balances.values():
            await session.merge(LeaveBalanceModel(**balance.model_dump(exclude={"remaining"})))

        for request in uow.leave_requests.values():
            await session.merge(LeaveRequestModel(**request.model_dump()))

        for event in uow.audit_events:
            session.add(AuditEventModel(**event.model_dump()))

        await session.commit()


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()
