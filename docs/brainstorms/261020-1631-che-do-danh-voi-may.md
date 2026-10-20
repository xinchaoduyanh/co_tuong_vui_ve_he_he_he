# Nghiên cứu: chế độ đánh với máy (Xiangqi vs AI)

Ngày: 2026-10-20 · Trạng thái: nghiên cứu, chưa code · Tác giả: session ai-gameplay-research

> Lưu ý: repo chưa có thư mục `docs/` nào khác (project-pdr, architecture... không tồn tại), nên báo cáo dựa trực tiếp trên code.
> Mục nào ghi **(chưa kiểm chứng)** là kiến thức nền/không tìm được nguồn trong lần search này — cần chạy thử trước khi chốt.

## 1. Hiện trạng code

**Kiến trúc**: `be/` Spring Boot + STOMP WebSocket + JPA (`ddl-auto=update`); `fe/` Next.js (Turbopack) + `@stomp/stompjs`.

**Bàn cờ**: chuỗi 90 ký tự, ô `(x,y)` ở chỉ số `y*9+x`; chữ thường = đỏ (`r`, nằm phía trên, y nhỏ), chữ HOA = đen (`b`). Ký tự: `k a e h r c p`. Bàn ban đầu `rheakaehr..........c.....c.p.p.p.p.p...P.P.P.P.P.C.....C..........RHEAKAEHR`.

**Engine luật có sẵn (BE)**: `util/XiangqiRules` — `legalMoves(board, side)`, `isInCheck`, `evaluate` (NORMAL/CHECK/CHECKMATE/STALEMATE), `apply`, `record Move(fromX,fromY,toX,toY)`. Có test `XiangqiRulesTest`.

**Luồng PvP (đã làm chuẩn)**: `GameSessionService.makeMove(matchId, username, fromX,fromY,toX,toY)` — server-authoritative: kiểm tra lượt, luật, đồng hồ (`TURN_LIMIT_MS=600000`), lưu `Move`, broadcast `/topic/match.{id}.board`, tự kết thúc ván khi chiếu bí/hết nước (`finishGame`).

**Chế độ vs máy (dang dở / cũ)**:
- FE: `fe/app/ai-game-board/page.tsx` + `lib/api/hooks/use-ai-game.ts`. Hook có state `aiDifficulty` (easy/medium/hard) nhưng **không dùng ở đâu**; `isAITurn` không bao giờ set.
- BE: `@MessageMapping("/game.withAI")` tạo match với player2 là user cố định `"da1"` (phải tồn tại trong DB); nước đi đi qua `handleAIMove` (WebSocketController ~l.313) — **luồng cũ**: tin `boardState` do client gửi (không kiểm luật), chỉ phát hiện thua khi mất tướng, không đồng hồ, không chiếu bí.
- AI: `ChessDBAIService` gọi API bên thứ 3 `http://www.chessdb.cn/chessdb.php?action=querybest` (cơ sở dữ liệu cloud, không phải engine; HTTP thường; phụ thuộc mạng/rate limit, có thể trả "unknown" với thế cờ lạ → đúng là "cứ sao sao" như README). Đồng thời sinh FEN từ `INITIAL_FEN + moves` và **ánh xạ tọa độ đảo ngược** (`8-x`, `9-y`) và đảo hoa/thường — dễ sai, nên viết lại.
- Không có undo, không chọn độ khó, không đồng hồ cho AI game.

## 2. Các lựa chọn

