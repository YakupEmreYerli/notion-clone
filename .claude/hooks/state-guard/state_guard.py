#!/usr/bin/env python3
"""STATE guard — docs/memory/STATE.md'yi otomatik izler ve güncellenmeye zorlar.

Üç mod:
  session-start : oturum açılışında gerçek repo durumunu + STATE bayatlık sinyalini
                  context'e basar (izleme).
  mark          : Edit/Write sonrası, oturumda hangi kaynak dosyaların değiştiğini
                  işaretler (docs/memory kendisi hariç).
  stop          : oturum turu biterken kaynak kod değiştiyse ve STATE.md
                  güncellenmediyse Claude'u durdurmayıp devam ettirir ve
                  STATE.md'yi güncellemesini ister (zorlama).
"""
import json, os, subprocess, sys, time, pathlib

ROOT = pathlib.Path(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd())
STATE = ROOT / "docs/memory/STATE.md"
MARKDIR = ROOT / ".claude/.state-guard"

# STATE güncellemesi beklenmeyen yollar (dokümanın kendisi, geçici, üretilen dosyalar)
IGNORED_PREFIXES = ("docs/", ".claude/.state-guard", "node_modules/", ".next/")


def sh(*args: str) -> str:
    try:
        return subprocess.run(args, cwd=ROOT, capture_output=True, text=True,
                              timeout=10).stdout.strip()
    except Exception:
        return ""


def read_input() -> dict:
    try:
        return json.loads(sys.stdin.read() or "{}")
    except Exception:
        return {}


def marker(session_id: str) -> pathlib.Path:
    MARKDIR.mkdir(parents=True, exist_ok=True)
    return MARKDIR / f"{(session_id or 'nosession')[:64]}.json"


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text())
    except Exception:
        return {}


def state_last_updated() -> str:
    try:
        for line in STATE.read_text().splitlines():
            if line.startswith("**Son güncelleme:**"):
                return line.split("**", 2)[-1].strip(": ").strip()
    except Exception:
        pass
    return "bilinmiyor"


def cmd_session_start() -> None:
    data = read_input()
    m = marker(data.get("session_id", ""))
    m.write_text(json.dumps({"started": time.time(), "files": []}))

    dirty = [l for l in sh("git", "status", "--porcelain").splitlines() if l]
    log = sh("git", "log", "-3", "--date=short", "--format=%ad %s")
    recorded = state_last_updated()
    last_commit_date = sh("git", "log", "-1", "--date=short", "--format=%ad")

    lines = [
        "STATE guard — repo gerçek durumu (docs/memory/STATE.md ile karşılaştır):",
        f"- STATE.md kaydı: {recorded} | son commit: {last_commit_date or 'yok'}",
        f"- commit edilmemiş değişiklik: {len(dirty)} dosya",
        f"- branch: {sh('git', 'branch', '--show-current') or '?'}",
        "- son commit'ler:",
    ]
    lines += [f"    {l}" for l in log.splitlines()]

    if recorded != "bilinmiyor" and last_commit_date and recorded < last_commit_date:
        lines.append(
            "- UYARI: STATE.md son commit'ten eski. Çalışmaya başlamadan önce "
            "docs/memory/STATE.md'yi gerçek durumla karşılaştır ve yanlışsa düzelt."
        )
    print("\n".join(lines))


def cmd_mark() -> None:
    data = read_input()
    path = (data.get("tool_input") or {}).get("file_path") or ""
    if not path:
        return
    try:
        rel = str(pathlib.Path(path).resolve().relative_to(ROOT.resolve()))
    except Exception:
        return
    if rel.startswith(IGNORED_PREFIXES):
        return
    m = marker(data.get("session_id", ""))
    payload = load(m) or {"started": time.time(), "files": []}
    if rel not in payload["files"]:
        payload["files"].append(rel)
    m.write_text(json.dumps(payload))


def cmd_stop() -> None:
    data = read_input()
    if data.get("stop_hook_active"):   # sonsuz döngü koruması
        return
    m = marker(data.get("session_id", ""))
    payload = load(m)
    files = payload.get("files") or []
    if not files:
        return
    started = payload.get("started", 0)
    try:
        if STATE.stat().st_mtime >= started:   # bu oturumda güncellenmiş
            return
    except FileNotFoundError:
        pass

    shown = ", ".join(files[:8]) + (f" (+{len(files) - 8})" if len(files) > 8 else "")
    reason = (
        f"STATE guard: bu oturumda {len(files)} kaynak dosya değişti ({shown}) ama "
        "docs/memory/STATE.md güncellenmedi.\n\n"
        "Şimdi şunları yap, sonra bitir:\n"
        "1. docs/memory/STATE.md'yi gerçek duruma göre güncelle — 'Son güncelleme' "
        "tarihi, aktif iş, faz tablosu, commit edilmemiş iş uyarısı, açık sorular. "
        "Durumu tahmin etme, git ve dosya varlığıyla doğrula.\n"
        "2. Bu oturumda kalıcı bir karar alındıysa gerekçesiyle "
        "docs/memory/decisions.md'ye ekle.\n"
        "3. Bir şey ikinci kez zaman kaybettirdiyse docs/memory/gotchas.md'ye ekle.\n"
        "Kod değiştirme; sadece bu dosyaları yaz ve kullanıcıya 1-2 satırda ne "
        "kaydettiğini söyle."
    )
    print(json.dumps({"decision": "block", "reason": reason}))


MODES = {"session-start": cmd_session_start, "mark": cmd_mark, "stop": cmd_stop}

if __name__ == "__main__":
    fn = MODES.get(sys.argv[1] if len(sys.argv) > 1 else "")
    if fn:
        try:
            fn()
        except Exception as exc:            # hook asla oturumu kırmamalı
            print(f"STATE guard hatası (yok sayıldı): {exc}", file=sys.stderr)
    sys.exit(0)
