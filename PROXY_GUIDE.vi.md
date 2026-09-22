# Hướng dẫn cài đặt Proxy — Microsoft Rewards Script

Tài liệu này dành cho người **chưa từng dùng proxy bao giờ**. Đọc từ trên xuống, làm đúng thứ tự là được.

---

## 1. Proxy là gì? (giải thích bằng ví dụ đời thường)

Hãy tưởng tượng bạn muốn gửi một lá thư nhưng **không muốn người nhận biết địa chỉ nhà bạn**.

- **Không có proxy:** bạn tự đi bộ đến nhà người nhận, họ thấy mặt bạn và biết bạn ở đâu.
- **Có proxy:** bạn đưa lá thư cho một người trung gian. Người đó đi giao thư. Người nhận chỉ thấy **địa chỉ của người trung gian**, không thấy bạn.

**Proxy chính là "người trung gian" đó.** Nó là một máy chủ trung gian nằm giữa máy tính của bạn và trang web Microsoft, giúp:

1. **Giấu địa chỉ IP thật của bạn** — Microsoft chỉ thấy IP của proxy.
2. **Tạo cảm giác mỗi tài khoản đến từ một nơi khác nhau** — thay vì 4 tài khoản cùng phát ra từ một IP nhà bạn.

### Vì sao điều này quan trọng với tool này?

Nếu bạn chạy 4 tài khoản Microsoft Rewards **từ cùng một IP nhà**, Microsoft thấy 4 tài khoản hoạt động chung một chỗ, cùng giờ, cùng kiểu — đó là dấu hiệu rất rõ của bot. **Proxy giúp mỗi tài khoản trông như một người riêng biệt ngồi ở một thành phố riêng.**

> ⚠️ **Nói thẳng:** proxy **giảm** nguy cơ bị khóa tài khoản, nhưng **không loại bỏ hoàn toàn**. Microsoft vẫn có thể phát hiện bot bằng nhiều cách khác. Đừng dùng proxy rồi nghĩ mình an toàn tuyệt đối.

---

## 2. Bạn có thật sự cần proxy không?

| Tình huống                               | Có cần proxy?                               |
| ---------------------------------------- | ------------------------------------------- |
| Chỉ chạy **1 tài khoản**                 | ❌ Không cần. IP nhà bạn là đủ tự nhiên.    |
| Chạy **2–3 tài khoản**, chấp nhận rủi ro | ⚠️ Nên có, nhưng chưa bắt buộc              |
| Chạy **4 tài khoản trở lên**             | ✅ **Rất nên có.** Mỗi tài khoản một proxy. |
| Tài khoản đã từng bị khóa/cảnh báo       | ✅ Nên có, kèm proxy **dân cư** (xem mục 3) |

**Nếu bạn chỉ có 1 tài khoản, hãy bỏ qua toàn bộ tài liệu này** — thêm proxy vào chỉ làm tool chạy chậm hơn và dễ lỗi hơn mà không được gì.

---

## 3. Chọn loại proxy nào?

Tool này hỗ trợ 4 loại, nhưng **thực tế bạn chỉ nên dùng 2 loại đầu**:

| Loại      | Ghi trong ô "Proxy address" | Dùng được mật khẩu? | Nên dùng?                           |
| --------- | --------------------------- | ------------------- | ----------------------------------- |
| **HTTP**  | `http://...`                | ✅ Có               | ✅ **Phổ biến nhất, chọn cái này**  |
| **HTTPS** | `https://...`               | ✅ Có               | ✅ Tốt, mã hóa đường truyền         |
| SOCKS4    | `socks4://...`              | ❌ **Không**        | ⚠ Chỉ khi proxy không cần đăng nhập |
| SOCKS5    | `socks5://...`              | ❌ **Không**        | ⚠ Chỉ khi proxy không cần đăng nhập |

### Vì sao SOCKS không dùng được mật khẩu?

Tool điều khiển trình duyệt bằng thư viện tên **Patchright**, và Patchright **không hỗ trợ proxy SOCKS có xác thực**. Nếu bạn nhập tài khoản/mật khẩu cho proxy SOCKS, Web UI sẽ **báo lỗi ngay** và không lưu:

```
SOCKS5 proxy authentication is not supported by Patchright
```

→ **Cách xử lý:** hoặc dùng proxy HTTP/HTTPS (có mật khẩu), hoặc dùng proxy SOCKS **không cần** đăng nhập. Đừng cố nhập mật khẩu cho SOCKS.

