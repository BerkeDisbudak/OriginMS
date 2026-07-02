from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from origin_ms.domain.enums import LeaveStatus, LeaveType
from origin_ms.schemas.common import PageInfo


class LeaveBalanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    employee_id: str = Field(description="Employee id.")
    year: int = Field(description="Balance year.")
    entitled_days: int = Field(description="Annual entitlement days.")
    carried_over: int = Field(description="Carried-over days.")
    used_days: int = Field(description="Approved used days.")
    pending_days: int = Field(description="Pending days.")
    remaining: int = Field(description="Computed remaining days.")


class LeaveRequestCreate(BaseModel):
    employee_id: str = Field(description="Requester employee id.")
    type: LeaveType = Field(description="Leave type.")
    start_date: date = Field(description="Start date.")
    end_date: date = Field(description="End date.")
    note: str | None = Field(default=None, max_length=500, description="Optional requester note.")


class LeaveRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(description="Prefixed leave request id.")
    employee_id: str = Field(description="Requester employee id.")
    type: LeaveType = Field(description="Leave type.")
    start_date: date = Field(description="Start date.")
    end_date: date = Field(description="End date.")
    business_days: int = Field(description="Stored business-day count.")
    note: str | None = Field(default=None, description="Requester note.")
    status: LeaveStatus = Field(description="Approval status.")
    decided_by: str | None = Field(default=None, description="Decision actor user id.")
    decided_at: datetime | None = Field(default=None, description="Decision timestamp.")
    decision_reason: str | None = Field(default=None, description="Rejection reason.")
    created_at: datetime = Field(description="Creation timestamp.")
    cancelled_at: datetime | None = Field(default=None, description="Cancellation timestamp.")


class LeaveRequestPage(BaseModel):
    items: list[LeaveRequestResponse] = Field(description="Leave request page items.")
    page: PageInfo = Field(description="Cursor page metadata.")


class RejectLeaveRequestBody(BaseModel):
    reason: str = Field(min_length=5, description="Required rejection reason.")
