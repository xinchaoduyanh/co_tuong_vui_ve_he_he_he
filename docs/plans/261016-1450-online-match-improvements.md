# Brief: Cải thiện chế độ chơi online (mời & đấu 1-1)

Tạo: 2026-10-16 14:50 · Phạm vi: `be/` (Spring Boot 3.4 / Java 21 / STOMP over WebSocket) + `fe/` (Next.js 15 / React 19).
Chỉ làm chế độ **người ↔ người online**. Không đụng chế độ AI (`ai-game-board`, `AIGameService`, `ChessDBAIService`) và giải đấu.

## 0. Cách chạy để test

- DB local: `docker start xiangqi-pg` (Postgres 5433, db `xiangqi`, user `postgres`, pass `xiangqi`).
- BE: `cd be && SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/xiangqi SPRING_DATASOURCE_USERNAME=postgres SPRING_DATASOURCE_PASSWORD=xiangqi ./mvnw spring-boot:run` (cổng 8080 — container `pgadmin` đã dừng).
- FE: `cd fe && npm install --legacy-peer-deps && npm run dev` (cổng 3000).
- Tài khoản thử (DB local): `player1` / `player2`, mật khẩu `test1234`. Test bằng 2 cửa sổ (1 ẩn danh).
- KHÔNG sửa `application.properties` để trỏ DB khác; KHÔNG commit mật khẩu.

## 1. Yêu cầu của người dùng (theo thứ tự làm)

1. **Vào lại trận khi lỡ thoát** (reload, đóng tab, mất mạng).
2. **Thông báo rõ ràng, đẹp hơn** (lời mời, từ chối, hết hạn, lỗi, chiếu, kết quả).
3. **Chiếu bí / hết cờ** (chiếu tướng bắt buộc hóa giải, phát hiện chiếu hết và hết nước đi).
4. **Đồng hồ đếm ngược 10 phút/người**, hết giờ thì thua.
5. **Hiệu ứng chiến thắng** + **hỏi xác nhận trước khi rời trận**; chỉ rời khi đồng ý.

Thứ tự phụ thuộc: (3) cần bộ luật cờ phía server → (4) và (1) dựa trên trạng thái trận phía server → (5) và (2) là lớp UI trên cùng.

## 2. Hiện trạng & lỗi đã tìm thấy (có dẫn chứng)

### A. Không vào lại được trận
- `fe/lib/api/hooks/use-game-state.ts`: trạng thái trận chỉ đọc từ `localStorage` (`matchId`, `player1`, `player2`, `initialBoardState`). Không hỏi server. Đổi trình duyệt/xóa storage = mất trận.
- Cùng file: `turn` luôn khởi tạo `"r"`, **không đọc** `currentTurn` đã lưu → reload giữa trận sai lượt.
- `be/.../WebSocketController.handleWebSocketDisconnectListener`: ngắt kết nối chỉ xóa khỏi danh sách online; **không đánh dấu trận, không báo đối thủ, không có khái niệm "tạm vắng"**.
- `PlayerService.getOnlinePlayers()` chỉ lọc `ONLINE`; người đang `IN_GAME` biến mất khỏi danh sách và `canBeChallenged` = false. Sau reconnect trạng thái được đặt lại thành `ONLINE` dù trận chưa kết thúc (không có đường nào đặt lại `IN_GAME`; FE gửi `/app/user.status` nhưng **BE không có handler này**).
- Không có API lấy trận đang diễn ra của một người chơi.
- Trận bỏ dở không bao giờ kết thúc (`endDate` null mãi).

### B. Luật cờ & chiếu hết
- `fe/lib/api/hooks/use-board-logic.ts`: sinh nước đi *giả hợp lệ* — **không loại nước tự đưa tướng vào chiếu**, **không có luật "tướng đối mặt"** (flying general). Người chơi có thể đi nước khiến tướng mình bị ăn.
- `be/.../util/BoardChecker.java`: chỉ phát hiện "đang bị chiếu" (kể cả có sai sót theo README). **Không có** sinh nước đi, chiếu bí, hết nước (stalemate — trong cờ tướng bên hết nước đi là THUA).
- `WebSocketController.handleMove` kết thúc trận chỉ khi **một tướng biến mất khỏi bàn cờ** (`contains("k")`). FE nhận `data.isCheckmate` nhưng BE **không bao giờ gửi** trường này.
- **BE tin hoàn toàn vào client**: nhận `boardState`, `color`, `playerId` từ client; **không kiểm tra** lượt đi, người gửi có thuộc trận không, nước đi có hợp lệ không, trận đã kết thúc chưa. Gửi tay một `boardState` bất kỳ là thắng.
- `nextTurn` của BE suy ra từ nước trước (đúng), nhưng không so với `color` của người gửi.

