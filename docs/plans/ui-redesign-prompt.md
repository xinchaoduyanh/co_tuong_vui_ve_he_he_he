# Prompt: thiết kế lại toàn bộ UI "Cờ Tướng Vui Vẻ" (đưa cho Gemini)

Cách dùng: làm theo 2 bước.
1. Dùng mục **Phụ lục A** để agy/Gemini gen ảnh mockup tham chiếu cho từng màn hình, và **Phụ lục B** để gen asset.
2. Đưa Gemini Flash: toàn bộ file này + các ảnh mockup đã gen + repo. Yêu cầu nó làm theo từng pha ở mục 8, mỗi pha một commit.

Nguồn phương pháp: [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill), cụ thể `redesign-skill` (quét, chẩn đoán, sửa trong stack có sẵn) và `imagegen-frontend-web` (gen ảnh mockup từng phần rồi code theo ảnh).
Lưu ý: bản `taste-skill` chính ghi rõ dành cho landing page, không dành cho màn hình app. Vì vậy các luật cấm của nó (không gradient, không bóng đổ, không đường kẻ) chỉ áp cho phần "chrome" (nút, thẻ, menu). Bàn cờ và quân cờ là vật thể thật nên được phép có chất liệu, bóng, vân gỗ.

---

## 0. Vai trò và mục tiêu

Bạn là design engineer. Viết lại toàn bộ giao diện của web game cờ tướng online (Next.js 15, React 19, Tailwind 3.4, shadcn/ui, lucide-react) cho đẹp, có cá tính, đọc nhanh, dùng tốt trên điện thoại. **Chỉ đổi phần trình bày** (JSX, className, CSS, font, token, asset). Không đổi logic.

Hiện trạng cần bỏ: giao diện nền kem vàng generic, thẻ trắng bo góc giống nhau, nút cam đều tăm tắp, Inter mặc định, bàn cờ phẳng màu be với quân tròn đỏ/đen trông như sticker, trang chủ là một cột nút cam.

## 1. Ràng buộc cứng (vi phạm là sai)

- Giữ nguyên stack. Không thêm framework. Thêm thư viện mới chỉ khi thật cần, ghi rõ phiên bản và kiểm tra `package.json` trước.
- **Chỉ được sửa:** `app/**/page.tsx` (chỉ phần JSX/className), `app/layout.tsx` (font, provider giữ nguyên), `app/globals.css`, `tailwind.config.ts`, `components/**`, `components/ui/**`, `public/**`.
- **Không được sửa:** `lib/**`, `hooks/**`, `middleware.ts`, toàn bộ `be/**`. Không đổi tên hay chữ ký của hook, props, hàm xử lý sự kiện, destination WebSocket, đường dẫn route, `href`.
- Giữ nguyên mọi chữ tiếng Việt hiện có (có thể sửa cho gọn hơn nhưng không đổi nghĩa). Mọi chuỗi mới viết bằng tiếng Việt.
- Giữ nguyên các thuộc tính truy cập đã có: `role="alertdialog"`, `role="alert"`, `aria-label` ("Rời trận", "Tắt âm thanh", "Bật âm thanh").
- Giữ các class hiệu ứng `xq-slide`, `xq-lastmove`, `xq-fx` và component `BoardEffectsStyles`, `CaptureBurst` (được phép chỉnh giao diện bên trong, không đổi cách gọi).
- Sau mỗi pha phải chạy `cd fe && npx tsc --noEmit` và `npm run build`; cả hai phải xanh.
- Không động tới chế độ AI về logic (`ai-game-board`, `use-ai-game`) và giải đấu về logic. Chỉ áp lớp giao diện chung cho chúng ở pha cuối.
- Tailwind là v3.4 (`darkMode: ["class"]`, token shadcn dạng biến HSL trong `app/globals.css`). Giữ cách này, đừng chuyển sang v4.

## 2. Hướng thiết kế (đã quyết, đừng đổi)

**Ý tưởng:** phòng chơi cờ ban đêm. Giao diện là mặt sơn mài tối, bàn cờ gỗ sáng là vật phát sáng duy nhất trên màn hình. Mọi thứ khác lùi lại để bàn cờ nổi.

**Một nền, một mực, một màu nhấn.** Màu nhấn duy nhất là đỏ chu sa (朱砂), dùng cho nút hành động chính, bên đỏ và trạng thái chiếu. Các màu ngữ nghĩa (xanh ngọc thành công, hổ phách cảnh báo) là màu trạng thái, không phải màu nhấn.

