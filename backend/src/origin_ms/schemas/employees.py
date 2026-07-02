from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from origin_ms.domain.enums import EmployeeStatus, EmploymentType


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(description="Prefixed employee id.")
    employee_no: str = Field(description="Stable employee number.")
    first_name: str = Field(description="Employee first name.")
    last_name: str = Field(description="Employee last name.")
    email: str = Field(description="Employee work email.")
    department_id: str = Field(description="Department id.")
    title: str = Field(description="Job title.")
    manager_id: str | None = Field(default=None, description="Direct manager employee id.")
    employment_type: EmploymentType = Field(description="Employment type.")
    hire_date: date = Field(description="Hire date.")
    birth_date: date = Field(description="Birth date used only for statutory leave defaults.")
    status: EmployeeStatus = Field(description="Employee lifecycle status.")
    termination_date: date | None = Field(
        default=None, description="Termination date if terminated."
    )
