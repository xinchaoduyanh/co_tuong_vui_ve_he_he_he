# Ghi chú triển khai: cải thiện chế độ online người-người

Brief: `261016-1450-online-match-improvements.md`. File này ghi các điểm mơ hồ và cách đã chọn.

## P1 — XiangqiRules
- Số nước mở đầu của đỏ là 44 (khớp số lý thuyết), được kiểm bằng test.
- Kiểu nước đi là `XiangqiRules.Move` (record lồng), không dùng `model.Move` vì đó là entity JPA.
- Quy ước ký tự: chữ thường = đỏ (`r`, phía trên y nhỏ), chữ hoa = đen (`b`), giống BoardChecker và initial board hiện có.

## P2 — GameSessionService, move phía server, finishGame
- **Trận AI (player2 = `da1` hoặc `isAIGame`) giữ luồng cũ** trong `handleAIMove`, vì brief yêu cầu không đụng chế độ AI. Phần nước đi người chơi gửi lên không được kiểm tra bằng luật mới trong trận AI.
- Đầu hàng và cầu hòa dùng chung `finishGame` cho cả hai loại trận. Ở trận AI, đầu hàng sẽ cập nhật thống kê và Elo theo luồng mới thay vì luồng cũ. Nếu muốn giữ nguyên hành vi AI thì cần tách thêm.
- `calculateEloChange` (chỗ tính Elo lệch) vẫn còn, chỉ được dùng bởi luồng AI. Elo người-người đã đi qua `GameSessionService.eloDelta` (đối xứng).
- Phân tích `Player.password` trong brief: field đã có `@JsonIgnore`, nên JSON không lộ mật khẩu. DTO `PlayerPublicDto` vẫn được dùng cho END_GAME của người-người để không phụ thuộc annotation.
- FE không đổi ở P2: FE vẫn gửi `fromX/fromY/toX/toY` cùng các trường khác, BE bỏ qua `boardState` của client. Lỗi nước đi được gửi đến `/user/queue/game.error` nhưng FE chưa đăng ký kênh này (sẽ làm ở P5).
- Endpoint `/match.{matchId}.end` không được FE gọi, và chưa đổi ở P2. Endpoint này có thể đưa người chơi về ONLINE mà không qua `finishGame`; cần xử lý khi dọn ở P7 hoặc P5.

## P3 — đồng hồ 10 phút
- Đồng hồ nằm trên server (`GameSession`). Chỉ bên đang đi bị trừ giờ; hết giờ thì thua (`TIMEOUT`), kiểm tra mỗi giây.
- Phát `/topic/match.{id}.clock` mỗi 5 giây; FE chỉ đếm lùi cục bộ để hiển thị.
- **Thay đổi schema:** bảng `move` có thêm cột `red_time_ms`, `black_time_ms` (nullable). `ddl-auto=update` sẽ tự thêm khi khởi động trên DB nào, kể cả Neon trong `application.properties`.
- Hạn chế: khi server khởi động lại, đồng hồ tiếp tục từ giá trị đã lưu ở nước đi cuối; thời gian server tắt không bị trừ.

## P4 — vào lại trận, mất kết nối
- Trận đang chơi = chưa kết thúc, không phải AI/giải đấu, tạo trong **30 phút** gần nhất. Ván thực tế không quá khoảng 20 phút đồng hồ (mỗi bên 10 phút, chỉ bên đi bị trừ), nên 30 phút là cận an toàn. Cửa sổ 2 giờ ban đầu làm người chơi bị đưa về một trận bỏ dở từ bản cũ.
- Phiên cũ đóng sau khi tải lại trang không xóa nhầm phiên mới (`removeOnlinePlayerBySessionId` chỉ xóa khi đúng phiên hiện tại).
- Mất kết nối: báo đối thủ qua `/topic/match.{id}.presence`; quá 60 giây thì `ABANDON`.
- Chưa làm: lời mời hòa đang chờ không được lưu trạng thái (vẫn là relay như cũ).