Chế độ tối là mặc định (`class="dark"` trên `<html>`, giữ `next-themes`). Làm đủ cả chế độ sáng, không được chỉ đảo màu.

### Token màu (đổi sang HSL dạng `H S% L%` để khớp token shadcn)

| Token | Tối (mặc định) | Sáng |
|---|---|---|
| background | `#0F1412` mực xanh đen | `#EDEFE8` giấy dó lạnh |
| card / surface-1 | `#161D1A` | `#F7F8F3` |
| surface-2 (muted) | `#1E2824` | `#E3E6DD` |
| border | `#2A3631` | `#D2D6CB` |
| foreground | `#ECE6D6` trắng ngà | `#141A17` |
| muted-foreground | `#9AA59D` | `#58635C` |
| primary / ring (chu sa) | `#D8432E` | `#C23A26` |
| primary-foreground | `#FFF6F0` | `#FFF6F0` |
| success (xanh ngọc) | `#3FA37F` | `#2B7F61` |
| warning (hổ phách) | `#D9A33A` | `#9A6B12` |

Quy tắc: một họ xám duy nhất (xanh-xám, ngả lục). Không pha xám ấm với xám lạnh. Không dùng `#000` hay `#fff` thuần. Màu nhấn dưới 80% độ bão hòa. Bóng đổ của chrome ngả theo màu nền, không dùng đen mờ. Kiểm tra tương phản chữ >= 4.5:1 ở cả hai theme.

### Màu của bàn cờ (giống nhau ở cả hai theme, vì là vật thể)

- Mặt bàn gỗ hoàng dương: `#D9B87A` với vân gỗ; vùng sông (hà): `#CDBB93`, hơi lạnh hơn.
- Viền khung gỗ óc chó sẫm: `#4B3220`, có lớp sơn bóng nhẹ.
- Đường kẻ: `#4A3220`, nét 0.04 đơn vị, góc ô và dấu pháo/tốt vẽ bằng nét đứt gọn.
- Chữ sông "楚河 漢界" viết bằng nét cọ, mờ nhẹ, đặt giữa dải sông.
- Quân cờ **kiểu truyền thống**: cả hai bên đều là đĩa gỗ tiện sáng màu, phân biệt bằng màu chữ khắc: đỏ chu sa `#C0281B` cho bên đỏ, mực đen `#1B1B1B` cho bên đen. Đĩa: gradient tròn `#F2DDA8` → `#D2A964`, viền `#8A5E2E`, một vòng khắc nhỏ bên trong, chữ khắc có viền sáng phía dưới để tạo cảm giác chạm khắc, bóng đổ mềm ngả nâu.
- Điểm gợi ý nước đi: chấm ngọc (success) bán trong suốt; ô có thể ăn: vòng chu sa đứt nét. Nước đi gần nhất: hai ô vàng nhạt (đã có `xq-lastmove`, chỉnh màu cho hợp).

## 3. Chữ

Tối đa hai họ chữ cho giao diện, thêm một họ chỉ dùng cho chữ Hán trên quân cờ. Tất cả phải hỗ trợ tiếng Việt đầy đủ dấu. Nạp bằng `next/font/google` trong `app/layout.tsx`, bỏ `Inter`.

- **Hiển thị / thương hiệu:** `Fraunces` (weight 600-700, dùng cho wordmark "Cờ Tướng", tiêu đề màn hình, chữ kết quả "Bạn thắng!"). Chữ lớn, tracking -0.02em, line-height 1.0-1.1.
- **Giao diện:** `Be Vietnam Pro` (400/500/600). Số liệu, đồng hồ, Elo dùng `font-variant-numeric: tabular-nums`. Không dùng monospace trừ khi là dữ liệu dạng bảng.
- **Chữ Hán trên quân:** `Noto Serif TC` weight 700, chỉ dùng trong SVG quân cờ và chữ sông. Đặt `preload: false` vì file CJK lớn, có fallback `serif`.
- Thang chữ tối đa 5 cỡ. Đoạn văn tối đa ~65 ký tự mỗi dòng. Tiêu đề dùng `text-wrap: balance`. Nhãn nhỏ dùng sentence case, không viết hoa toàn bộ.

## 4. Thành phần dùng chung (làm trước, dùng ở mọi nơi)