### Dân cư (residential) hay Trung tâm dữ liệu (datacenter)?

- **Datacenter** (giá rẻ, ví dụ $1–3/tháng): IP thuộc về trung tâm dữ liệu. Microsoft **biết rõ** dải IP này. Vẫn dùng được nhưng tỉ lệ bị nghi ngờ cao hơn.
- **Residential** (đắt hơn, $3–15/tháng): IP thật của hộ gia đình. Tự nhiên nhất, khó bị phát hiện nhất. **Đây là loại nên dùng nếu bạn nghiêm túc.**

### Mua ở đâu?

Bạn cần tự mua — tool không kèm proxy. Một số nhà cung cấp phổ biến:

- Webshare, IPRoyal, Smartproxy, Oxylabs, Bright Data

**Khi mua, bạn sẽ nhận được 4 thông tin** — hãy ghi lại đủ 4:

```
Địa chỉ (host):  proxy.provider.com     ← thứ này vào ô "Proxy address"
Cổng (port):     8080                    ← vào ô "Port"
Tên đăng nhập:   myuser123               ← vào ô "Username"
Mật khẩu:         aBcD1234xyz            ← vào ô "Password"
```

> 💡 **Mẹo tiết kiệm:** mua gói **nhiều proxy cùng lúc** (ví dụ 5 proxy). Thường nhà cung cấp bán theo gói, mua lẻ 1 cái thường đắt hơn nhiều.

### ⚠️ Phân biệt nơi BÁN proxy riêng và nơi cho DANH SÁCH proxy công cộng

Đây là chỗ rất nhiều người mua nhầm. Có **hai loại website hoàn toàn khác nhau**:

| Loại website                                    | Bạn nhận được gì                                     | Dùng cho tool này?      |
| ----------------------------------------------- | ---------------------------------------------------- | ----------------------- |
| **Nhà bán proxy riêng** (Webshare, IPRoyal...)  | 1 proxy **riêng của bạn**, có tài khoản/mật khẩu     | ✅ **Đúng thứ bạn cần** |
| **Danh sách proxy công cộng** (free proxy list) | Hàng nghìn địa chỉ IP dùng chung với **cả thế giới** | ❌ **Đừng dùng**        |

**Vì sao danh sách proxy công cộng không dùng được?**

1. **Ai cũng dùng được** — hàng nghìn người khác cũng đang dùng đúng cái IP đó. Microsoft thấy một IP có 500 người đăng nhập khác nhau thì đó là dấu hiệu xấu, không phải tốt.
2. **Tốc độ rất chậm và hay chết** — proxy công cộng thường chết sau vài giờ, thậm chí vài phút. Bạn sẽ phải thay liên tục.
3. **Không có tài khoản/mật khẩu** — nghĩa là bạn không kiểm soát được gì, và không biết ai đang đọc dữ liệu đi qua đó.
4. **Nhiều cái là mồi** — một số trang cố tình đăng proxy để thu thập dữ liệu người dùng. **Tuyệt đối không đăng nhập tài khoản Microsoft qua proxy công cộng không rõ nguồn.**

> 🚨 **Dấu hiệu nhận biết:** nếu trang web hiển thị một **bảng dài hàng nghìn dòng IP:port** và cho bạn bấm "Copy" miễn phí mà **không hỏi mật khẩu đăng nhập proxy** — đó là danh sách công cộng. Đừng dùng cho tài khoản Microsoft.
>
> Ngược lại, trang **bán** proxy sẽ cho bạn **một** địa chỉ duy nhất (hoặc một gói vài cái), kèm **username và password riêng của bạn**.

---

## 4. Cách nhập proxy vào Web UI (từng bước)

**Điều kiện:** Web UI đang chạy (xem `WEB_UI_GUIDE.vi.md` mục 3). Tool **KHÔNG được chạy** khi bạn đang sửa proxy.

### Bước 1 — Mở trình soạn proxy

Trong danh sách **Ready to Execute**, tìm dòng tài khoản bạn muốn gán proxy. Bấm nút **Proxy** trên dòng đó.

Khung **"Proxy for [email tài khoản]"** sẽ hiện ra ngay bên dưới. Tên tài khoản hiện ở tiêu đề để bạn chắc chắn mình đang sửa đúng người.

### Bước 2 — Điền thông tin

