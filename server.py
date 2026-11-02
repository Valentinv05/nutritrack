#!/usr/bin/env python3
"""
NutriTrack — Server Locale Wi-Fi & Generatore QR Code (Zero Dipendenze)
Permette di usare e installare NutriTrack su PC e Telefono (stessa rete Wi-Fi).
"""

import argparse
import http.server
import json
import os
import socket
import socketserver
import sys
import webbrowser
from urllib.parse import urlparse


# ==================== PURE-PYTHON QR CODE GENERATOR (V1..V4, LEVEL L) ====================
_VERSION_SPECS = {
    1: (21, 19, 7, []),
    2: (25, 34, 10, [6, 18]),
    3: (29, 55, 15, [6, 22]),
    4: (33, 80, 20, [6, 26]),
}

_GF_EXP = [0] * 512
_GF_LOG = [0] * 256


def _init_gf():
    x = 1
    for i in range(255):
        _GF_EXP[i] = x
        _GF_LOG[x] = i
        x <<= 1
        if x & 0x100:
            x ^= 0x11D
    for i in range(255, 512):
        _GF_EXP[i] = _GF_EXP[i - 255]


_init_gf()


def _gf_mul(a, b):
    if a == 0 or b == 0:
        return 0
    return _GF_EXP[_GF_LOG[a] + _GF_LOG[b]]


def _rs_encode(data_bytes, ec_len):
    gen = [1]
    for i in range(ec_len):
        nxt = [0] * (len(gen) + 1)
        factor = _GF_EXP[i]
        for j, coeff in enumerate(gen):
            nxt[j] ^= coeff
            nxt[j + 1] ^= _gf_mul(coeff, factor)
        gen = nxt

    rem = [0] * ec_len
    for b in data_bytes:
        factor = b ^ rem[0]
        rem = rem[1:] + [0]
        for j in range(ec_len):
            rem[j] ^= _gf_mul(gen[j + 1], factor)
    return rem


def _bch_format_bits(ec_level_bits, mask_id):
    data = (ec_level_bits << 3) | mask_id
    rem = data << 10
    for i in range(14, 9, -1):
        if (rem >> i) & 1:
            rem ^= 0x537 << (i - 10)
    return ((data << 10) | rem) ^ 0x5412


