import os

from origin_ms.services.unit_of_work import build_demo_uow


def main() -> None:
    password = os.environ.get("ORIGIN_MS_DEMO_PASSWORD", "password")
    uow = build_demo_uow(password=password)
    print("Phase 2a demo seed prepared")
    print(f"departments={len(uow.departments)}")
    print(f"employees={len(uow.employees)}")
    print(f"public_holidays={len(uow.public_holidays)}")
    print(f"leave_requests={len(uow.leave_requests)}")
    print(
        "demo_logins=hr@origin-fgl.local, manager@origin-fgl.local, employee@origin-fgl.local"
    )


if __name__ == "__main__":
    main()
