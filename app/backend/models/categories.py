from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Categories(Base):
    __tablename__ = "categories"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    icon = Column(String, nullable=True)
    color = Column(String, nullable=True)
    type = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)