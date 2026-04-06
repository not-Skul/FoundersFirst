import psycopg2
import os
import time
import logging

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds


def get_db_connection():
    """
    Connect to Azure PostgreSQL with retry logic.

    Azure free-tier DBs auto-pause after inactivity. The first connection
    attempt wakes the server but often fails. Retrying fixes this.
    """
    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return psycopg2.connect(
                host=os.getenv("DB_HOST"),
                database="postgres",
                user=os.getenv("DB_USER"),
                password=os.getenv("DB_PASSWORD"),
                port=5432,
                sslmode="require",
                connect_timeout=10,
            )
        except psycopg2.OperationalError as e:
            last_error = e
            if attempt < MAX_RETRIES:
                logger.warning(
                    "DB connection attempt %d/%d failed: %s — retrying in %ds...",
                    attempt, MAX_RETRIES, str(e)[:100], RETRY_DELAY,
                )
                time.sleep(RETRY_DELAY)
            else:
                logger.error("All %d DB connection attempts failed.", MAX_RETRIES)

    raise last_error