- **Nút:** phẳng, một màu nền, góc bo `6px` (quyết định một lần, dùng cho cả dự án). Ba mức: chính (nền chu sa), phụ (viền `border`, nền trong), nhẹ (chỉ chữ). Có hover (đổi nền nhẹ), nhấn (`scale(.98)`), `focus-visible` rõ ràng bằng vòng `ring`, trạng thái `disabled`. Không dùng cặp "đặc + viền" ở mọi nơi; ưu tiên một nút chính mỗi vùng.
- **Thẻ:** bỏ kiểu "viền + bóng + nền trắng". Dùng chênh tông nền (`card` so với `background`) và khoảng cách. Chỉ nâng khối bằng bóng ở những thứ nổi thật (hộp thoại, thông báo).
- **Avatar:** hình vuông bo góc 10px (squircle) thay cho hình tròn, nền theo chữ cái đầu, màu lấy từ hash của tên trong bảng 6 màu trầm thuộc họ palette.
- **Huy hiệu / trạng thái:** không dùng pill. Dùng chấm màu + chữ ("Đang chơi", "Online").
- **Biểu tượng:** giữ `lucide-react`, đồng bộ `strokeWidth={1.75}` và cỡ 18-20px. Thêm favicon theo thương hiệu (quân "帥" trong đĩa gỗ, vẽ SVG).
- **Trạng thái:** skeleton đúng hình dáng thay cho spinner; trạng thái rỗng có lời nhắn và nút hành động; lỗi hiển thị ngay tại chỗ (không dùng `alert`).
- **Z-index:** khai báo thang trong `tailwind.config.ts` (`header 40`, `banner 960`, `dialog 950`, `overlay 900`, `toast 1000`), bỏ các giá trị rời rạc.
- **Thông báo (`NotificationProvider`):** viết lại giao diện thẻ: nền `card`, viền trái 3px theo mức độ, chữ rõ, nút hành động dạng liên kết. Lời mời thách đấu là thẻ nổi bật hơn, có thanh đếm lùi chạy bằng `transform: scaleX` (chỉ hiển thị, không đổi logic).
- **Hộp thoại:** `LeaveConfirmDialog`, hộp đầu hàng, hộp cầu hòa: cùng một kiểu (nền `card`, tiêu đề Fraunces, hai nút). Thay các `div` tự viết trong trang bàn cờ bằng cùng component.
- **Thanh vào lại trận (`RejoinBanner`):** thanh mỏng cố định phía trên, nền chu sa, chữ trắng ngà, nút "Vào lại trận" kiểu nút phụ trên nền chu sa.
- **Chỉ báo "Đang kết nối lại…":** thanh nhỏ phía dưới, nền hổ phách trầm.

## 5. Màn hình bàn cờ (`app/game-board/page.tsx`): trọng tâm của dự án

Ưu tiên cao nhất. Làm điện thoại trước (360-430px), sau đó mở rộng.

**Điện thoại (một cột, không cuộn ngang, vừa trong `100dvh` khi có thể):**
1. Thanh trên: nút quay lại (icon), wordmark nhỏ, nút âm thanh (icon). Bỏ nút "Chơi với AI", "Đầu hàng", "Cầu hòa" khỏi đầu trang.
2. Khung người chơi đối thủ (trên): avatar squircle, tên, Elo, dấu "đang đến lượt" (chấm chu sa nhấp nháy nhẹ), đồng hồ lớn bên phải.
3. Bàn cờ: chiếm toàn bộ chiều ngang trừ lề 8px, tỉ lệ 9:10 giữ nguyên, khung gỗ óc chó mỏng.
4. Khung người chơi của mình (dưới): cùng cấu trúc.
5. Thanh hành động cố định đáy (có `env(safe-area-inset-bottom)`): "Cầu hòa", "Đầu hàng" là nút phụ có icon + nhãn; "Chơi với AI" chuyển vào menu "..." (vẫn đi qua `requestLeave`). Mọi mục tiêu chạm >= 44x44px.

**Máy tính (>= 1024px):** bố cục hai cột lệch: bàn cờ bên trái (cao tối đa `100dvh - 48px`), cột phải rộng ~340px gồm: khung đối thủ, nước đi gần nhất (`moveDescription`), cảnh báo chiếu, khung mình, các nút hành động.