### C. Kết thúc trận / Elo / rời trận
- `calculateEloChange(p1, p2, isWinner)` luôn lấy `p1` làm mốc; khi người thua là player2 thì dấu/độ lớn sai. Elo thắng/thua không đối xứng.
- Ba luồng kết thúc (bắt tướng, đầu hàng, hòa) **không thống nhất**: đầu hàng chỉ gọi `updatePlayerElo` (không cộng `wins/loses/totalMatches`, không cập nhật `PlayerMatch`); hòa không cập nhật `PlayerMatch`/`draws`; đầu hàng/hòa có thể bị gọi lặp (không có cờ "đã kết thúc") → cộng Elo nhiều lần.
- `END_GAME` gửi cả entity `Player` → **rò rỉ trường `password`** (đang lưu rõ) tới cả hai client, và FE ghi thẳng vào `localStorage.user`.
- `fe/app/game-board/page.tsx`: nhận `END_GAME` là **`router.push("/")` ngay lập tức** — người chơi không kịp nhìn kết quả. Nút `<` (Link tới `/`) và nút "Chơi với AI" rời trận **không hỏi xác nhận**, không đầu hàng.
- Không xóa `matchId/player1/player2/...` khỏi `localStorage` khi trận kết thúc.
- Nút "Đầu hàng"/"Cầu hòa" không kiểm tra người gửi có đúng là người chơi của trận.

### D. Lời mời & thông báo
- BE gửi `CHALLENGE_ERROR`, `CHALLENGE_INFO`, `CHALLENGE_SENT` nhưng FE **không xử lý** (chỉ xử lý `CHALLENGE_RECEIVED/REJECTED/ACCEPTED/ERROR`) → bấm mời xong im lặng khi đối phương bận/offline.
- `handleChallenge`/`handleChallengeSend` ở BE trả về im lặng khi đối phương offline/không thể nhận.
- Hết hạn 8s được tính ở **cả BE lẫn FE** (đồng hồ lệch); FE tự gửi "reject" khi hết hạn nên đối phương nhận thông báo "từ chối" thay vì "hết hạn".
- FE đăng ký **hai** kênh (`/user/{username}/queue/challenge` và `/user/queue/challenges`), logic nhân đôi; kênh thứ hai chết (BE không gửi).
- `pendingChallenges` do FE tự quản, BE không gửi `pendingChallenges` trong payload.
- Mời đối thủ A rồi lại mời đối thủ B: không có huỷ lời mời, không giới hạn; người mời có thể đang ở trong trận khác.
- Thông báo dùng PrimeReact Toast góc phải, text thô, `\n` không xuống dòng (kết quả trận); dialog chào/đầu hàng/hòa là `div` tự viết, không đồng nhất.
- Reconnect: `retryCount` đóng trong closure cũ; `onDisconnect` + `reconnectDelay` của STOMP chạy trùng; tạo nhiều client; `useEffect` cleanup dùng `stompClient` cũ → rò rỉ kết nối.

### E. Khác (ghi nhận, làm sau)
- Mật khẩu lưu rõ (`AuthService`), so sánh chuỗi thẳng; không token — `playerId` do client tự khai.
- `application.properties` đang chứa thông tin đăng nhập DB Neon thật, commit trong git.
- Log thừa nhiều (`[BE-xx]`, `console.log` FE).
- URL cứng `localhost:8080` rải trong ≥7 file FE.

## 3. Thiết kế đề xuất