| | Pikafish | Fairy-Stockfish | ElephantEye | Minimax tự viết (JS/Java) | chessdb.cn (hiện tại) |
|---|---|---|---|---|---|
| Sức mạnh | Mạnh nhất cho Xiangqi (NNUE, vượt xa người) | Rất mạnh (NNUE Xiangqi riêng), hơi kém Pikafish | Cũ, ~kỳ thủ giỏi; yếu hơn nhiều so với 2 cái trên | Yếu→trung bình tùy depth | Rất mạnh (tra DB) nhưng không ổn định |
| License | GPL-3.0 (mạng NNUE: ODbL) ✔ nguồn | GPL-3.0 ✔ nguồn | **(chưa kiểm chứng)** | Tự do | API ngoài |
| Giao thức | UCI (tọa độ `a0`–`i9`, hạng 0–9, FEN xiangqi) | UCI/UCCI; chọn `UCI_Variant xiangqi`; **hạng 1–10** (nước ở hạng 10 viết `a10`) **(chưa kiểm chứng chi tiết)** | UCCI | n/a | HTTP |
| Bản WASM/browser | Không có bản chính thức; build cộng đồng **(chưa kiểm chứng)** | Có: npm `fairy-stockfish-nnue.wasm` (pychess.org dùng); `ffish.js` (luật/FEN, không phải engine) | Không | Có (thuần JS) | Không |
| Chỉnh độ khó | `go depth N / movetime`, MultiPV; `Skill Level`/`UCI_Elo` **cần chạy `uci` để xác nhận** | `Skill Level` 0–20, `UCI_LimitStrength`+`UCI_Elo` (kế thừa Stockfish; README mô tả), depth, movetime | depth | depth | không |
| Kích thước | Binary vài MB + file `.nnue` lớn (hàng chục MB, **chưa xác nhận con số**) | Binary/wasm vài MB–hàng chục MB tùy build, NNUE xiangqi nhúng sẵn **(chưa xác nhận)** | nhỏ | nhỏ | 0 |
| Tích hợp Next.js | Khó nếu chạy trong browser; **dễ ở server** (spawn process) | Browser: cần Web Worker + (nếu multi-thread) header COOP/COEP, tải wasm hàng chục MB; server: spawn binary | Spawn process | Dễ nhất | Đang dùng |

GPL-3.0: chạy engine như **process riêng ở server** không phân phối binary cho người dùng → không bị nghĩa vụ phát hành mã nguồn của web. Nếu đẩy WASM xuống trình duyệt = *phân phối* → phải kèm license + trỏ tới source (làm được nhưng nhiều thủ tục hơn). Không phải tư vấn pháp lý.

### Chạy ở browser (Web Worker + WASM) vs server (spawn UCI)
- **Browser**: không tốn CPU server, offline được; nhưng tải nặng, máy yếu/điện thoại chậm, WASM đa luồng cần COOP/COEP (ảnh hưởng embed/ảnh/font ngoài), khó chống gian lận (không quan trọng với chế độ vs máy), và **không khớp** kiến trúc hiện tại (server-authoritative, có lưu match/Elo/đồng hồ).
- **Server**: khớp hoàn toàn với `GameSessionService` (AI chỉ là "người chơi ảo"), mạnh nhất (Pikafish native + NNUE đầy đủ + nhiều luồng), FE gần như không đổi. Nhược: tốn CPU/RAM server → giới hạn số ván AI đồng thời (hàng đợi/semaphore), cần cài binary + file `.nnue` trên máy deploy.

## 3. Khuyến nghị

**Dùng Pikafish native chạy ở BE qua giao thức UCI (subprocess), bọc sau interface `AiEngine`** để sau này đổi sang Fairy-Stockfish/bản WASM mà không sửa phần còn lại. Lý do: mạnh nhất, đúng kiến trúc hiện có, không phụ thuộc chessdb.cn, tránh vấn đề WASM/COOP-COEP/kích thước.

**Độ khó**: đừng chỉ phụ thuộc `Skill Level` (chưa chắc Pikafish hỗ trợ). Tự cài cơ chế độc lập engine, kết hợp:
- giới hạn `go movetime`/`depth` (dễ → depth 1–2, khó → movetime ~1–2s),
- `MultiPV 3–4` và xác suất chọn nước không-tốt-nhất (dễ: hay chọn nước thứ 2–3, thỉnh thoảng nước ngẫu nhiên trong top; khó: luôn nước tốt nhất),
- nếu `uci` của build liệt kê `UCI_LimitStrength/UCI_Elo/Skill Level` thì bật thêm.