**Đồng hồ:** chữ số lớn (28-32px), `tabular-nums`, nền khung tối; bên đang đi có viền chu sa; dưới 60s chữ chu sa; dưới 10s nhấp nháy (đã có logic `clockClass`, chỉ đổi giao diện).

**Banner "Chiếu tướng!":** dải chu sa đặt đè lên mép trên bàn cờ (không đẩy bố cục), chữ Fraunces. Giữ viền đỏ nhấp nháy quanh tướng bị chiếu.

**Dòng "Lượt của bạn / Chờ đối thủ":** hiện trong khung người chơi, không vẽ chữ lớn xanh lá trên dải sông như hiện tại. Dải sông chỉ có chữ "楚河 漢界".

**Overlay kết quả (`GameResultOverlay`):** thiết kế lại theo kiểu "tờ kết quả": tiêu đề Fraunces rất lớn ("Bạn thắng!", "Bạn thua", "Hòa cờ"), dòng lý do, hai cột Elo (tên, điểm cũ → mới, biến thiên có màu ngọc/chu sa), hai nút "Xem lịch sử" (phụ) và "Về trang chủ" (chính). Pháo giấy chỉ khi thắng, dùng đúng palette (chu sa, vàng gỗ, ngọc, ngà), tôn trọng `prefers-reduced-motion`.

**Hiệu ứng nước đi/ăn quân:** giữ logic hiện có. Làm đẹp lại: màu mảnh vỡ lấy từ palette, thêm vệt bụi gỗ nhỏ khi quân hạ xuống, nếu có `public/fx/capture-burst.png` thì dùng làm lớp nền cho vòng sóng.

## 6. Các màn hình còn lại

- **`app/login`, `app/register`:** bố cục hai phần trên máy tính (trái: tên thương hiệu cỡ lớn + một cảnh bàn cờ cắt cận; phải: form), một cột trên điện thoại. Form có nhãn thật, lỗi hiện ngay dưới ô nhập, nút chính rộng đủ. Không thẻ trắng bo tròn giữa màn hình.
- **`app/page.tsx` (trang chủ):** bỏ cột nút cam. Dải hồ sơ: avatar, tên, Elo cỡ lớn (Fraunces), thắng/thua/hòa dạng số căn cột. Một hành động chính lớn "Thách đấu" (hoặc "Vào lại trận đang chơi" khi còn trận dở, giữ logic `activeMatch`), các mục còn lại (Chơi với máy, Lịch sử đấu, Bảng xếp hạng, Thoát) là danh sách dòng phẳng có icon và mũi tên, không phải nút to. Bố cục lệch trái trên máy tính.
- **`app/thach-dau` và `thach-dau/online-players`:** danh sách người chơi online dạng dòng phẳng: avatar, tên, Elo, chấm trạng thái ("Online", "Đang chơi"), nút "Thách đấu" bên phải; khi đang chờ hiện "Đang chờ…" và nút "Huỷ"; khi mình có trận dở hiện thanh cảnh báo và khóa nút. Trạng thái rỗng: "Chưa có ai online" kèm gợi ý.
- **`app/lich-su-dau`:** danh sách dòng: kết quả (Thắng/Thua/Hòa) bằng màu + chữ, tên đối thủ, Elo đối thủ, biến thiên Elo căn phải `tabular-nums`. Tab "Gần đây / Đối thủ rank cao" dạng tab gạch chân. Skeleton khi tải.
- **`app/bang-xep-hang`:** bảng xếp hạng: hạng 1-3 nhấn mạnh bằng cỡ chữ và màu vàng gỗ (không dùng huy chương emoji), cột Elo / tỉ lệ thắng căn phải, dòng của người đang đăng nhập được tô nhẹ. Tab sắp xếp dạng tab gạch chân.
- **`app/giai-dau`, `app/tournament-game`:** chỉ áp token, font, nút, thẻ, thông báo chung. Không đổi bố cục logic.
- **`app/ai-game-board`:** dùng lại cùng bàn cờ và quân cờ mới (tách thành component `components/board/*` dùng chung nếu làm được mà không đụng logic). Nếu tách làm đổi logic thì bỏ qua và chỉ áp token.
- **Trang 404 và lỗi:** thêm `app/not-found.tsx` có thương hiệu, nút về trang chủ.

## 7. Chuyển động

