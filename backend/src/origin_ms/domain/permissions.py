from .entities import Actor, Employee, LeaveRequest
from .enums import Role

HR_READ_ROLES = {Role.HR_ADMIN, Role.EXECUTIVE, Role.ADMIN}


def can_read_employee(actor: Actor, employee: Employee) -> bool:
    if actor.role in HR_READ_ROLES:
        return True
    if actor.employee_id == employee.id:
        return True
    return actor.role == Role.MANAGER and employee.manager_id == actor.employee_id


def can_create_leave_request(actor: Actor, employee_id: str) -> bool:
    return actor.employee_id == employee_id and actor.role in {
        Role.EMPLOYEE,
        Role.MANAGER,
        Role.HR_ADMIN,
    }


def can_read_leave_request(actor: Actor, request: LeaveRequest, employee: Employee) -> bool:
    if actor.role in HR_READ_ROLES:
        return True
    if actor.employee_id == request.employee_id:
        return True
    return actor.role == Role.MANAGER and employee.manager_id == actor.employee_id


def can_decide_leave_request(actor: Actor, employee: Employee) -> bool:
    if actor.employee_id == employee.id:
        return False
    if actor.role == Role.HR_ADMIN:
        return True
    return actor.role == Role.MANAGER and employee.manager_id == actor.employee_id


def can_cancel_leave_request_endpoint(actor: Actor, request: LeaveRequest) -> bool:
    return actor.employee_id == request.employee_id


def can_list_all_leave_requests(actor: Actor) -> bool:
    return actor.role in HR_READ_ROLES


def can_update_employee(actor: Actor) -> bool:
    return actor.role == Role.HR_ADMIN
