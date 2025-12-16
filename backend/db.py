import psycopg2 
import os

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database="postgres", 
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        port=5432,
        sslmode="require"
    )