- Chỉ animate `transform` và `opacity`. Thời lượng 150-300ms, easing `cubic-bezier(0.22, 0.8, 0.3, 1)`.
- Vào trang: các khối xuất hiện lần lượt (cách nhau 60-80ms, dịch 12-20px, hiện dần), nội dung vẫn thấy được nếu JS lỗi.
- Hover/nhấn/focus cho mọi control. Danh sách đổi thứ tự không nhảy.
- Một khoảnh khắc "ký hiệu": quân hạ xuống bàn (đã có), không thêm hiệu ứng rải rác khác.
- `@media (prefers-reduced-motion: reduce)`: tắt trượt, pháo giấy, nhấp nháy; giữ nội dung.

## 8. Thứ tự làm và commit (mỗi pha một commit, dạng `UI-<số>: <nội dung>`)

1. **UI-1 Nền tảng:** token màu (sáng/tối) trong `globals.css`, font trong `layout.tsx`, thang z-index, bỏ import PrimeReact CSS nếu không còn component PrimeReact nào được dùng (kiểm tra `grep -r primereact`).
2. **UI-2 Thành phần dùng chung:** nút, thẻ, avatar, tab, hộp thoại, thông báo, thanh vào lại trận, skeleton, trạng thái rỗng.
3. **UI-3 Bàn cờ và quân cờ:** component `components/board/*` (mặt bàn gỗ, đường kẻ, dải sông, quân đĩa gỗ, chấm gợi ý), vẽ bằng SVG. Có thể dùng `public/fx/board-wood.jpg` làm vân gỗ nếu có, không có thì dùng `feTurbulence`.
4. **UI-4 Màn hình bàn cờ:** bố cục điện thoại + máy tính, khung người chơi, đồng hồ, thanh hành động, overlay kết quả.
5. **UI-5 Trang chủ, đăng nhập, đăng ký, thách đấu, online.**
6. **UI-6 Lịch sử, bảng xếp hạng, giải đấu, AI, 404.**
7. **UI-7 Rà soát:** chạy ở 390px, 768px, 1440px (cả sáng và tối), sửa tràn ngang, chữ bị cắt, tương phản thấp, thiếu focus, thiếu trạng thái rỗng/lỗi/tải.

*(Tùy chọn, chỉ làm khi được yêu cầu: lật bàn cờ để quân của mình luôn ở dưới. Đây là thay đổi toạ độ nên cần kiểm tra kỹ phần chọn quân và nước đi.)*

## 9. Tiêu chí hoàn thành

- `npx tsc --noEmit` và `npm run build` xanh. Không có lỗi console mới.
- Không còn `Inter`, không còn nền kem vàng, không còn nút cam đồng loạt, không còn thẻ trắng bo tròn đồng loạt, không còn `z-[9999]`.
- Ở 390px: không cuộn ngang ở mọi màn hình; bàn cờ nhìn đủ không cần cuộn; nút chạm >= 44px.
- Cả hai theme đều đúng palette; tương phản chữ >= 4.5:1.
- Mọi control có hover, nhấn, focus-visible, disabled. Mọi danh sách có skeleton và trạng thái rỗng.
- Chức năng cũ vẫn chạy: mời, chấp nhận, đi quân, ăn quân, chiếu, đồng hồ, đầu hàng, cầu hòa, rời trận có hỏi xác nhận, vào lại trận, overlay kết quả.
- Cuối cùng báo cáo: pha nào xong, màn hình nào chỉ áp token, mục nào chưa kiểm ở trình duyệt.

## 10. Chuyện cấm (rút từ taste-skill)

Không dùng: gradient tím-xanh, quả cầu mờ trang trí, emoji làm biểu tượng, số thứ tự trang trí (01, 02), nhãn nhỏ viết hoa giãn chữ, pill "New/Beta", thẻ có icon trên đầu xếp hàng đều nhau, hiệu ứng kính mờ, ba thẻ bằng nhau xếp hàng, văn bản kiểu "Oops!", dấu chấm than trong thông báo thành công, từ sáo ("Seamless", "Elevate"…). Nội dung phải là thật (tên, Elo, số liệu thật từ dữ liệu), không dùng "John Doe".

---

## Phụ lục A: prompt gen ảnh mockup tham chiếu (cho agy / Gemini ảnh)

Gen **mỗi màn hình một ảnh riêng**, không ghép nhiều màn hình vào một khung. Điện thoại: 9:19.5. Máy tính: 16:10. Dán phần "Phong cách chung" vào đầu mọi prompt.