### 3.1 Server là nguồn sự thật (nền tảng cho mọi mục)
Bộ nhớ trong (đủ cho đồ án) — `GameSessionService` (`ConcurrentHashMap<matchId, GameSession>`), nạp lại từ DB khi cần:
```
GameSession { matchId, redPlayerId, blackPlayerId, boardState(90 ký tự), turn("r"|"b"),
              redTimeMs, blackTimeMs, lastTickAt, status(ACTIVE|ENDED), moveCount,
              disconnectedAt{red,black}, drawOfferFrom }
```
Mọi hành động (đi, đầu hàng, cầu hòa, hết giờ, rời lâu) đi qua `GameSession` và **chỉ có một hàm `finishGame(session, reason, winnerColor|null)`** để: chốt Elo (đối xứng), cập nhật `Player` (wins/loses/draws/totalMatches), `PlayerMatch`, `Match.endDate/winner/result`, trả `IN_GAME → ONLINE`, phát `END_GAME`. Idempotent (bỏ qua nếu `status==ENDED`).

### 3.2 Bộ luật phía server — `XiangqiRules` (mới, trong `util/`)
- `List<Move> legalMoves(String board, char side)`: sinh nước giả hợp lệ cho 7 loại quân (xe, mã chân cản, tượng mắt cản/không qua sông, sĩ/tướng trong cung, pháo, tốt qua sông) rồi **lọc**: sau nước đi tướng mình không bị chiếu **và** hai tướng không đối mặt trên cùng cột không có quân giữa.
- `isInCheck(board, side)` (tái dùng/viết lại `BoardChecker`, thêm cả luật tướng đối mặt).
- `GameStatus evaluate(board, sideToMove)`: `CHECK`, `CHECKMATE` (đang bị chiếu & hết nước hợp lệ), `STALEMATE` (không bị chiếu & hết nước hợp lệ — **bên đó thua** theo luật cờ tướng), `NORMAL`.
- `handleMove` mới: nhận chỉ `{fromX,fromY,toX,toY}` (+`playerId`); server tự lấy bàn cờ từ session, kiểm tra: người gửi thuộc trận, đến lượt, quân đúng màu, nước nằm trong `legalMoves`; áp dụng nước đi, lưu `Move`, cộng giờ, gọi `evaluate` cho bên tiếp theo, phát `board` (kèm `check`, `lastMove`, `redTimeMs`, `blackTimeMs`) rồi nếu `CHECKMATE/STALEMATE` gọi `finishGame`. Bỏ cơ chế "mất tướng".
- Nước sai/không phải lượt → gửi lỗi riêng cho người gửi (`/user/queue/game.error`) với thông điệp tiếng Việt rõ ràng; không phát cho đối thủ.
- (Tuỳ chọn nếu còn thời gian) Chặn lặp nước/đuổi chiếu vô hạn: bỏ qua trong đợt này, ghi chú.

### 3.3 Đồng hồ 10 phút
- Mỗi bên 600.000 ms. Server giữ `lastTickAt`; khi có nước đi trừ thời gian bên vừa đi (`now - lastTickAt`), đổi lượt, đặt `lastTickAt=now`. (Không cộng thời gian mỗi nước trong đợt này.)
- Một `@Scheduled(fixedRate = 1000)` quét các session `ACTIVE`: nếu bên đang đến lượt hết giờ → `finishGame(reason=TIMEOUT)`.
- Server phát `redTimeMs/blackTimeMs` kèm mỗi nước và có thể phát nhịp `clock` ~mỗi 5s để đồng bộ. FE đếm lùi cục bộ mượt (mỗi 100–250 ms) từ giá trị server, **chỉ hiển thị**; quyết định thua do server.
- Hiển thị `mm:ss` ở 2 khung người chơi (đã có chỗ comment `players.red.timeLeft`); <60s đổi màu đỏ, <10s nhấp nháy.
- Người chơi mất kết nối vẫn bị trừ giờ (đồng hồ đối thủ không dừng) — đây là hành vi cố ý; xem 3.4.

