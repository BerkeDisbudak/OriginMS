from typing import Any

from origin_ms.core.ids import new_id
from origin_ms.core.time import utc_now
from origin_ms.domain.entities import Actor, AuditEvent
from origin_ms.services.unit_of_work import UnitOfWork


def record_audit(
    uow: UnitOfWork,
    *,
    actor: Actor,
    action: str,
    entity_type: str,
    entity_id: str,
    before: dict[str, Any],
    after: dict[str, Any],
    request_id: str,
    ip: str | None = None,
) -> AuditEvent:
    event = AuditEvent(
        id=new_id("aud"),
        ts=utc_now(),
        actor_type=actor.actor_type,
        actor_id=actor.actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before=before,
        after=after,
        request_id=request_id,
        ip=ip,
    )
    uow.audit_events.append(event)
    return event