| Trường            | Điền gì                          | Ví dụ                       |
| ----------------- | -------------------------------- | --------------------------- |
| **Proxy address** | Địa chỉ proxy, **kèm `http://`** | `http://proxy.provider.com` |
| **Port**          | Cổng, số từ 1 đến 65535          | `8080`                      |
| **Username**      | Tên đăng nhập proxy (nếu có)     | `myuser123`                 |
| **Password**      | Mật khẩu proxy (nếu có)          | `aBcD1234xyz`               |

**Ba lưu ý quan trọng:**

1. **Phải có `http://` ở đầu.** Gõ `proxy.provider.com` không có `http://` thì tool tự hiểu là `http://` (vẫn chạy được), nhưng cứ gõ đầy đủ cho chắc.
2. **KHÔNG nhập tài khoản/mật khẩu vào ô Proxy address.** Viết `http://user:pass@proxy.com` là **sai** — Web UI sẽ báo lỗi. Tài khoản và mật khẩu phải nằm ở 2 ô riêng.
3. **Username và Password phải điền cùng nhau.** Có tên mà không có mật khẩu (hoặc ngược lại) sẽ bị từ chối.

### Bước 3 — Chọn công tắc "Use for API requests too"

Công tắc này quyết định proxy **che những gì**. Đọc kỹ mục 5 bên dưới rồi mới bật.

### Bước 4 — Bấm **Save Proxy**

- Thấy thông báo xanh (toast) **"Proxy saved"** = thành công.
- Dòng tài khoản sẽ hiện **huy hiệu xanh `host:port`** bên cạnh email → bạn biết tài khoản này đã có proxy.
- Thay đổi **chỉ áp dụng cho lần chạy tới**. Nếu tool đang chạy, bấm **Stop** rồi chạy lại.

### Xóa proxy (khi không cần nữa)

Mở lại khung, bấm **Remove Proxy** → xác nhận. Proxy của tài khoản đó bị xóa sạch.

Hoặc: xóa trắng ô **Proxy address** rồi bấm **Save Proxy** — kết quả giống hệt.

---

## 5. Công tắc "Use for API requests too" — quan trọng nhất

Đây là chỗ **hầu hết người mới hiểu sai**. Tool này liên lạc với Microsoft qua **2 đường riêng biệt**:

```
        ┌─────────────────────────────────────┐
        │        Máy tính của bạn             │
        └──────────┬──────────────┬───────────┘
                   │              │
        (1) Trình duyệt     (2) Gọi API trực tiếp
            (Edge)              (tính điểm, nhiệm vụ)
                   │              │
                   ▼              ▼
              ┌─────────┐   ┌─────────┐
              │ PROXY?  │   │ PROXY?  │  ← công tắc quyết định ở đây
              └────┬────┘   └────┬────┘
                   │              │
                   └──────┬───────┘
                          ▼
                   Microsoft Rewards
```

| Công tắc           | Trình duyệt (Edge) | Gọi API trực tiếp         |
| ------------------ | ------------------ | ------------------------- |
| **TẮT** (mặc định) | ✅ Đi qua proxy    | ❌ Đi thẳng từ IP nhà bạn |
| **BẬT**            | ✅ Đi qua proxy    | ✅ Đi qua proxy           |

### Vậy nên chọn cái nào?

**Khuyên dùng: TẮT** (để nguyên mặc định).

**Lý do:** Nhiều proxy (nhất là loại rẻ) **chặn hoặc làm hỏng** các request API. Khi bật công tắc này, tool hay gặp lỗi kiểu:

```
Failed to fetch dashboard data
Request timeout
403 Forbidden
```

Nếu bạn đang gặp mấy lỗi này sau khi bật proxy → **tắt công tắc đi và chạy lại**. Đây là nguyên nhân số 1.

**Khi nào nên BẬT?**

- Bạn dùng proxy **residential loại tốt**, đã kiểm tra chạy ổn với API.
- Bạn chạy **nhiều tài khoản** và muốn **che tuyệt đối** — không muốn bất kỳ request nào lộ IP nhà.
- Bạn đã bị Microsoft cảnh báo và muốn che chắn tối đa.

**Quy tắc thực tế:** Chạy thử với công tắc **TẮT** trước. Nếu mọi thứ suôn sẻ và bạn muốn an toàn hơn, hãy thử **BẬT** rồi quan sát log. Gặp lỗi thì tắt lại.

---

## 6. Nguyên tắc vàng: MỘT tài khoản = MỘT proxy