Gợi ý 5 mức (tinh chỉnh bằng cách cho các mức đấu nhau):

| Mức | Tên | depth/movetime | MultiPV | Chọn nước |
|---|---|---|---|---|
| 1 | Tập sự | depth 1 | 4 | 40% ngẫu nhiên trong top-4 |
| 2 | Dễ | depth 3 | 3 | 25% nước 2–3 |
| 3 | Trung bình | depth 6 | 2 | 10% nước thứ 2 |
| 4 | Khó | 500ms | 1 | tốt nhất |
| 5 | Đại kiện tướng | 2000ms | 1 | tốt nhất |

**Phương án dự phòng**: nếu không muốn cài binary lên server → Fairy-Stockfish WASM trong Web Worker ở FE (`fairy-stockfish-nnue.wasm`), AI vẫn gửi nước đi lên BE qua `makeMove` như người thật (BE vẫn xác thực luật). Tốn công hơn ở FE.

## 4. Kế hoạch tích hợp

### Bước 0 — thử engine (30 phút, không code app)
Tải Pikafish release + file `.nnue` (https://github.com/official-pikafish/Pikafish), chạy tay: `uci` (xem option có `Skill Level`/`UCI_Elo` không, xác nhận hạng 0–9), `position fen rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w` rồi `go movetime 500`. Ghi lại kích thước binary + nnue.

### Bước 1 — BE: lớp engine (file mới)
- `service/ai/UciEngineClient.java`: spawn process (`ProcessBuilder`), 1 reader thread, gửi `uci`/`isready`, `setoption`, `position fen … moves …`, `go …`, parse `info … multipv N … score … pv …` và `bestmove`. Timeout + tự khởi động lại nếu process chết. Đóng bằng `@PreDestroy` (`quit`).
- `service/ai/EngineMoveService.java` (thay `ChessDBAIService`): nhận `(startFen, history, level)` → trả `XiangqiRules.Move`. Pool N engine (cấu hình) + `Semaphore`; hết slot → trả lỗi "Máy đang bận".
- Cấu hình `application.properties`: `ai.engine.path`, `ai.engine.nnue`, `ai.engine.pool-size`, `ai.engine.threads`, `ai.engine.hash-mb`.
- **Chuyển đổi bàn cờ ↔ FEN** (đặt thành 1 class `XiangqiNotation` + unit test thật kỹ — đây là chỗ code cũ dễ sai): quy ước repo là đỏ ở `y` nhỏ (trên), chữ thường; FEN chuẩn liệt kê hạng 9 (phe đen) trước, đỏ = chữ HOA. Gợi ý: duyệt `y` từ 9 về 0, `x` 0..8, đổi hoa/thường, `h→N`, `e→B`; nước đi: `file = 'a'+x`, `rank = y` (UCI Pikafish hạng 0–9) — dùng cùng một quy ước cho FEN và nước đi thì không cần đảo gương như `ChessDBAIService` đang làm. Gửi `position fen <FEN ván bắt đầu> moves <toàn bộ lịch sử>` (không chỉ FEN hiện tại) để engine nhận biết lặp thế/chiếu dai.
- **Luôn xác thực nước engine trả về** bằng `XiangqiRules.legalMoves`; nếu không hợp lệ → thử lại 1 lần, rồi fallback chọn nước hợp lệ ngẫu nhiên (không để ván treo).

### Bước 2 — BE: đưa AI vào `GameSessionService` (bỏ luồng cũ)
- Mục tiêu: AI = người chơi ảo `da1`; mọi nước (người lẫn máy) đều đi qua `GameSessionService.makeMove(...)` để có kiểm luật, chiếu bí, đồng hồ, lưu `Move`, `finishGame` đúng như PvP.
- `/game.withAI` (WebSocketController ~l.643): đổi payload từ chuỗi username sang JSON `{username, level, side}`; tạo match qua cùng đường với PvP (`registerNewMatch`) thay vì code riêng; lưu `aiLevel` (cột mới `Match.aiLevel`; `ddl-auto=update` tự thêm cột). Cho người chọn cầm đỏ/đen; nếu máy cầm đỏ thì đi trước ngay.
- Sau mỗi nước người (cuối `makeMove`, khi đối thủ là AI và ván chưa kết thúc) → submit một task vào `TaskExecutor` riêng (không chạy trên luồng STOMP vì engine mất 0.1–2 s và `makeMove` đang `synchronized(session)`): tính nước → `makeMove(matchId, "da1", …)`. Đồng hồ của AI: trừ đúng thời gian suy nghĩ hoặc miễn (khuyến nghị: miễn/ngưng đồng hồ máy, chỉ tính đồng hồ người).
- Xoá `handleAIMove`, nhánh `isAIMatch` trong `handleMove`, `AIGameService.processAIMove`, `ChessDBAIService`, và property `chessdb.api.url` khi đã chạy ổn. Giữ Elo: quyết định có tính Elo vs máy không (khuyến nghị: **không** tính, hoặc chỉ tính nhẹ, để không farm Elo).
- Tái kết nối/rejoin: `GameSessionService` đã có `snapshot`, `findActiveSessionByPlayerId` → ván AI tự được hưởng.

### Bước 3 — FE
- `lib/api/hooks/use-ai-game.ts`: dùng lại `aiDifficulty` (đổi thành level 1–5) và truyền vào `startAIGame(level, side)`; set `isAITurn` = `turn !== myColor`.
- UI chọn độ khó: dialog trước khi vào ván (hoặc ở `board-menu.tsx` nơi mở "Đánh với máy") dùng `components/ui/radio-group` hoặc `slider`; hiển thị tên mức + mô tả.
- `app/ai-game-board/page.tsx`: bỏ việc client tự serialize `boardState` gửi lên (`serializePiecesToBoardState`); chỉ gửi `{fromX,fromY,toX,toY}` như `game-board/page.tsx` (PvP) — lý tưởng là **dùng chung** component/hook với PvP (`use-game-state`, `use-board-logic`) và chỉ khác đoạn khởi tạo; hiển thị "Máy đang nghĩ…" + chặn click khi lượt máy; đồng hồ/`turn-banner` dùng lại từ PvP.

### Bước 4 — Undo (đi lại)
- Chỉ cho ván vs máy: "Đi lại" = hoàn tác **cặp** nước (máy + người) để lượt về người. Nếu đang tới lượt máy (máy chưa đi) thì chỉ hoàn tác 1 nước.
- BE: endpoint STOMP `/app/match.{id}.undo`: kiểm tra match là AI và chưa kết thúc, `synchronized(session)`, xoá 2 `Move` cuối (cần `MoveRepository.deleteByMatchIdAndTurnNumberGreaterThan…`), khôi phục `session.boardState/turn/nextTurnNumber/check` từ `Move` trước đó, broadcast một snapshot (`snapshot(session)` hiện có) lên topic board. Giới hạn số lần undo (vd. 3/ván) và hủy task AI đang chạy (cờ huỷ theo `matchId + turnNumber` để kết quả muộn không áp vào thế mới).
- FE: nút "Đi lại" trong thanh điều khiển; vô hiệu khi < 2 nước.

### Bước 5 — kiểm thử & vận hành
- Unit test: `XiangqiNotation` (FEN ↔ board, nước ↔ UCI) với thế khai cuộc và vài thế biết trước; test `EngineMoveService` với engine giả (`FakeEngine`) để không cần binary khi CI.
- Test tay: máy cầm đỏ/đen; chiếu bí; hết nước; chiếu dai; rejoin giữa ván; undo.
- Deploy: cài binary + `.nnue`, đặt `ai.engine.*`, `pool-size` ≈ số core/2, đặt ngưỡng RAM (`Hash` 16–64 MB mỗi engine).

### Thứ tự ưu tiên/ước lượng
1) Bước 0 + `XiangqiNotation` + `UciEngineClient` (≈1 ngày) → 2) Bước 2 + 3 với 1 mức khó cố định (≈1 ngày) → 3) 5 mức độ khó (≈0.5 ngày) → 4) Undo (≈0.5 ngày).

