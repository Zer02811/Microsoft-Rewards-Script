# Microsoft Rewards Script - Hướng dẫn đầy đủ cho người mới bắt đầu

Hướng dẫn từ đầu đến cuối cách cài đặt và sử dụng công cụ này thông qua **Web UI** mới. Không cần biết lập trình. Mọi lệnh đều chỉ cần sao chép, dán và nhấn Enter.

> **Lưu ý:** các nút và tên mục trong giao diện vẫn giữ nguyên tiếng Anh (ví dụ **Run Selected**), vì Web UI chưa được dịch. Lệnh, tên file và tên biến cũng giữ nguyên tiếng Anh.

---

## Mục lục

1. [Công cụ này thực sự làm gì](#1-công-cụ-này-thực-sự-làm-gì)
2. [Yêu cầu trước khi bắt đầu](#2-yêu-cầu-trước-khi-bắt-đầu)
3. [Cài đặt môi trường (chỉ làm một lần)](#3-cài-đặt-môi-trường-chỉ-làm-một-lần)
4. [Khởi động Web UI](#4-khởi-động-web-ui)
5. [Cách sử dụng Web UI](#5-cách-sử-dụng-web-ui)
6. [Tùy chọn: bật tính năng lên lịch](#6-tùy-chọn-bật-tính-năng-lên-lịch)
7. [Xử lý sự cố](#7-xử-lý-sự-cố)
8. [Lưu ý về an toàn và bảo mật](#8-lưu-ý-về-an-toàn-và-bảo-mật)
9. [Tra cứu nhanh](#tra-cứu-nhanh)

---

## 1. Công cụ này thực sự làm gì

Hãy hình dung nó như **một con robot dùng trình duyệt web thay cho bạn**.

Bình thường bạn kiếm điểm Microsoft Rewards bằng cách tìm kiếm trên Bing, bấm vào các thẻ nhiệm vụ hằng ngày và đọc bài viết. Công cụ này sẽ mở một trình duyệt thật, đăng nhập bằng tài khoản của bạn, rồi tự bấm và tự tìm kiếm.

Có ba phần. Hình dung chúng như một nhà hàng sẽ dễ hiểu hơn:

| Phần       | Ví von nhà hàng | Thực chất là gì                                       |
| ---------- | --------------- | ----------------------------------------------------- |
| **Bot**    | Đầu bếp         | Phần mở trình duyệt và thu thập điểm                  |
| **Server** | Người phục vụ   | Chương trình nhỏ nhận lệnh của bạn và báo lại kết quả |
| **Web UI** | Thực đơn        | Trang web bạn bấm vào trong trình duyệt               |

Bạn gần như chỉ cần đụng tới **thực đơn** (Web UI). Nhưng người phục vụ phải đang làm việc thì thực đơn mới có tác dụng, vì vậy ở bước 4 bạn sẽ khởi động server và để nó chạy suốt.

---

## 2. Yêu cầu trước khi bắt đầu

### Máy tính của bạn cần có

- **Windows, macOS hoặc Linux.** Hệ điều hành nào cũng được.
- **Khoảng 2 GB dung lượng trống.** Công cụ sẽ tải về một bản trình duyệt riêng của nó, chiếm phần lớn dung lượng này.
- **Kết nối internet.**
- **Một màn hình.** Lần đăng nhập đầu tiên bạn cần nhìn thấy cửa sổ trình duyệt, nên bước đó không chạy được trên máy chủ không có màn hình.

### Bạn cần chuẩn bị sẵn

- **Một tài khoản Microsoft** đã bật Rewards. Hãy đăng nhập thử tại [rewards.bing.com](https://rewards.bing.com) một lần bằng trình duyệt thường ngày và chắc chắn nó hoạt động trước khi tự động hóa.
- **Địa chỉ email của tài khoản.**
- **Mật khẩu**, _chỉ khi_ tài khoản của bạn đăng nhập bằng mật khẩu. Nếu bạn dùng ứng dụng Microsoft Authenticator và không có mật khẩu thì bỏ qua.
- **20 đến 30 phút** cho việc cài đặt một lần. Phần lớn thời gian là chờ tải xuống.

### Phần mềm cần cài

Chỉ một thứ duy nhất: **Node.js**, phiên bản 24 trở lên. Bước 3 sẽ hướng dẫn chi tiết.

Node.js là bộ máy chạy công cụ này. Bạn không cần viết bất kỳ dòng code nào, giống như lái xe không đòi hỏi bạn phải tự chế tạo động cơ.

> **Một lời trấn an:** bạn sẽ gõ lệnh vào một cửa sổ màu đen (gọi là "terminal"). Chuyện này hoàn toàn bình thường. Bạn không hề lập trình. Bạn chỉ đang đưa ra vài chỉ dẫn ngắn, giống như gõ địa chỉ trang web vào trình duyệt.

---

## 3. Cài đặt môi trường (chỉ làm một lần)

Làm lần lượt năm bước sau. Mỗi bước dựa trên bước trước.

### Bước 3.1 - Cài Node.js

**Trên Windows:**

1. Vào **[nodejs.org](https://nodejs.org)**.
2. Tải bản **LTS** (nút màu xanh lớn). Kiểm tra số phiên bản bắt đầu bằng **24** hoặc cao hơn.
3. Mở file vừa tải và bấm **Next** xuyên suốt trình cài đặt. Các lựa chọn mặc định là đúng, đừng thay đổi gì cả.
4. Cài xong thì khởi động lại máy. Bước này quan trọng: Windows cần khởi động lại mới nhận ra Node.js.

**Trên macOS:** tải file cài đặt `.pkg` bản LTS từ [nodejs.org](https://nodejs.org) và chạy nó.

**Trên Linux:** dùng [nodesource](https://github.com/nodesource/distributions) hoặc trình quản lý gói của hệ thống, và xác nhận bạn có phiên bản 24 trở lên.

**Kiểm tra đã cài thành công.** Mở terminal:

- **Windows:** nhấn **phím Windows**, gõ `powershell`, nhấn Enter.
- **macOS:** nhấn **Cmd+Space**, gõ `terminal`, nhấn Enter.
- **Linux:** nhấn **Ctrl+Alt+T**.

Gõ lệnh này và nhấn Enter:

```bash
node --version
```

Bạn sẽ thấy kết quả dạng `v24.5.0`. Nếu thấy "command not found" thì Node.js chưa cài đúng, hoặc bạn đã bỏ qua bước khởi động lại.

> **Nếu số phiên bản nhỏ hơn 24**, nghĩa là máy đang có Node.js cũ. Hãy cài bản mới đè lên theo các bước ở trên.

### Bước 3.2 - Tải công cụ về máy

**Cách đơn giản nhất (không cần Git):**

1. Vào trang GitHub của dự án.
2. Bấm nút **Code** màu xanh, rồi chọn **Download ZIP**.
3. Chuột phải vào file ZIP vừa tải, chọn **Extract All**.
4. Di chuyển thư mục đã giải nén tới nơi bạn dễ nhớ, ví dụ thư mục Documents.

> **Nên tránh các thư mục được đồng bộ bởi OneDrive, Dropbox hoặc Google Drive.** Chúng đôi khi khóa file trong lúc công cụ đang ghi vào, gây ra những lỗi rất khó hiểu.

### Bước 3.3 - Đưa terminal vào đúng thư mục

Terminal cần phải "đứng bên trong" thư mục dự án, giống như cách File Explorer mở một thư mục khi bạn bấm đúp vào nó.

**Cách dễ nhất trên Windows:**

1. Mở thư mục dự án trong File Explorer.
2. Bấm vào thanh địa chỉ ở trên cùng (nơi hiện đường dẫn thư mục).
3. Gõ `powershell` và nhấn Enter.

Một terminal sẽ mở ra, đã nằm sẵn đúng vị trí.

**Mọi hệ điều hành:** gõ `cd ` (có dấu cách), rồi kéo thư mục từ trình quản lý file thả vào cửa sổ terminal, sau đó nhấn Enter.

**Kiểm tra bạn đang đứng đúng chỗ:**

```bash
ls
```

Bạn phải thấy các tên file, trong đó có `package.json` và `config.example.json`. Nếu không thấy thì bạn đang ở sai thư mục.

> **Giữ nguyên cửa sổ terminal này.** Mọi lệnh từ đây về sau đều gõ vào đó.

### Bước 3.4 - Cài các thành phần của công cụ

Gõ lệnh này và nhấn Enter:

```bash
npm run pre-build
```

**Lệnh này chạy khá lâu.** Từ năm đến mười lăm phút là bình thường. Nó đang tải trình duyệt riêng của công cụ, dung lượng vài trăm megabyte.

Bạn sẽ thấy rất nhiều chữ chạy trên màn hình. Điều đó không sao cả. Các cảnh báo màu vàng là bình thường và có thể bỏ qua. Chỉ cần lo khi nó kết thúc bằng chữ `error` và không có gì xảy ra tiếp.

Sau đó chạy:

```bash
npm run build
```

Lệnh này nhanh, thường chưa tới một phút. Nó chuyển các file mã nguồn của dự án sang dạng mà máy tính thực sự chạy được.

> **Hãy nhớ lệnh này.** Bất cứ khi nào bạn thay đổi file trong dự án, chạy lại `npm run build` để áp dụng thay đổi.

### Bước 3.5 - Tạo hai file cấu hình

Dự án đi kèm các file cấu hình **mẫu**. Bạn tạo bản sao của riêng mình rồi điền thông tin vào. Các file mẫu giống như một tờ đơn trống.

**File 1: `config.json`** - điều khiển cách bot hoạt động.

Tìm file tên `config.example.json` trong thư mục dự án. **Sao chép** nó, rồi đổi tên bản sao thành đúng `config.json`.

- Windows: chuột phải → Copy, chuột phải → Paste, sau đó đổi tên `config.example - Copy.json` thành `config.json`.
- Hãy chắc chắn tên file đúng là `config.json`, không còn chữ "example" hay "copy".

Bạn không cần sửa gì bên trong file này. Các giá trị mặc định là đủ dùng.

**File 2: `.env`** - chứa email và mật khẩu tài khoản của bạn.

Tìm file tên `env.example`. Sao chép nó và đổi tên bản sao thành đúng `.env` - bắt đầu bằng một dấu chấm, và **không có** đuôi mở rộng.

> **Mẹo cho Windows:** Explorer có thể không cho bạn đặt tên file bắt đầu bằng dấu chấm. Cách lách: đặt tên là `.env.` **có dấu chấm ở cuối** - Windows sẽ tự bỏ dấu chấm đó và để lại đúng `.env`.

Bây giờ mở `.env` bằng **Notepad** (chuột phải → Open with → Notepad). Bạn sẽ thấy các dòng như thế này:

```env
ACCOUNT_1_EMAIL=email@example.com
#ACCOUNT_1_PASSWORD=your_password
```

Đổi email thành email thật của bạn. Nếu tài khoản dùng mật khẩu, xóa dấu `#` ở đầu dòng mật khẩu và điền mật khẩu thật vào:

```env
ACCOUNT_1_EMAIL=your.real.email@outlook.com
ACCOUNT_1_PASSWORD=YourRealPassword
```

**Dấu `#` nghĩa là "bỏ qua dòng này."** Xóa nó đi là bật dòng đó lên.

Nếu tài khoản của bạn dùng ứng dụng Authenticator thay vì mật khẩu, cứ để nguyên dòng mật khẩu cùng dấu `#`. Công cụ sẽ tự xử lý.

Lưu file và đóng Notepad.

> **Nếu bạn dùng xác thực hai lớp**, có một dòng dành cho `ACCOUNT_1_TOTP_SECRET`. Điền vào đó sẽ giúp công cụ tự sinh mã 6 số cho bạn. Cách lấy giá trị: trong phần cài đặt bảo mật của Microsoft, mở "Manage how you sign in", thêm một ứng dụng authenticator, và khi mã QR hiện ra hãy chọn **"enter code manually"**. Dán đoạn mã đó làm giá trị.

**Cài đặt đã xong.** Bạn không bao giờ phải lặp lại các bước từ 3.1 đến 3.5.

---

## 4. Khởi động Web UI

Hai bước: đánh thức server, rồi mở trang web.

### Bước 4.1 - Khởi động server

Trong terminal của bạn (vẫn đang ở thư mục dự án), chạy:

```bash
npm run api
```

Bạn sẽ thấy vài dòng chữ khởi động, sau đó terminal có vẻ như **đứng yên**, không in ra gì thêm và không hiện dấu nhắc lệnh.

**Điều đó là đúng.** Server giờ đang chạy và đang lắng nghe. Nó được thiết kế để nằm yên như vậy. Terminal không hề bị treo.

> **Hãy để cửa sổ terminal này mở, đừng đóng nó.** Đóng lại là tắt server, và Web UI sẽ ngừng hoạt động. Thay vào đó hãy thu nhỏ cửa sổ.

### Bước 4.2 - Mở trang web

Mở trình duyệt bạn vẫn dùng hằng ngày (Chrome, Edge, Firefox, gì cũng được) và vào địa chỉ:

```
http://127.0.0.1:3010
```

`127.0.0.1` luôn có nghĩa là "chính máy tính này". Bạn không truy cập internet, chỉ là đang nối vào máy của mình.

Bạn sẽ thấy bảng điều khiển **Microsoft Rewards Control**.

Nhìn lên góc trên bên phải. Ở đó có nhãn **Server**:

| Nhãn        | Ý nghĩa                                                                    |
| ----------- | -------------------------------------------------------------------------- |
| **Online**  | Server đang chạy, chưa có phiên nào đang chạy. Đây là trạng thái bạn muốn. |
| **Running** | Đang có một phiên chạy ngay lúc này.                                       |
| **Offline** | Trang web không kết nối được với server. Xem lại terminal ở bước 4.1.      |

Nếu hiện Offline, nhiều khả năng terminal của server đã bị đóng hoặc đã báo lỗi.

### Mỗi lần dùng sau này

Khởi động công cụ chỉ gồm đúng hai bước đó:

1. Mở terminal trong thư mục dự án, chạy `npm run api`
2. Mở `http://127.0.0.1:3010`

---

## 5. Cách sử dụng Web UI

Trang web là một cột duy nhất gồm các mục, từ trên xuống dưới. Dưới đây là từng mục.

### 5.1 - Add Account (Thêm tài khoản)

Ô ở trên cùng. Gõ địa chỉ email rồi bấm **Add Account**.

Việc này sẽ tự ghi email vào file `.env` cho bạn, nên bạn không phải sửa tay file đó nữa. Tài khoản xuất hiện trong danh sách ngay lập tức.

> **Quan trọng: giao diện cố ý không bao giờ hỏi mật khẩu của bạn.** Mật khẩu chỉ tồn tại trong file `.env` trên chính ổ đĩa của bạn. Nếu tài khoản vừa thêm cần mật khẩu, hãy mở `.env` bằng Notepad và thêm dòng tương ứng. Với tài khoản được thêm ở vị trí `ACCOUNT_2`, dòng cần thêm là `ACCOUNT_2_PASSWORD=yourpassword`.

### 5.2 - Account Overview (Tổng quan tài khoản)

Bốn ô đếm cho thấy tình trạng các tài khoản của bạn.

| Ô đếm              | Ý nghĩa                                                   |
| ------------------ | --------------------------------------------------------- |
| **Total Accounts** | Công cụ biết bao nhiêu tài khoản                          |
| **Logged In**      | Đã có phiên đăng nhập hợp lệ. Sẵn sàng chạy.              |
| **Not Logged In**  | Chưa từng đăng nhập. Cần làm bước bên dưới.               |
| **Login Expired**  | Từng đăng nhập nhưng phiên đã hết hạn. Cần đăng nhập lại. |

**Một tài khoản mới tinh sẽ bắt đầu ở trạng thái "Not Logged In". Đó là chuyện bình thường.**

### 5.3 - Đăng nhập lần đầu cho tài khoản mới

Microsoft sẽ không để một con robot vượt qua bước đăng nhập mới một cách trơn tru, nên lần đầu tiên bạn phải tự đăng nhập. Chỉ một lần. Sau đó phiên đăng nhập sẽ được lưu lại.

Mở một terminal **thứ hai** trong thư mục dự án (để yên terminal của server) và chạy lệnh này, thay bằng email của bạn:

```bash
npm run manual-login -- --email your.real.email@outlook.com
```

Một cửa sổ trình duyệt sẽ mở ra. Đăng nhập bình thường, y như mọi ngày, kể cả khi được hỏi mã 2FA. Khi bạn vào tới trang Rewards, **hãy đợi khoảng năm giây**. Cửa sổ sẽ tự đóng và phiên đăng nhập của bạn được lưu.

Quay lại bảng điều khiển, tài khoản đó sẽ chuyển sang **Logged In** trong vòng vài giây.

> Hãy làm lại bước này mỗi khi tài khoản hiện **Login Expired**. Đây là cách sửa chuẩn cho gần như mọi vấn đề đăng nhập.

### 5.4 - Execution Settings (Cài đặt thực thi)

Bốn nút điều khiển quyết định phiên chạy tiếp theo sẽ hoạt động _như thế nào_. **Hãy chỉnh chúng trước khi bấm Run.** Lựa chọn của bạn được trình duyệt ghi nhớ cho lần sau.

**Run in Headless Mode (Chạy ở chế độ ẩn)**

- **Tắt** (mặc định): bạn nhìn thấy các cửa sổ trình duyệt mở ra và tự bấm.
- **Bật**: mọi thứ diễn ra vô hình ở nền.

Để tắt thì tốt hơn khi bạn mới làm quen, vì bạn nhìn thấy chuyện gì đang xảy ra. Bật lên thì tiện hơn khi bạn đã tin tưởng nó, để các cửa sổ không giật mất màn hình lúc bạn đang làm việc khác.

> Đừng dùng chế độ ẩn cho lần đăng nhập đầu tiên. Hãy dùng `manual-login` ở mục 5.3.

**Run Visual Search (Chạy tìm kiếm bằng hình ảnh)**

Mặc định là tắt. Bật lên để làm thêm các nhiệm vụ Bing Visual Search (loại nhiệm vụ tìm kiếm bằng hình ảnh thay vì bằng chữ) nhằm kiếm thêm điểm hằng ngày.

**Run 30-Minute Edge Browsing (Chạy phiên duyệt Edge 30 phút)**

Mặc định là tắt. Bật lên để hoàn thành phần thưởng duyệt Edge, khi đó công cụ sẽ duyệt web ở nền trong nửa giờ.

> **Tính năng này làm phiên chạy kéo dài thêm ít nhất 30 phút.** Đó là yêu cầu của chính phần thưởng, không phải công cụ chạy chậm. Nó được đánh dấu là thử nghiệm vì Microsoft thỉnh thoảng thay đổi cách hoạt động.

**Schedule for Later (Lên lịch để chạy sau)**

Một ô chọn ngày và giờ. Hãy để **trống** nếu muốn chạy ngay. Chỉ điền vào khi bạn định dùng nút Schedule Run (xem mục 5.7).

### 5.5 - Ready to Execute (Sẵn sàng thực thi)

Danh sách tài khoản của bạn, cùng các nút hành động.

Mỗi dòng tài khoản hiển thị một **ô checkbox**, **email**, số lần đã **chạy**, thời điểm chạy **gần nhất**, số **điểm**, và một **nhãn trạng thái**.

**Cách chạy:**

1. **Tích vào ô checkbox** của từng tài khoản bạn muốn chạy. Hoặc bấm **Select All** để tích hết (nút này sẽ đổi thành **Deselect All**).
2. Kiểm tra lại các công tắc trong Execution Settings.
3. Bấm **Run Selected**.

Một thông báo nhỏ sẽ trượt ra xác nhận đã bắt đầu, nhãn Server chuyển sang **Running**, và các dòng log bắt đầu hiện ở cuối trang.

**Điều nên biết:** một phiên chạy đầy đủ mất khá lâu, thường từ 20 đến 60 phút cho mỗi tài khoản, lâu hơn nếu bật Edge Browsing. Công cụ cố tình tạm nghỉ giữa các thao tác để hành xử giống người thật hơn là giống máy móc. Chậm là có chủ đích.

**Nút Stop** bị mờ đi trừ khi thực sự có gì đó đang chạy. Bấm vào đó để kết thúc phiên chạy: nó yêu cầu bot tự đóng trình duyệt một cách gọn gàng, và nếu bot không phản hồi kịp thời thì server sẽ buộc đóng. Dù theo cách nào cũng không để sót cửa sổ trình duyệt mồ côi.

**Nút Remove** chỉ gỡ tài khoản khỏi danh sách này, nhưng **không xóa nó khỏi file `.env`**, nên tài khoản sẽ xuất hiện lại ở lần làm mới trang kế tiếp. Muốn xóa hẳn một tài khoản, hãy mở `.env` bằng Notepad và xóa dòng `ACCOUNT_N_EMAIL` của nó.

### 5.6 - Scheduled Tasks (Các tác vụ đã lên lịch)

Liệt kê các phiên chạy bạn đã xếp hàng cho một thời điểm trong tương lai. Mỗi mục hiển thị giờ chạy, những tài khoản nào, và một nút **Cancel**.

### 5.7 - Cách lên lịch một phiên chạy

1. Tích chọn các tài khoản bạn muốn.
2. Đặt ngày và giờ trong **Schedule for Later**. Thời điểm đó phải ở tương lai, và tính theo đồng hồ của chính máy bạn.
3. Bấm **Schedule Run**.

**Có hai điều kiện phải đúng thì phiên chạy đã lên lịch mới thực sự khởi động:**

- Tính năng lên lịch phải được bật. Nó **mặc định là tắt** như một biện pháp an toàn. Xem [mục 6](#6-tùy-chọn-bật-tính-năng-lên-lịch). Nếu đang tắt, bạn sẽ nhận thông báo lỗi có nhắc tới `API_ALLOW_SCHEDULE_WRITE`.
- **Terminal của server vẫn phải đang chạy khi đến giờ**, và máy tính phải đang ở trạng thái thức. Người phục vụ đã về nhà thì không ai bắt đầu phiên chạy được.

### 5.8 - Live Logs (Log trực tiếp)

Bảng console màu đen ở cuối trang. Đây là nơi bot tường thuật những gì nó đang làm, theo thời gian thực.

Mỗi dòng có thời điểm, mức độ và nội dung thông báo. Phần mức độ là phần hữu ích nhất:

| Mức độ    | Màu sắc     | Ý nghĩa                                              |
| --------- | ----------- | ---------------------------------------------------- |
| **INFO**  | Bình thường | Tiến trình thông thường. Có thể bỏ qua.              |
| **WARN**  | Vàng        | Có gì đó bị bỏ qua hoặc được thử lại. Thường vô hại. |
| **ERROR** | Đỏ          | Thực sự có lỗi. Đáng để đọc.                         |

**Auto-scroll** (mặc định bật) giữ dòng mới nhất luôn nằm trong tầm nhìn. Hãy tắt nó khi bạn muốn cuộn lên đọc lại thứ gì đó mà không bị kéo tuột xuống dưới.

**Clear** xóa trắng phần hiển thị. Nó chỉ xóa những gì bạn đang thấy, không xóa dữ liệu trên server, nên tải lại trang sẽ mang phần lịch sử gần đây trở lại.

Console giữ tối đa 500 dòng gần nhất và phát lại 100 dòng cuối khi bạn mở trang, để bạn không quay lại một màn hình trống trơn.

**Khi có chuyện trục trặc, đây là nơi đầu tiên cần xem.** Cuộn tới các dòng màu đỏ và đọc nội dung.

---

## 6. Tùy chọn: bật tính năng lên lịch

Tính năng lên lịch mặc định bị tắt, để không gì có thể tự xếp hàng phiên chạy trên máy của bạn nếu bạn không chủ động cho phép. Bật nó lên chỉ cần thêm một dòng.

1. Dừng server: bấm vào cửa sổ terminal của nó và nhấn **Ctrl+C**.
2. Mở file `.env` bằng Notepad.
3. Thêm dòng này vào cuối file:

```env
API_ALLOW_SCHEDULE_WRITE=true
```

4. Lưu và đóng lại.
5. Khởi động server lần nữa bằng `npm run api`.

Giờ **Schedule Run** đã hoạt động.

---

## 7. Xử lý sự cố

### Trang web báo "Offline"

Server không chạy hoặc không kết nối được.

- Kiểm tra terminal nơi bạn chạy `npm run api`. Còn mở không? Có chữ màu đỏ nào không?
- Nếu nó đã bị đóng, chạy lại `npm run api`.
- Xác nhận địa chỉ đúng là `http://127.0.0.1:3010`.

### "Port 3010 is already in use"

Đã có một server đang chạy, nhiều khả năng là từ trước đó. Hoặc dùng luôn cái đang chạy (chỉ cần mở trang web), hoặc đóng cửa sổ terminal kia rồi thử lại.

### Một tài khoản cứ kẹt ở "Not Logged In" hoặc "Login Expired"

Hãy chạy bước đăng nhập thủ công ở mục 5.3. Cách này sửa được phần lớn các vấn đề đăng nhập.

```bash
npm run manual-login -- --email your.real.email@outlook.com
```

Nếu nó cứ hết hạn mãi, hãy xóa các phiên đã lưu và bắt đầu sạch sẽ:

```bash
npm run clear-sessions -- email your.real.email@outlook.com
```

Rồi đăng nhập thủ công lại lần nữa.

### "No accounts configured in .env yet"

Email có trong danh sách trên trình duyệt của bạn nhưng chưa có trong file `.env`. Hãy thêm lại qua ô **Add Account**, ô đó sẽ ghi file giúp bạn.

### Bấm Run Selected mà không thấy gì

- Bạn đã tích ít nhất một ô checkbox chưa? Chọn tài khoản là việc riêng với chạy chúng.
- Nhãn trạng thái có đang hiện **Running** không? Mỗi lần chỉ có một phiên chạy, nên nút này bị vô hiệu hóa khi đang có phiên chạy.

### Visual Search hoặc Edge Browsing không diễn ra

Hãy xác nhận công tắc đã **bật trước khi** bạn bấm Run Selected, chứ không phải sau đó. Rồi kiểm tra trong Live Logs xem có dòng như thế này không:

```
[Config] override: CONFIG_WORKER_VISUAL_SEARCH -> .workers.doVisualSearch = true
```

Dòng đó là công cụ xác nhận đã nhận được lựa chọn của bạn. Nếu nó có mặt, tính năng đã được bật cho phiên chạy đó. Nếu sau đó tính năng vẫn bị bỏ qua, phần log ngay bên dưới sẽ nói rõ lý do, thường là tài khoản không có nhiệm vụ đó trong ngày hôm ấy.

### Một lệnh báo lỗi với rất nhiều chữ đỏ

Hãy thử lần lượt:

1. `npm run build` rồi thử lại.
2. Nếu vẫn lỗi, chạy `npm run pre-build` rồi tới `npm run build`.
3. Kiểm tra cả `config.json` và `.env` đều tồn tại và được đặt tên chính xác. Thiếu `config.json` là một trong những nguyên nhân phổ biến nhất.

### Cửa sổ trình duyệt còn mở sau khi bị lỗi

Trên Windows:

```bash
npm run kill-chrome-win
```

---

## 8. Lưu ý về an toàn và bảo mật

**Thông tin đăng nhập của bạn nằm lại trên máy bạn.** Mật khẩu chỉ tồn tại trong file `.env` trên chính ổ đĩa của bạn. Web UI không bao giờ hỏi, không bao giờ hiển thị và không bao giờ gửi chúng đi đâu cả. Đừng bao giờ chia sẻ file `.env`, và đừng đăng nó lên ảnh chụp màn hình hay một chủ đề hỗ trợ kỹ thuật.

**Bảng điều khiển mặc định không có mật khẩu bảo vệ.** Nó được gắn vào `127.0.0.1`, nghĩa là chỉ các chương trình trên chính máy bạn mới truy cập được. Người khác trong cùng mạng Wi-Fi thì không. Đó là một thiết lập mặc định có chủ ý.

Nếu bạn thay đổi để server lắng nghe trên cả mạng (bằng thứ gì đó như `--host 0.0.0.0`), **hãy đặt token trước**, nếu không bất kỳ ai trong mạng đó cũng có thể khởi động phiên chạy trên tài khoản của bạn. Thêm một dòng như `API_TOKEN=some-long-random-string` vào `.env` trước khi làm việc đó.

**Đừng đưa `.env` hoặc `config.json` lên một kho GitHub công khai.** Dự án đã cấu hình để Git bỏ qua cả hai file này, nên chuyện đó chỉ xảy ra nếu bạn cố tình làm. Đừng làm.

**Về rủi ro với tài khoản của bạn.** Tự động hóa Microsoft Rewards là trái với điều khoản dịch vụ của Microsoft. Tài khoản thực sự có thể bị tạm khóa hoặc bị cấm vì việc này. Công cụ cố gắng hành xử giống người thật, với các khoảng nghỉ hợp lý, nhưng không có gì bảo đảm. Hãy dùng nó với một tài khoản mà bạn chấp nhận được nếu mất, và hiểu rằng bạn đang tự nhận lấy rủi ro đó.

---

## Tra cứu nhanh

**Khởi động hằng ngày:**

```bash
npm run api
```

Rồi mở `http://127.0.0.1:3010`.

**Các lệnh thường dùng:**

| Lệnh                                              | Tác dụng                                     |
| ------------------------------------------------- | -------------------------------------------- |
| `npm run api`                                     | Khởi động server cho Web UI                  |
| `npm run build`                                   | Áp dụng các thay đổi bạn đã làm vào file     |
| `npm run manual-login -- --email you@example.com` | Đăng nhập tài khoản bằng tay                 |
| `npm run clear-sessions -- list`                  | Xem các phiên đăng nhập đã lưu               |
| `npm run clear-sessions -- email you@example.com` | Xóa phiên đăng nhập đã lưu của một tài khoản |
| `npm run kill-chrome-win`                         | Đóng các cửa sổ trình duyệt bị kẹt (Windows) |

**Các file quan trọng:**

| File          | Chứa gì                                        |
| ------------- | ---------------------------------------------- |
| `.env`        | Email, mật khẩu của bạn và các tùy chọn server |
| `config.json` | Cách bot hoạt động                             |

**Phím tắt:** nhấn **Ctrl+C** trong terminal của server để dừng server.