Đây là sai lầm phổ biến nhất và cũng là sai lầm **nguy hiểm nhất**.

| Cách làm                                  | Kết quả                                                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4 tài khoản dùng **4 proxy khác nhau**    | ✅ Đúng. Mỗi tài khoản như một người riêng.                                                                                                      |
| 4 tài khoản dùng **chung 1 proxy**        | ❌ **Vô nghĩa.** Microsoft vẫn thấy 4 tài khoản cùng một IP — y như không dùng proxy. Thậm chí tệ hơn, vì giờ nó là IP của proxy (dễ bị gắn cờ). |
| 3 tài khoản dùng proxy, 1 tài khoản không | ⚠ Tài khoản không proxy vẫn lộ IP nhà. Chấp nhận được nhưng không tối ưu.                                                                        |

**Nhớ kỹ:** Proxy chỉ có tác dụng khi **mỗi tài khoản có một IP riêng**. Dùng chung thì công cốc.

> 💡 Nếu ngân sách hạn chế: **giảm số tài khoản** xuống bằng số proxy bạn có, thay vì dùng chung proxy. Chạy 3 tài khoản tử tế an toàn hơn 6 tài khoản dùng chung 2 proxy.

---

## 7. Kiểm tra proxy có hoạt động không

Có proxy "trông đúng" nhưng thực tế không chạy. Cách kiểm tra **trước khi** chạy tool:

### Cách 1 — Kiểm tra bằng trình duyệt (dễ nhất, khuyên dùng)

1. Mở **Edge** hoặc **Chrome**.
2. Vào trang: `https://whatismyipaddress.com`
3. Xem **IP hiện tại của bạn** và ghi nhớ nó (ví dụ `113.161.x.x`).
4. Cài extension proxy (ví dụ _Proxy SwitchyOmega_) → nhập đúng thông tin proxy của bạn → bật lên.
5. Tải lại trang `whatismyipaddress.com`.
6. **IP phải ĐỔI thành IP khác.** Nếu vẫn là IP cũ → proxy không hoạt động, đừng nhập vào tool.

### Cách 2 — Kiểm tra bằng dòng lệnh

Mở Terminal trong thư mục tool và chạy (thay thông tin proxy của bạn vào):

```bash
curl -x http://myuser123:aBcD1234xyz@proxy.provider.com:8080 https://api.ipify.org
```

- In ra một địa chỉ IP → ✅ proxy chạy tốt.
- Báo lỗi `Could not resolve host`, `Connection refused`, `407 Proxy Authentication Required` → proxy có vấn đề. Xem mục 8.

> ⚠ Trong lệnh `curl` ở trên, tài khoản/mật khẩu **nằm trong cùng chuỗi** với `@`. Đó là **cú pháp của riêng `curl`**, KHÔNG phải cách nhập vào Web UI. Trong Web UI, bạn luôn tách ra 2 ô riêng.

---

## 8. Lỗi thường gặp & cách sửa

### ❌ "Proxy URL is required when other proxy settings are configured"

Bạn điền Port/Username/Password nhưng **để trống Proxy address**. Hoặc ngược lại, muốn xóa proxy nhưng chỉ xóa mỗi địa chỉ.
**Sửa:** điền đủ địa chỉ, hoặc bấm **Remove Proxy** để xóa sạch mọi thứ.

### ❌ "Proxy port must be an integer from 1 to 65535"

Ô Port trống, hoặc bạn gõ chữ, hoặc gõ số ngoài khoảng (ví dụ `70000`, `0`).
**Sửa:** nhập số từ `1` đến `65535`. Cổng phổ biến: `8080`, `3128`, `1080`.

### ❌ "Put proxy credentials in the username/password fields, not in the proxy URL"

Bạn gõ `http://user:pass@proxy.com` vào ô Proxy address.
**Sửa:** ô Proxy address chỉ ghi `http://proxy.com`. Tài khoản → ô Username. Mật khẩu → ô Password.

### ❌ "Proxy username and password must be configured together"

Bạn điền Username mà quên Password (hoặc ngược lại).
**Sửa:** điền cả hai, hoặc xóa trắng cả hai.

### ❌ "SOCKS5 proxy authentication is not supported by Patchright"

Bạn nhập tài khoản/mật khẩu cho proxy loại SOCKS.
**Sửa:** đổi sang proxy `http://` / `https://`, hoặc xóa Username + Password nếu proxy SOCKS của bạn không cần đăng nhập.

### ❌ "Unsupported proxy protocol"

