import json
import re
import subprocess
from pathlib import Path
from urllib.request import urlopen, Request

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
MAIN_JSON = DATA_DIR / "tthc_430_2026-10-20.json"
DETAIL_JSON = DATA_DIR / "tthc_detail.json"

HF_URL = "https://huggingface.co/datasets/tmquan/dichvucong-gov-vn/resolve/main/procedures-00000-of-00001.parquet?download=true"
RAW_MAIN_URL = "https://raw.githubusercontent.com/anhtuansdml-droid/tthc/main/data/tthc_430_2026-10-20.json"
DVC_BASE = "https://dichvucong.gov.vn/thu-tuc-hanh-chinh/"


def norm(s):
    s = "" if s is None else str(s)
    s = s.replace("\u00a0", " ")
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s


def clean(v):
    if v is None:
        return ""
    try:
        if pd.isna(v):
            return ""
    except Exception:
        pass
    return str(v).strip()


def download(url, dest):
    print(f"Downloading: {url}")
    req = Request(url, headers={"User-Agent": "Mozilla/5.0 TTHC-Muong-Lay-Sync"})
    with urlopen(req, timeout=180) as r, open(dest, "wb") as f:
        while True:
            chunk = r.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)


def load_main():
    if MAIN_JSON.exists():
        return json.loads(MAIN_JSON.read_text(encoding="utf-8"))
    tmp = ROOT / "_tthc_main.json"
    download(RAW_MAIN_URL, tmp)
    data = json.loads(tmp.read_text(encoding="utf-8"))
    tmp.unlink(missing_ok=True)
    return data


def choose_row(rows, item):
    target_name = norm(item.get("ten"))
    exact_name = [r for r in rows if norm(r.get("procedure_name")) == target_name]
    candidates = exact_name or rows
    # Ưu tiên bản ghi cấp xã/công dân nếu có nhiều audience cho cùng mã.
    candidates = sorted(
        candidates,
        key=lambda r: (
            0 if bool(r.get("is_ward")) else 1,
            0 if clean(r.get("target_type")) == "VIETNAMESE_CITIZEN" else 1,
            0 if clean(r.get("formality_id")) else 1,
        ),
    )
    return candidates[0] if candidates else None


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    items = load_main()
    online_items = [x for x in items if clean(x.get("mucDo")) != "Chưa cung cấp DVC"]

    parquet = ROOT / "_procedures.parquet"
    download(HF_URL, parquet)
    df = pd.read_parquet(parquet)
    parquet.unlink(missing_ok=True)

    df["_code_norm"] = df["code"].map(norm)
    by_code = {}
    for _, row in df.iterrows():
        code = clean(row.get("code"))
        if not code:
            continue
        by_code.setdefault(norm(code), []).append(row.to_dict())

    details = []
    matched = 0
    unmatched = []

    for item in online_items:
        row = choose_row(by_code.get(norm(item.get("ma")), []), item)
        if not row:
            unmatched.append({"ma": item.get("ma"), "ten": item.get("ten")})
            continue

        uuid = clean(row.get("formality_id") or row.get("doc_name"))
        source_url = clean(row.get("source_url"))
        detail = dict(item)
        detail.update(
            {
                "dvcqgId": uuid or detail.get("dvcqgId", ""),
                "dvcqgUrl": source_url or (DVC_BASE + uuid if uuid else ""),
                "soQuyetDinh": clean(row.get("decision_no")),
                "ketQua": clean(row.get("results")),
                "thoiHan": clean(row.get("execution_methods")),
                "doiTuong": clean(row.get("target_objects")),
                "cachThuc": clean(row.get("execution_methods")),
                "trinhTu": clean(row.get("execution_steps")),
                "thanhPhanHoSo": clean(row.get("profile_components")),
                "yeuCauDieuKien": clean(row.get("requirements_conditions")),
                "phiLePhi": clean(row.get("fees")),
                "canCuPhapLy": clean(row.get("legal_basis")),
                "coQuanThucHien": clean(row.get("executing_agencies")) or detail.get("coQuanThucHien", ""),
                "coQuanPhoiHop": clean(row.get("coordinating_agencies")),
                "moTa": clean(row.get("description")),
                "nguonDVCQG": clean(row.get("source")) or "dichvucong.gov.vn",
                "nguonDVCQGUrl": source_url,
                "capNhatDuLieu": clean(row.get("scraped_at")),
            }
        )
        details.append(detail)
        item["dvcqgId"] = detail["dvcqgId"]
        item["url"] = detail["dvcqgUrl"]
        matched += 1

    MAIN_JSON.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    DETAIL_JSON.write_text(json.dumps(details, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    report = {
        "tongTTHC": len(items),
        "coDVC": len(online_items),
        "daDongBoChiTiet": matched,
        "chuaTimThayDuLieuDVCQG": len(unmatched),
        "maChuaTimThay": unmatched,
        "nguon": "Cổng Dịch vụ công Quốc gia (dữ liệu được thu thập qua API công khai; bản dữ liệu trung gian tmquan/dichvucong-gov-vn)",
        "capNhat": pd.Timestamp.utcnow().isoformat(),
    }
    (DATA_DIR / "dvcqg_detail_sync_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