## P5 — thông báo, lời mời
- Kênh cá nhân dùng `/user/{username}/queue/...`. Kênh `/user/queue/...` không nhận tin trên máy chủ này (đã phát hiện khi chạy thử).
- Thêm `/app/challenge.cancel`. Chấp nhận lời mời đã hết hạn trả `CHALLENGE_ERROR` với mã `CHALLENGE_EXPIRED`.
- Lời mời có một người gửi đi tại một thời điểm; mời lần hai trả `ALREADY_PENDING`.
- Không đổi: mã `TARGET_BUSY` và `CHALLENGER_BUSY` đã có trong code nhưng chỉ kiểm chứng bằng unit test (cần người thứ ba để chạy thử).

## P6 — kết quả, xác nhận rời
- Overlay không tự chuyển trang. Pháo giấy bằng CSS thuần (không thêm thư viện).
- Rời trận (nút `<`, "Chơi với AI", Back, đóng tab) hỏi xác nhận; "Đồng ý rời" mới gửi đầu hàng. Trận đã kết thúc thì rời không hỏi.

## P7 — dọn
- `API_BASE_URL` và `WS_BASE_URL` tập trung tại `lib/api/config.ts`.
- Xóa bản sao trạng thái trận trong localStorage khi trận kết thúc.
- `PlayerPublicDto` không có `email` (FE không dùng).
- Log BE: chỉ bớt trong code mới; phần log `[BE-xx]` cũ còn nguyên, chưa dọn.

## Kiểm chứng đã làm
- `./mvnw test`: 38 test xanh (luật cờ, GameSessionService, ChallengeService, PlayerService, DTO, context Spring).
- `npm run build` (fe) xanh; `tsc --noEmit` không lỗi.
- End-to-end qua STOMP với BE thật (script ở scratchpad, không commit): mời/hủy/từ chối/hết hạn, nước sai lượt và sai quân, nước hợp lệ có đồng hồ, mất kết nối và kết nối lại, đầu hàng (Elo đối xứng +20/−20, không lộ password/email), bỏ trận sau 60 giây (ABANDON). DB khớp: `player_match` WIN/LOSE đúng, thống kê người chơi đúng.
- Trình duyệt (FE dev server, BE thật): nhận lời mời và chấp nhận; bàn cờ tải từ snapshot; đồng hồ đúng bên; hộp xác nhận rời trận (Ở lại, Back, Đồng ý rời); overlay "Bạn thắng!" với pháo giấy; "Về trang chủ" không hỏi; reload giữa trận được đưa về đúng thế cờ và đúng lượt; đi quân trên giao diện được server nhận.

## Chưa kiểm chứng trực tiếp
- Chiếu bí / hết nước trong ván thật: chỉ có unit test (`XiangqiRulesTest`, `GameSessionServiceTest.checkmateEndsGameAndRedWins`).
- Hết giờ 10 phút trong ván thật: chỉ unit test (cần 10 phút chờ).
- Đồng bộ đồng hồ giữa hai máy trong vòng 1 giây: chưa đo.
- Đóng tab giữa trận (hộp `beforeunload` mặc định của trình duyệt): chưa thử trên trình duyệt.
- Thông báo `game.error` khi đi nước sai trên giao diện: server đã xác nhận, nhưng chưa thử bấm nước sai trên UI.
- Hòa cờ được chấp nhận qua UI: có unit test, chưa thử trên UI.

## Còn lại (ngoài phạm vi đợt này)
- `/match.{id}.end` không được FE gọi, nhưng vẫn có thể đưa người chơi về ONLINE mà không qua `finishGame`. Nên xóa hoặc đổi thành `finishGame` ở đợt sau.
- `calculateEloChange` (bất đối xứng) vẫn được luồng AI dùng; chưa đổi vì AI nằm ngoài phạm vi.
- Trận AI: đầu hàng đi qua `finishGame` (thống kê và Elo cập nhật), khác với trước.
- FE chưa lọc nước tự chiếu/đối mặt tướng (`use-board-logic.ts`); server từ chối và báo lỗi. Có thể gửi danh sách `legalMoves` trong snapshot để FE khớp server.
- `docs/` đang untracked (gồm brief và file ghi chú này), chưa commit.
