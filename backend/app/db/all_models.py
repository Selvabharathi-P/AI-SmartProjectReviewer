# Import all models here so Alembic can detect them for migrations
from app.models.user import User  # noqa
from app.models.project import Project  # noqa
from app.models.evaluation import Evaluation  # noqa