## 5. Rủi ro / việc cần xác nhận
- Số liệu kích thước binary/NNUE, option `Skill Level/UCI_Elo` của Pikafish, license ElephantEye: chưa kiểm chứng (README GitHub không nêu; cần xem wiki/release).
- Hosting hiện tại có cho chạy binary native không (nếu BE chạy trên PaaS hạn chế → dùng phương án WASM ở FE).
- Luật chiếu dai/lặp thế: engine tính tốt, nhưng `XiangqiRules` của BE chưa có luật cấm chiếu dai → ván có thể kéo dài; cân nhắc giới hạn số nước (hòa sau N nước không ăn quân).

## 6. Kết quả Bước 0 (đã chạy thật, 2026-10-20)

- Release mới nhất: `Pikafish-2026-09-06` (GitHub). Asset duy nhất: `Pikafish.2026-09-06.7z` (~53,6 MB) chứa binary cho từng OS + `pikafish.nnue`. Bản Linux là `Pikafish-Linux-x86-64-universal` (**6,9 MB**, ELF x86-64, tự chọn tập lệnh lúc chạy — không có file riêng avx2/bmi2/avx512). Máy dev có avx2, bmi2, avx512f/bw, vnni; chạy ~0,9 triệu nps/1 luồng.
- `pikafish.nnue`: **50.706.378 byte (~48,4 MiB, log engine ghi "64MiB" bộ nhớ)**. Engine tìm file theo option `EvalFile` (mặc định `pikafish.nnue` trong thư mục làm việc) → khi spawn phải set `EvalFile` đường dẫn tuyệt đối hoặc `directory` của process.
- Option `uci` liệt kê: `Debug Log File, NumaPolicy, Threads, Hash, Clear Hash, Ponder, MultiPV (1–128), Move Overhead, nodestime, UCI_ShowWDL, EvalFile`. **Không có `Skill Level`, `UCI_LimitStrength`, `UCI_Elo`** → độ khó phải tự cài bằng depth/movetime + MultiPV + chọn nước (đúng hướng ở mục 3).
- Tọa độ UCI: cột `a`–`i`, hàng `0`–`9` (không có `a10`). FEN chuẩn: hàng 9 (đen, chữ thường) trước, đỏ = chữ HOA ở dưới; `w` = đỏ đi. Test khai cuộc: `position fen rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w` + `go movetime 500` → `bestmove b2e2 ponder b9c7` (depth 18, cp +24).
- `MultiPV 4` + `go depth 1` hoạt động (trả 4 dòng `info … multipv N … pv …` rồi `bestmove`).
- Giấy phép: binary/mã GPL-3.0 (`Copying.txt`), mạng `pikafish.nnue` theo `NNUE-License.md`. Không commit vào repo; đặt ở `~/engines/pikafish/` (`ai.engine.path` / `ai.engine.nnue`).
- Vẫn chưa kiểm chứng: license ElephantEye, các số liệu Fairy-Stockfish.

## Nguồn
- Pikafish: https://github.com/official-pikafish/Pikafish (GPL-3.0, UCI, NNUE)
- Fairy-Stockfish: https://github.com/fairy-stockfish/Fairy-Stockfish (GPL-3.0, Xiangqi, NNUE riêng, ffish.js)
- WASM: https://github.com/gbtami/fairy-stockfish.wasm (npm `fairy-stockfish-nnue.wasm`, dùng bởi pychess.org)
