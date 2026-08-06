class MsAccessGsemRepository:
    """실제 MS Access 연결 시 교체할 어댑터 자리."""

    def __init__(self) -> None:
        raise RuntimeError("MS Access 저장소는 실제 DB 연결 전이라 아직 구성되지 않았습니다.")