**Phong cách chung:** "High-fidelity UI mockup for a Vietnamese xiangqi (Chinese chess) web game, dark lacquer interface, ink-green black background (#0F1412), bone-white text (#ECE6D6), single cinnabar red accent (#D8432E), flat surfaces separated by tone not borders, serif display headings (Fraunces style), clean geometric sans body (Be Vietnam Pro style), square-ish 6px corners, squircle avatars, no gradients on UI chrome, no purple, no emoji, no glassmorphism, Vietnamese text with correct diacritics. The only glowing object is the wooden board. Realistic copy and numbers."

1. `ref-board-mobile`: "Phone screen, in-game view. Top bar with back arrow, small wordmark 'Cờ Tướng', speaker icon. Opponent panel (squircle avatar 'p2', name 'player2', Elo 1248, small cinnabar dot meaning their turn, large clock 09:52). Full-width xiangqi board: boxwood surface with visible wood grain, dark walnut frame, thin ink lines, river labeled 楚河 漢界 in brush strokes, 9x10 grid with palace diagonals. Pieces are turned wooden discs of pale boxwood with engraved characters: red cinnabar characters for red side, black ink for black side, soft brown drop shadows, a pawn mid-slide with a faint motion trail. Last move marked by two soft gold squares. Own panel below (player1, Elo 1250, clock 09:45). Fixed bottom action bar with 'Cầu hòa' and 'Đầu hàng' buttons with icons and labels."
2. `ref-board-desktop`: "Desktop 1440px. Board on the left filling the height, right column 340px with opponent panel, last move text, a cinnabar banner 'Chiếu tướng!', own panel, action buttons. Same style."
3. `ref-board-capture`: "Close-up of the board at the moment of capture: shockwave ring, shards of wood, the captured disc spinning and fading, floating 'Ăn!' label."
4. `ref-result-win` và `ref-result-lose`: "Result sheet over a dimmed board. Huge serif 'Bạn thắng!', reason 'Lý do: Chiếu bí', two Elo columns 1250 → 1271 (+21) and 1269 → 1248 (-21), buttons 'Xem lịch sử' and 'Về trang chủ', cinnabar and gold wood confetti."
5. `ref-home`: "Home screen, left-aligned. Profile strip: squircle avatar, name 'player1', huge Elo '1229', stats 'Thắng 2 · Thua 4 · Hòa 0' with tabular numerals. One large primary action 'Thách đấu' in cinnabar, then flat list rows with icons: Chơi với máy, Lịch sử đấu, Bảng xếp hạng, Thoát."
6. `ref-lobby`: "Online players list, flat rows: avatar, name, Elo, status dot (Online / Đang chơi), 'Thách đấu' button; one row in pending state with 'Đang chờ…' and 'Huỷ'; a challenge invitation card in the top right with a countdown bar."
7. `ref-history` và `ref-leaderboard`: "History list with Thắng/Thua/Hòa rows and right-aligned Elo deltas; leaderboard with top 3 emphasized by type size and wood-gold color, current user row tinted."
8. `ref-login`: "Login screen: left half large wordmark and cropped board scene, right half form with real labels, inline error, primary cinnabar button."

Mỗi ảnh nhớ gen thêm bản sáng (theme light: nền giấy dó #EDEFE8, chữ #141A17, cùng màu chu sa #C23A26) cho `ref-board-mobile` và `ref-home`.

## Phụ lục B: asset cần gen (thả vào `fe/public/fx/`)

| File | Kích thước | Prompt |
|---|---|---|
| `board-wood.jpg` | 1600x1800, liền mạch | "Top-down photograph of aged boxwood board surface, fine natural grain, warm honey tone #D9B87A, subtle lacquer sheen, even lighting, no lines, no text, seamless" |
| `frame-walnut.jpg` | 1600x400, liền mạch | "Dark walnut wood grain strip, lacquered, #4B3220, even lighting, seamless" |
| `capture-burst.png` | 512x512, nền trong suốt | "Game VFX sprite, ink-brush splash with golden wood splinters bursting outward, centered, transparent background, no text" |
| `grain.png` | 256x256, liền mạch | "Subtle monochrome film grain noise tile, transparent background, very low contrast" |

Nếu agy không gen được ảnh nào thì bỏ qua, code phải rơi về SVG/CSS (không được lỗi 404 hiện ra trong giao diện).
