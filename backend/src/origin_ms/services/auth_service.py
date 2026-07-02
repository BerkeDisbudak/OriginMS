from datetime import timedelta

from origin_ms.core.config import Settings
from origin_ms.core.security import create_token, verify_password
from origin_ms.domain.entities import Actor, User
from origin_ms.domain.enums import ActorType, Role
from origin_ms.domain.errors import DomainError
from origin_ms.services.audit_service import record_audit
from origin_ms.services.unit_of_work import UnitOfWork


class AuthService:
    def __init__(self, uow: UnitOfWork, settings: Settings) -> None:
        self._uow = uow
        self._settings = settings

    def login(self, *, email: str, password: str, request_id: str, ip: str | None) -> str:
        user = next(
            (candidate for candidate in self._uow.users.values() if candidate.email == email), None
        )
        if user is None or not verify_password(password, user.password_hash):
            system_actor = Actor(actor_type=ActorType.SYSTEM, actor_id="system", role=Role.ADMIN)
            record_audit(
                self._uow,
                actor=system_actor,
                action="auth.login_failed",
                entity_type="user",
                entity_id=email,
                before={},
                after={},
                request_id=request_id,
                ip=ip,
            )
            raise DomainError(
                detail="Invalid email or password.", status_code=401, title="Unauthorized"
            )

        actor = actor_from_user(user)
        record_audit(
            self._uow,
            actor=actor,
            action="auth.login",
            entity_type="user",
            entity_id=user.id,
            before={},
            after={"email": user.email},
            request_id=request_id,
            ip=ip,
        )
        return create_token(
            subject=user.id,
            secret=self._settings.jwt_secret,
            expires_delta=timedelta(minutes=self._settings.access_token_minutes),
        )

    def get_user(self, user_id: str) -> User:
        user = self._uow.users.get(user_id)
        if user is None:
            raise DomainError(detail="User not found.", status_code=401, title="Unauthorized")
        return user


def actor_from_user(user: User) -> Actor:
    return Actor(
        actor_type=ActorType.USER, actor_id=user.id, role=user.role, employee_id=user.employee_id
    )
