#!/usr/bin/env python3
"""
اسکریپت ورود داده‌های واقعی (نرخ دلار یا آمار بازار) از CSV به Supabase.
نحوه استفاده:
  export SUPABASE_URL="https://ukzbwxuajsgmxtbbyoxc.supabase.co"
  export SUPABASE_SERVICE_KEY="YOUR_SERVICE_ROLE_KEY"
  python3 scripts/import_csv_to_supabase.py usd_rates data/usd_rates.csv
"""
import csv
import json
import os
import sys
import urllib.request

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

def post_rows(table: str, rows: list):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    data = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
        },
    )
    with urllib.request.urlopen(req) as resp:
        print(f"Inserted {len(rows)} rows into {table}: HTTP {resp.status}")

if __name__ == "__main__":
    if len(sys.argv) < 3 or not SUPABASE_URL or not SUPABASE_KEY:
        print("Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 import_csv_to_supabase.py <table> <csv_path>")
        sys.exit(1)

    table_name = sys.argv[1]
    csv_path = sys.argv[2]
    with open(csv_path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if rows:
        post_rows(table_name, rows)
    else:
        print("CSV is empty.")
