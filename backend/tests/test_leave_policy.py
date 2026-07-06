from datetime import date

from origin_ms.domain.entities import Employee, PublicHoliday
from origin_ms.domain.enums import EmploymentType
from origin_ms.domain.leave_policy import (
    business_days_between,
    ensure_balance,
    statutory_annual_entitlement,
)

# Fixed dates throughout -- this file exists specifically because a prior
# test used today_istanbul() and became date-fragile (CI failure fixed in
# test_leave_api_validation.py). Never use the real wall clock here.


def _employee(*, hire_date: date, birth_date: date) -> Employee:
    return Employee(
        id="emp_test",
        employee_no="EMP-0001",
        first_name="Test",
        last_name="Employee",
        email="test@origin-fgl.local",
        department_id="dep_ops",
        title="Specialist",
        employment_type=EmploymentType.FULL_TIME,
        hire_date=hire_date,
        birth_date=birth_date,
    )


class TestBusinessDaysBetween:
    def test_single_weekday_counts_as_one(self) -> None:
        monday = date(2026, 6, 15)
        assert business_days_between(monday, monday, []) == 1

    def test_single_weekend_day_counts_as_zero(self) -> None:
        saturday = date(2026, 6, 13)
        assert business_days_between(saturday, saturday, []) == 0

    def test_full_week_counts_five_weekdays(self) -> None:
        monday = date(2026, 6, 15)
        sunday = date(2026, 6, 21)
        assert business_days_between(monday, sunday, []) == 5

    def test_holiday_on_a_weekday_is_excluded(self) -> None:
        monday = date(2026, 6, 15)
        friday = date(2026, 6, 19)
        wednesday_holiday = PublicHoliday(id="hol_test", date=date(2026, 6, 17), name="Test")
        assert business_days_between(monday, friday, [wednesday_holiday]) == 4

    def test_holiday_adjacent_to_weekend_only_removes_the_weekday(self) -> None:
        # Friday holiday directly followed by a weekend -- the weekend days
        # must still be excluded independently of the holiday check, not
        # double-subtracted or accidentally left in.
        thursday = date(2026, 6, 18)
        sunday = date(2026, 6, 21)
        friday_holiday = PublicHoliday(id="hol_test", date=date(2026, 6, 19), name="Test")
        assert business_days_between(thursday, sunday, [friday_holiday]) == 1

    def test_range_spanning_leap_day_counts_correctly(self) -> None:
        # 2024 is a leap year; Feb 29, 2024 is a Thursday (a real business day).
        wednesday = date(2024, 2, 28)
        friday = date(2024, 3, 1)
        assert business_days_between(wednesday, friday, []) == 3

    def test_no_business_days_in_a_weekend_only_range(self) -> None:
        saturday = date(2026, 6, 13)
        sunday = date(2026, 6, 14)
        assert business_days_between(saturday, sunday, []) == 0


class TestStatutoryAnnualEntitlement:
    today = date(2026, 6, 15)

    def test_seniority_exactly_five_years_stays_at_base_tier(self) -> None:
        employee = _employee(hire_date=date(2021, 6, 15), birth_date=date(1996, 6, 15))
        assert statutory_annual_entitlement(employee, self.today) == 14

    def test_seniority_just_over_five_years_reaches_mid_tier(self) -> None:
        employee = _employee(hire_date=date(2020, 6, 15), birth_date=date(1996, 6, 15))
        assert statutory_annual_entitlement(employee, self.today) == 20

    def test_seniority_exactly_fifteen_years_stays_at_mid_tier(self) -> None:
        employee = _employee(hire_date=date(2011, 6, 15), birth_date=date(1996, 6, 15))
        assert statutory_annual_entitlement(employee, self.today) == 20

    def test_seniority_just_over_fifteen_years_reaches_top_tier(self) -> None:
        employee = _employee(hire_date=date(2010, 6, 15), birth_date=date(1996, 6, 15))
        assert statutory_annual_entitlement(employee, self.today) == 26

    def test_age_exactly_eighteen_does_not_trigger_age_floor(self) -> None:
        # Low seniority (1 year) so the base tier (14) is visible if no bump applies.
        employee = _employee(hire_date=date(2025, 6, 15), birth_date=date(2008, 6, 15))
        assert statutory_annual_entitlement(employee, self.today) == 14

    def test_age_just_under_eighteen_triggers_age_floor(self) -> None:
        employee = _employee(hire_date=date(2025, 6, 15), birth_date=date(2008, 6, 16))
        assert statutory_annual_entitlement(employee, self.today) == 20

    def test_age_just_under_fifty_does_not_trigger_age_floor(self) -> None:
        employee = _employee(hire_date=date(2025, 6, 15), birth_date=date(1976, 6, 16))
        assert statutory_annual_entitlement(employee, self.today) == 14

    def test_age_exactly_fifty_triggers_age_floor(self) -> None:
        employee = _employee(hire_date=date(2025, 6, 15), birth_date=date(1976, 6, 15))
        assert statutory_annual_entitlement(employee, self.today) == 20

    def test_leap_day_birthday_against_non_leap_today(self) -> None:
        # Born on a leap day; "today" is Feb 28 of a non-leap year, one day
        # short of reaching the birthday -- age must not have ticked over yet.
        employee = _employee(hire_date=date(2025, 1, 1), birth_date=date(2000, 2, 29))
        non_leap_today = date(2026, 2, 28)
        # age would be 26 if already had the birthday, 25 if not yet -- either
        # way this must not raise, and must resolve to a stable, deterministic
        # entitlement (age 25 => no age-floor bump, seniority 1yr => base tier).
        assert statutory_annual_entitlement(employee, non_leap_today) == 14


class TestEnsureBalance:
    def test_returns_zeroed_balance_at_the_statutory_entitlement(self) -> None:
        employee = _employee(hire_date=date(2020, 6, 15), birth_date=date(1996, 6, 15))
        today = date(2026, 6, 15)

        balance = ensure_balance(employee, today.year, today)

        assert balance.employee_id == employee.id
        assert balance.year == today.year
        assert balance.entitled_days == 20
        assert balance.carried_over == 0
        assert balance.used_days == 0
        assert balance.pending_days == 0
        assert balance.remaining == 20
