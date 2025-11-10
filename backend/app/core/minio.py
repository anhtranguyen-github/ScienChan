from minio import Minio
from minio.error import S3Error
from backend.app.core.config import ai_settings
import logging
import io

logger = logging.getLogger(__name__)

class MinioManager:
    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MinioManager, cls).__new__(cls)
        return cls._instance

    @property
    def client(self):
        if self._client is None:
            logger.info(f"Connecting to MinIO at {ai_settings.MINIO_ENDPOINT}")
            self._client = Minio(
                ai_settings.MINIO_ENDPOINT,
                access_key=ai_settings.MINIO_ACCESS_KEY,
                secret_key=ai_settings.MINIO_SECRET_KEY,
                secure=ai_settings.MINIO_SECURE
            )
        return self._client

    def ensure_bucket(self, bucket_name: str = None):
        bucket = bucket_name or ai_settings.MINIO_BUCKET
        try:
            if not self.client.bucket_exists(bucket):
                logger.info(f"Creating MinIO bucket: {bucket}")
                self.client.make_bucket(bucket)
            else:
                logger.debug(f"Bucket {bucket} already exists")
        except S3Error as e:
            logger.error(f"MinIO error ensuring bucket: {e}")
            raise

    async def upload_file(self, object_name: str, data: io.BytesIO, length: int, content_type: str = "application/octet-stream"):
        """Sync upload wrapper (MinIO client is sync)."""
        self.ensure_bucket()
        try:
            self.client.put_object(
                ai_settings.MINIO_BUCKET,
                object_name,
                data,
                length,
                content_type=content_type
            )
            return f"{ai_settings.MINIO_BUCKET}/{object_name}"
        except S3Error as e:
            logger.error(f"MinIO upload error: {e}")
            raise

    def get_file(self, object_name: str):
        """Get file content."""
        try:
            response = self.client.get_object(ai_settings.MINIO_BUCKET, object_name)
            return response.read()
        except S3Error as e:
            logger.error(f"MinIO download error: {e}")
            return None
        finally:
            if 'response' in locals():
                response.close()
                response.release_conn()

    def get_presigned_url(self, object_name: str, expires_hours: int = 1):
        """Generate a presigned URL for preview/download."""
        try:
            url = self.client.get_presigned_url(
                "GET",
                ai_settings.MINIO_BUCKET,
                object_name,
                expires=expires_hours * 3600
            )
            return url
        except S3Error as e:
            logger.error(f"MinIO presigned URL error: {e}")
            return None

    def delete_file(self, object_name: str):
        try:
            self.client.remove_object(ai_settings.MINIO_BUCKET, object_name)
        except S3Error as e:
            logger.error(f"MinIO delete error: {e}")

minio_manager = MinioManager()