### 3.4 Vào lại trận
- `GET /api/players/{id}/active-match` (hoặc qua STOMP) trả snapshot đầy đủ: `matchId`, hai người chơi (không có password), màu, `boardState`, `turn`, `redTimeMs`, `blackTimeMs`, `lastMove`, `check`, `drawOfferFrom`.
- FE: khi đăng nhập/kết nối thành công, nếu có trận `ACTIVE` → hiện banner/dialog "Bạn đang có trận dang dở với X — Vào lại" và tự điều hướng `/game-board?matchId=…`. `game-board` **luôn tải snapshot từ server** khi mount (bỏ phụ thuộc `localStorage` cho bàn cờ/lượt).
- `user.connect` ở BE: nếu người chơi có trận `ACTIVE` → đặt lại `IN_GAME` (không phải `ONLINE`), xoá `disconnectedAt`, báo đối thủ "X đã kết nối lại".
- Disconnect: nếu đang trong trận → đặt `disconnectedAt`, báo đối thủ "X mất kết nối, chờ tối đa 60s". Quá **60s** không quay lại → xử thua (`ABANDON`); đồng hồ vẫn chạy và hết giờ cũng thua, cái nào đến trước.
- Danh sách online hiển thị cả người `IN_GAME` (nhãn "Đang chơi", nút mời bị vô hiệu) thay vì ẩn.
- Thêm handler `/app/user.status` hoặc bỏ lời gọi thừa ở FE.

### 3.5 Thông báo
Một lớp duy nhất `lib/notify` (toast `sonner` đã có sẵn dependency, hoặc PrimeReact đang dùng — chọn **một**, đề xuất giữ PrimeReact Toast cho nhẹ nhất) với các loại: lời mời nhận, đã gửi lời mời (kèm nút huỷ), bị từ chối, hết hạn, đối phương bận/offline, nhận chiếu, đối phương mất kết nối/kết nối lại, cầu hòa, lỗi nước đi, kết nối WebSocket.
- BE: mọi nhánh im lặng ở `handleChallenge*` phải trả `CHALLENGE_ERROR` có mã (`TARGET_OFFLINE`, `TARGET_BUSY`, `SELF`, `ALREADY_PENDING`).
- FE: xử lý đủ `CHALLENGE_SENT/INFO/ERROR/REJECTED(reason=EXPIRED|DECLINED|BUSY)/ACCEPTED`. Chỉ giữ 1 kênh `/user/queue/challenge`. Hết hạn do **BE quyết định** (gửi `reason=EXPIRED` cho cả hai); FE chỉ đếm lùi hiển thị, không tự gửi reject.
- Chiếu tướng: banner nổi bật trên bàn cờ ("Chiếu tướng!") + rung nhẹ/viền đỏ quanh quân tướng bị chiếu, thay cho toast chung chung.
- Văn bản kết quả bỏ `\n` thô, dùng khối UI.
- Sửa kết nối: một `Client` duy nhất, bỏ retry tay (dùng `reconnectDelay`), cleanup đúng, hiển thị chỉ báo "Đang kết nối lại…".

### 3.6 Hiệu ứng thắng & xác nhận rời trận
- `END_GAME` **không** tự `router.push`. Hiện **overlay kết quả** trên bàn cờ: Thắng (pháo hoa/confetti bằng CSS hoặc canvas nhẹ, không thêm thư viện nặng; có thể dùng `canvas-confetti@1.9.3` nếu muốn), Thua, Hòa; lý do (chiếu bí / hết nước / hết giờ / đầu hàng / đối phương bỏ trận); Elo ± của mình (và đối thủ); nút "Về trang chủ" và "Xem lịch sử".
- Âm thanh thắng/thua tận dụng `soundEnabled` đã có (nếu có file; nếu chưa có thì bỏ qua, không bắt buộc).
- **Xác nhận trước khi rời** khi trận `ACTIVE`: nút `<`, link điều hướng, "Chơi với AI", đóng tab (`beforeunload`), nút Back trình duyệt (chặn `popstate`) → dialog "Rời trận sẽ bị xử THUA. Bạn có chắc?" [Ở lại] [Đồng ý rời]. Chỉ khi đồng ý mới gửi `surrender` rồi rời; không đồng ý thì ở lại. Lưu ý: *reload/đóng tab* không được coi là đầu hàng (xem 3.4 — vào lại được); `beforeunload` chỉ dùng hộp thoại mặc định của trình duyệt.
- Sau khi trận kết thúc: xóa `matchId/player1/player2/currentTurn/initialBoardState` khỏi `localStorage`, không cần xác nhận khi rời.

## 4. Kế hoạch triển khai (theo pha, mỗi pha chạy được độc lập)

