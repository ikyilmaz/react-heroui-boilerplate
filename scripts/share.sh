#!/usr/bin/env bash
# Üretim derlemesini Cloudflare hızlı tüneliyle paylaşır: derler, `vite preview`'u yalnızca bu
# makinede (127.0.0.1) açar ve önüne geçici bir https://….trycloudflare.com adresi alır. Hesap ya
# da alan adı gerekmez; adres her çalıştırmada değişir. Ctrl+C sunucuyu ve tüneli birlikte kapatır.
#
#   npm run share                  # derle + paylaş
#   npm run share -- --no-build    # son derlemeyi (dist/) paylaş
#   PORT=4190 npm run share        # başka bir yerel port
set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-4180}"
BUILD=1
for arg in "$@"; do
  case "$arg" in
    --no-build) BUILD=0 ;;
    *)
      echo "Bilinmeyen seçenek: $arg (yalnızca --no-build)" >&2
      exit 2
      ;;
  esac
done

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared bulunamadı. Kurulum: brew install cloudflared" >&2
  exit 1
fi
if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "$PORT portu kullanımda; başka bir port seçin: PORT=4190 npm run share" >&2
  exit 1
fi

if [ "$BUILD" = 1 ]; then
  echo "› Üretim derlemesi alınıyor…"
  npm run build
elif [ ! -f dist/index.html ]; then
  echo "dist/ boş; önce derleyin (--no-build olmadan çalıştırın)." >&2
  exit 1
fi

LOG_DIR="$(mktemp -d)"
PREVIEW_PID=""
TUNNEL_PID=""
AWAKE_PID=""
cleanup() {
  trap - EXIT
  echo
  echo "› Kapatılıyor…"
  # `caffeinate` bu betiği bekler: düz `wait` onu da bekleyip kilitlenirdi, açıkça kapatılır
  for pid in $TUNNEL_PID $PREVIEW_PID $AWAKE_PID; do kill "$pid" 2>/dev/null || true; done
  for pid in $TUNNEL_PID $PREVIEW_PID $AWAKE_PID; do wait "$pid" 2>/dev/null || true; done
  rm -rf "$LOG_DIR"
}
# Ctrl+C / kapatma betikten çıkar; temizlik çıkışta (yoksa betik bekleme döngüsünden sürerdi)
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Paylaşım sürerken Mac boşta uykuya geçmesin (kapak kapanınca yine uyur)
if command -v caffeinate >/dev/null 2>&1; then
  caffeinate -i -w $$ &
  AWAKE_PID=$!
fi

# Yalnızca 127.0.0.1: sunucu yerel ağa açılmaz, dışarıdan yalnızca tünelden erişilir. Tünel de aynı
# adrese bağlanır (`localhost` bazı makinelerde ::1'e çözülür; IPv4 / IPv6 uyuşmazlığı olmasın).
# `vite.config.ts` › `preview.allowedHosts` tünel adresine (.trycloudflare.com) izin verir.
echo "› Sunucu başlatılıyor (http://127.0.0.1:$PORT)…"
./node_modules/.bin/vite preview --host 127.0.0.1 --port "$PORT" --strictPort \
  >"$LOG_DIR/preview.log" 2>&1 &
PREVIEW_PID=$!
for _ in $(seq 1 50); do
  curl -sf -o /dev/null "http://127.0.0.1:$PORT/" && break
  sleep 0.2
done
if ! curl -sf -o /dev/null "http://127.0.0.1:$PORT/"; then
  echo "Sunucu açılamadı:" >&2
  cat "$LOG_DIR/preview.log" >&2
  exit 1
fi

echo "› Cloudflare tüneli açılıyor…"
cloudflared tunnel --no-autoupdate --url "http://127.0.0.1:$PORT" >"$LOG_DIR/tunnel.log" 2>&1 &
TUNNEL_PID=$!
URL=""
READY=""
# Adres hemen yazılır; bağlantı kayıt olunca (Registered tunnel connection) erişilebilir olur
for _ in $(seq 1 150); do
  [ -z "$URL" ] &&
    URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_DIR/tunnel.log" | head -1 || true)"
  grep -q 'Registered tunnel connection' "$LOG_DIR/tunnel.log" && READY=1
  [ -n "$URL" ] && [ -n "$READY" ] && break
  kill -0 "$TUNNEL_PID" 2>/dev/null || break
  sleep 0.2
done
if [ -z "$URL" ] || [ -z "$READY" ]; then
  echo "Tünel açılamadı:" >&2
  cat "$LOG_DIR/tunnel.log" >&2
  exit 1
fi

command -v pbcopy >/dev/null 2>&1 && printf '%s' "$URL" | pbcopy && COPIED=" (panoya kopyalandı)"
echo
echo "  Paylaşım adresi${COPIED:-}:"
echo
echo "    $URL"
echo
echo "  Adres birkaç saniye içinde açılır. Bu pencere açık kaldıkça yayında; kapatmak için Ctrl+C."
echo

# Sunucu ya da tünel düşerse kapat (macOS'un bash 3.2'sinde `wait -n` yok)
while kill -0 "$PREVIEW_PID" 2>/dev/null && kill -0 "$TUNNEL_PID" 2>/dev/null; do
  sleep 1
done
echo "Sunucu ya da tünel beklenmedik şekilde kapandı. Son günlük satırları:" >&2
tail -n 20 "$LOG_DIR/preview.log" "$LOG_DIR/tunnel.log" >&2
exit 1