def make_qr_matrix(text):
    payload = text.encode("utf-8")
    ver = None
    for v, (sz, data_cw, ec_cw, aligns) in _VERSION_SPECS.items():
        if len(payload) + 2 <= data_cw:
            ver = v
            break
    if ver is None:
        raise ValueError("URL troppo lungo per QR compatto")

    size, data_cw, ec_cw, aligns = _VERSION_SPECS[ver]

    # Build bit stream: Byte mode (0100) + 8-bit length + bytes + terminator
    bits = [0, 1, 0, 0]
    for i in range(7, -1, -1):
        bits.append((len(payload) >> i) & 1)
    for byte in payload:
        for i in range(7, -1, -1):
            bits.append((byte >> i) & 1)

    max_bits = data_cw * 8
    for _ in range(min(4, max_bits - len(bits))):
        bits.append(0)
    while len(bits) % 8 != 0:
        bits.append(0)

    codewords = []
    for i in range(0, len(bits), 8):
        val = 0
        for bit in bits[i : i + 8]:
            val = (val << 1) | bit
        codewords.append(val)

    pad_seq = [0xEC, 0x11]
    idx = 0
    while len(codewords) < data_cw:
        codewords.append(pad_seq[idx % 2])
        idx += 1

    full_cw = codewords + _rs_encode(codewords, ec_cw)

    matrix = [[0] * size for _ in range(size)]
    is_func = [[False] * size for _ in range(size)]

    def set_func(r, c, dark):
        if 0 <= r < size and 0 <= c < size:
            matrix[r][c] = 1 if dark else 0
            is_func[r][c] = True

    def place_finder(top_r, left_c):
        for dr in range(-1, 8):
            for dc in range(-1, 8):
                r, c = top_r + dr, left_c + dc
                if 0 <= r < size and 0 <= c < size:
                    in_outer = 0 <= dr <= 6 and 0 <= dc <= 6
                    on_border = dr in (0, 6) or dc in (0, 6)
                    in_center = 2 <= dr <= 4 and 2 <= dc <= 4
                    set_func(r, c, in_outer and (on_border or in_center))

    place_finder(0, 0)
    place_finder(0, size - 7)
    place_finder(size - 7, 0)

    # Alignment patterns
    for ar in aligns:
        for ac in aligns:
            if (ar == 6 and ac == 6) or (ar == 6 and ac == size - 7) or (ar == size - 7 and ac == 6):
                continue
            for dr in range(-2, 3):
                for dc in range(-2, 3):
                    dark = max(abs(dr), abs(dc)) in (0, 2)
                    set_func(ar + dr, ac + dc, dark)

    # Timing patterns
    for i in range(8, size - 8):
        if not is_func[6][i]:
            set_func(6, i, i % 2 == 0)
        if not is_func[i][6]:
            set_func(i, 6, i % 2 == 0)

    # Dark module & reserve format info slots
    set_func(size - 8, 8, True)
    for i in range(9):
        if not is_func[8][i]:
            set_func(8, i, False)
        if not is_func[i][8]:
            set_func(i, 8, False)
    for i in range(8):
        if not is_func[8][size - 1 - i]:
            set_func(8, size - 1 - i, False)
    for i in range(7):
        if not is_func[size - 1 - i][8]:
            set_func(size - 1 - i, 8, False)

    # Place data + EC bits in zigzag 2-column strips
    all_bits = []
    for cw in full_cw:
        for i in range(7, -1, -1):
            all_bits.append((cw >> i) & 1)

    bit_idx = 0
    upward = True
    col = size - 1
    while col > 0:
        if col == 6:
            col -= 1
        rows = range(size - 1, -1, -1) if upward else range(size)
        for r in rows:
            for dc in (0, -1):
                c = col + dc
                if not is_func[r][c]:
                    bit = all_bits[bit_idx] if bit_idx < len(all_bits) else 0
                    bit_idx += 1
                    # Apply Mask 0: (r + c) % 2 == 0
                    if (r + c) % 2 == 0:
                        bit ^= 1
                    matrix[r][c] = bit
        upward = not upward
        col -= 2

    # Write Format Info for EC Level L (0b01) + Mask 0 (0b000)
    fmt = _bch_format_bits(0b01, 0)
    tl_coords = [
        (8, 0), (8, 1), (8, 2), (8, 3), (8, 4), (8, 5), (8, 7), (8, 8),
        (7, 8), (5, 8), (4, 8), (3, 8), (2, 8), (1, 8), (0, 8),
    ]
    tr_bl_coords = [
        (size - 1, 8), (size - 2, 8), (size - 3, 8), (size - 4, 8),
        (size - 5, 8), (size - 6, 8), (size - 7, 8),
        (8, size - 8), (8, size - 7), (8, size - 6), (8, size - 5),
        (8, size - 4), (8, size - 3), (8, size - 2), (8, size - 1),
    ]
    for idx_b in range(15):
        bit = (fmt >> (14 - idx_b)) & 1
        r1, c1 = tl_coords[idx_b]
        r2, c2 = tr_bl_coords[idx_b]
        matrix[r1][c1] = bit
        matrix[r2][c2] = bit

    return matrix


def qr_to_svg(text, border=3):
    mat = make_qr_matrix(text)
    n = len(mat)
    total = n + border * 2
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total} {total}" shape-rendering="crispEdges">',
        f'<rect width="{total}" height="{total}" fill="#ffffff"/>',
        '<path fill="#0f172a" d="',
    ]
    cmds = []
    for r in range(n):
        for c in range(n):
            if mat[r][c]:
                cmds.append(f"M{c + border},{r + border}h1v1h-1z")
    parts.append("".join(cmds))
    parts.append('"/></svg>')
    return "".join(parts)