| Pha | Nội dung | File chính (dự kiến) |
|---|---|---|
| P1 | `XiangqiRules` + test đơn vị (legalMoves, check, checkmate, stalemate, tướng đối mặt) | `be/.../util/XiangqiRules.java` (mới), `be/src/test/...` |
| P2 | `GameSessionService`, `finishGame` thống nhất, validate move phía server, sửa Elo đối xứng, bỏ rò `password` (DTO `PlayerPublicDto`) | `service/GameSessionService.java` (mới), `WebSocketController.java`, `dto/*` |
| P3 | Đồng hồ 10 phút + scheduler hết giờ + FE hiển thị | `GameSessionService`, `game-board/page.tsx` |
| P4 | Snapshot/rejoin: API active-match, xử lý disconnect/reconnect 60s, `game-board` tải từ server, danh sách online hiện `IN_GAME` | `PlayerController`, `WebSocketController`, `use-game-state.ts`, `websocket-context.tsx` |
| P5 | Lớp thông báo thống nhất + mã lỗi lời mời + dọn kết nối WS | `NotificationProvider.tsx`, `websocket-context.tsx`, `ChallengeService.java` |
| P6 | Overlay kết quả + hiệu ứng thắng + xác nhận rời trận | `game-board/page.tsx`, component mới `components/game-result-overlay.tsx`, `leave-confirm-dialog.tsx` |
| P7 | Dọn: xóa `localStorage` sau trận, gom `API_BASE_URL`, bớt log | nhiều file FE |

Thứ tự bắt buộc: P1 → P2 → (P3, P4 song song) → P5 → P6 → P7. FE `use-board-logic.ts` cần lọc nước tự chiếu để khớp server (hoặc FE hiển thị nước đi theo danh sách `legalMoves` server gửi kèm snapshot — đề xuất cách này để khỏi nhân đôi luật).

## 5. Tiêu chí hoàn thành (kiểm thử tay + tự động)

1. Hai trình duyệt: mời → chấp nhận → vào trận; mời khi đối phương offline/bận/chính mình → thấy thông báo tiếng Việt rõ ràng; hết hạn 8s → cả hai thấy "hết hạn".
2. Đi nước làm tướng mình bị chiếu hoặc hai tướng đối mặt → bị từ chối kèm thông báo; gửi nước sai lượt/sai người qua console → server bỏ qua và báo lỗi.
3. Dựng thế cờ chiếu bí (qua unit test `XiangqiRules` và 1 ván thật) → trận kết thúc với lý do "Chiếu bí"; thế hết nước đi → bên hết nước thua.
4. Đồng hồ giảm đúng bên đang đi, đồng bộ giữa hai máy (sai lệch < 1s); hết 10 phút → thua "Hết giờ".
5. Reload giữa trận, đóng tab rồi mở lại trong 60s → vào lại đúng thế cờ, đúng lượt, đúng giờ; đối thủ thấy "mất kết nối"/"đã kết nối lại"; quá 60s → thua "bỏ trận".
6. Kết thúc trận: overlay thắng/thua/hòa hiện, không tự chuyển trang; Elo của người thắng +x và người thua −x (đối xứng); `wins/loses/draws/totalMatches` và bảng `player_match` đúng cho cả đầu hàng/hòa/hết giờ; gọi `finishGame` hai lần không cộng Elo hai lần.
7. Nhấn `<`, Back, đóng tab giữa trận → có hộp xác nhận; chọn ở lại thì tiếp tục; đồng ý thì thua và rời.
8. `END_GAME`/snapshot **không** chứa `password`.
9. `./mvnw test` xanh; `npm run build` (fe) không lỗi TypeScript mới.

## 6. Ràng buộc cho người code

- Làm đúng phạm vi; không refactor chế độ AI/giải đấu; không đổi tên/route hiện có (`/game-board`, `/api/...`, các destination `/app/...` đang dùng) trừ khi nêu trong brief.
- Giữ code đồng bộ phong cách hiện có (comment tiếng Việt ngắn, tên tiếng Anh).
- Không thêm thư viện nặng; thư viện mới phải ghi rõ phiên bản.
- Mỗi pha một commit riêng, message nêu pha (P1…P7). Không commit `node_modules`, `.next`, `target`.
- Không thêm secrets; không đổi `application.properties` (cấu hình DB đi qua biến môi trường).
- Nếu gặp điểm mơ hồ trong brief: chọn phương án đơn giản nhất, ghi vào `docs/plans/…-notes.md`, không tự mở rộng phạm vi.
