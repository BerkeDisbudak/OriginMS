from datetime import date

from .entities import Employee, LeaveBalance, PublicHoliday


def business_days_between(start_date: date, end_date: date, holidays: list[PublicHoliday]) -> int:
    holiday_dates = {holiday.date for holiday in holidays}
    days = 0
    current = start_date
    while current <= end_date:
        if current.weekday() < 5 and current not in holiday_dates:
            days += 1
        current = date.fromordinal(current.toordinal() + 1)
    return days


def statutory_annual_entitlement(employee: Employee, today: date) -> int:
    seniority_years = max(0, today.year - employee.hire_date.year)
    if (today.month, today.day) < (employee.hire_date.month, employee.hire_date.day):
        seniority_years -= 1

    age = today.year - employee.birth_date.year
    if (today.month, today.day) < (employee.birth_date.month, employee.birth_date.day):
        age -= 1

    if seniority_years > 15:
        entitlement = 26
    elif seniority_years > 5:
        entitlement = 20
    else:
        entitlement = 14

    if age < 18 or age >= 50:
        entitlement = max(entitlement, 20)

    return entitlement


def ensure_balance(employee: Employee, year: int, today: date) -> LeaveBalance:
    return LeaveBalance(
        employee_id=employee.id,
        year=year,
        entitled_days=statutory_annual_entitlement(employee, today),
    )