def qr_to_terminal(text):
    mat = make_qr_matrix(text)
    n = len(mat)
    pad = 2
    padded = [[0] * (n + pad * 2) for _ in range(n + pad * 2)]
    for r in range(n):
        for c in range(n):
            padded[r + pad][c + pad] = mat[r][c]

    lines = []
    total = len(padded)
    for r in range(0, total, 2):
        row_chars = []
        for c in range(total):
            top = padded[r][c]
            bot = padded[r + 1][c] if r + 1 < total else 0
            if top and bot:
                row_chars.append(" ")
            elif top and not bot:
                row_chars.append("▄")
            elif not top and bot:
                row_chars.append("▀")
            else:
                row_chars.append("█")
        lines.append("  " + "".join(row_chars))
    return "\n".join(lines)


# ==================== NETWORK & HTTP SERVER ====================
def detect_lan_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            if ip and not ip.startswith("127."):
                return ip
    except Exception:
        pass

    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if ip and not ip.startswith("127.") and not ip.startswith("169.254."):
                return ip
    except Exception:
        pass

    return "127.0.0.1"


ROOT_DIR = os.path.dirname(os.path.abspath(__file__))


class NutriHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/server-info":
            lan_ip = detect_lan_ip()
            port = self.server.server_address[1]
            lan_url = f"http://{lan_ip}:{port}"
            local_url = f"http://localhost:{port}"
            payload = {
                "lanIp": lan_ip,
                "port": port,
                "lanUrl": lan_url,
                "localUrl": local_url,
                "qrSvg": qr_to_svg(lan_url),
            }
            raw = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return

        return super().do_GET()

    def log_message(self, fmt, *args):
        # Clean, quiet logs
        sys.stdout.write(f"[NutriTrack] {self.address_string()} -> {fmt % args}\n")


class ReusableTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = os.name != "nt"
    daemon_threads = True


def _is_port_in_use(port):
    for host in ("127.0.0.1", "::1"):
        family = socket.AF_INET6 if ":" in host else socket.AF_INET
        try:
            with socket.socket(family, socket.SOCK_STREAM) as s:
                s.settimeout(0.25)
                if s.connect_ex((host, port)) == 0:
                    return True
        except OSError:
            pass
    return False


def find_open_port(preferred=8765):
    for p in [preferred, 8766, 8090, 8899, 0]:
        if p != 0 and _is_port_in_use(p):
            continue
        try:
            with ReusableTCPServer(("0.0.0.0", p), NutriHandler) as srv:
                return srv.server_address[1]
        except OSError:
            continue
    return preferred


def main():
    parser = argparse.ArgumentParser(description="Avvia NutriTrack PWA Server")
    parser.add_argument("--port", type=int, default=8765, help="Porta HTTP (default: 8765)")
    parser.add_argument("--no-browser", action="store_true", help="Non aprire automaticamente il browser")
    args = parser.parse_args()

    # Ensure UTF-8 terminal output on Windows
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
        except Exception:
            pass

    port = find_open_port(args.port)
    lan_ip = detect_lan_ip()
    local_url = f"http://localhost:{port}"
    lan_url = f"http://{lan_ip}:{port}"

    with ReusableTCPServer(("0.0.0.0", port), NutriHandler) as httpd:
        print("\n" + "=" * 58)
        print("  🥗 NUTRITRACK — DIARIO CALORIE & MACRONUTRIENTI ATTIVO")
        print("=" * 58)
        print(f"  💻 Sul tuo PC apri:       {local_url}")
        print(f"  📱 Sul Telefono (Wi-Fi):  {lan_url}")
        print("-" * 58)
        try:
            print("  Inquadra questo QR Code con la fotocamera del telefono:\n")
            print(qr_to_terminal(lan_url))
            print()
        except Exception:
            pass
        print("  Premi CTRL+C in questa finestra per chiudere il server.")
        print("=" * 58 + "\n", flush=True)

        if not args.no_browser:
            webbrowser.open(local_url)

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer NutriTrack arrestato.")


if __name__ == "__main__":
    main()