Bạn gõ sai tiền tố, ví dụ `ftp://` hoặc `socks://` (thiếu số).
**Sửa:** chỉ dùng đúng 4 tiền tố: `http://`, `https://`, `socks4://`, `socks5://`.

### ❌ "Cannot change a proxy while a bot run is active"

Tool đang chạy thì không cho sửa proxy — vì sửa giữa chừng sẽ làm hỏng phiên đang chạy.
**Sửa:** bấm **Stop**, đợi tool dừng hẳn, rồi sửa.

### ❌ Lưu thành công nhưng chạy tool vẫn lỗi mạng

Nguyên nhân theo thứ tự khả năng:

1. **Proxy chết.** Kiểm tra bằng mục 7. Proxy miễn phí/rẻ thường chết liên tục.
2. **Công tắc "Use for API requests too" đang BẬT** và proxy chặn API. → Tắt đi.
3. **Proxy đã hết hạn dung lượng.** Nhiều gói bán theo GB; hết GB là proxy ngừng chạy dù thông tin vẫn đúng. → Vào trang nhà cung cấp kiểm tra.
4. **Chưa chạy lại tool.** Thay đổi chỉ áp dụng cho **lần chạy tới**.

### ❌ Tool chạy chậm hẳn sau khi thêm proxy

Bình thường. Proxy ở nước ngoài làm mọi request chậm hơn.
**Sửa:** chọn proxy **gần Việt Nam** (Singapore, Hong Kong) thay vì Mỹ/Âu.

---

## 9. Cấu hình đề xuất cho người mới

Nếu bạn có **4 tài khoản**, đây là cấu hình an toàn và thực tế nhất:

| Tài khoản   | Proxy                 | "Use for API requests too" |
| ----------- | --------------------- | -------------------------- |
| Tài khoản 1 | Proxy riêng #1 (http) | TẮT                        |
| Tài khoản 2 | Proxy riêng #2 (http) | TẮT                        |
| Tài khoản 3 | Proxy riêng #3 (http) | TẮT                        |
| Tài khoản 4 | Proxy riêng #4 (http) | TẮT                        |

**Lý do chọn cấu hình này:**

- **HTTP thay vì SOCKS** → dùng được mật khẩu, không vướng giới hạn của Patchright.
- **Công tắc TẮT** → tránh được nhóm lỗi API phổ biến nhất, vẫn che được trình duyệt (phần Microsoft soi kỹ nhất).
- **Proxy riêng từng tài khoản** → mỗi tài khoản một IP, đúng nguyên tắc vàng ở mục 6.

Chạy thử vài ngày. Nếu ổn định và bạn muốn che chắn thêm, hãy thử bật công tắc cho **một** tài khoản trước, quan sát log — đừng bật hết cùng lúc, vì nếu có lỗi bạn sẽ không biết tại proxy nào.

---

## 10. Bảng tra nhanh

| Việc cần làm                 | Ở đâu                                                  |
| ---------------------------- | ------------------------------------------------------ |
| Mở khung sửa proxy           | Nút **Proxy** trên dòng tài khoản                      |
| Nhập proxy                   | Ô **Proxy address** — nhớ có `http://`                 |
| Nhập cổng                    | Ô **Port** — số 1–65535                                |
| Nhập tài khoản proxy         | Ô **Username**                                         |
| Nhập mật khẩu proxy          | Ô **Password**                                         |
| Cho proxy che cả API         | Công tắc **Use for API requests too** (khuyên **TẮT**) |
| Lưu                          | Nút **Save Proxy**                                     |
| Xóa proxy                    | Nút **Remove Proxy**                                   |
| Kiểm tra proxy sống hay chết | `https://whatismyipaddress.com` (mục 7)                |
| Proxy lưu ở đâu              | File `.env`, dòng `ACCOUNT_N_PROXY_*`                  |

> 🔒 **Lưu bảo mật:** mật khẩu proxy được lưu trong file `.env` trên máy bạn. Web UI **không bao giờ hiển thị lại** mật khẩu đã lưu — đó là lý do ô Password luôn trống khi bạn mở lại khung sửa. Muốn giữ nguyên mật khẩu cũ, **cứ để trống ô đó rồi bấm Save** — tool sẽ giữ lại mật khẩu đang có.

---

**Xem thêm:** `WEB_UI_GUIDE.vi.md` — hướng dẫn đầy đủ về Web UI dành cho người mới bắt đầu.
