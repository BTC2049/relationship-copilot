# AI Relationship Copilot

Crypto Growth CRM 的聊天紀錄分析版。

## 怎麼使用

直接打開 `index.html`。可以拖拉或選擇聊天紀錄檔案，也可以展開「貼上聊天紀錄文字」手動貼上。

目前支援：

- 直接選擇 Instagram 匯出的整個最外層資料夾
- Telegram 匯出的 JSON
- Telegram 匯出的 HTML 文字解析
- LINE 聊天備份 txt
- IG / FB / LinkedIn 對話文字貼上
- 一般聊天紀錄文字
- CSV 或 CRM 匯出文字的簡易解析

資料只在瀏覽器本機解析，不會上傳到任何伺服器。

## Instagram 整包資料夾匯入

如果 IG 匯出後有很多資料夾，例如 `media`、`connections`、`logged_information`、`personal_information`、`your_instagram_activity`、`ads_information`，不需要手動挑檔案。

在工具裡按「選擇 IG 匯出資料夾」，選最外層資料夾即可。工具會自動：

- 略過圖片、影片、廣告、登入紀錄、偏好設定等低價值資料
- 優先讀取 `messages`、`inbox`、`message_requests`
- 讀取 `connections`、`followers`、`following`
- 補抓 `personal_information` 裡可能有用的聯絡訊號
- 把可用資料轉成同一套人脈分析格式

## 目前會分析

- 從聊天紀錄辨識人名與平台
- 計算最後互動天數
- 估算互動分數與商業價值
- 找出高價值人脈
- 找出 90 天以上沒有互動的沉睡關係
- 找出高價值但快流失的合作夥伴
- 找出近期互動活躍度上升的人
- 產生這週最值得聯絡的 10 個人
- 產生每個人的建議開場與維護策略

## 直接串接平台的現實限制

直接讀 Telegram、LINE、IG、FB、LinkedIn 私訊資料需要平台授權、app key、OAuth callback、權限審核，且多數平台不允許任意讀取個人私訊。

工具頁面底部有「平台直接串接路線」與可展開的 Setup Guide，分別說明 Telegram、LINE、IG / FB、LinkedIn 的快速匯入方式、正式串接方式與限制。

建議 MVP 路線：

1. 先支援官方匯出檔與聊天備份。
2. 再接 Telegram Bot / Telegram export workflow。
3. LINE 先接官方帳號 webhook 與聊天備份，不把個人 LINE 私訊當第一版核心。
4. IG / FB 先接 Meta 商業帳號訊息，不從個人私訊起步。
5. LinkedIn 先接 CRM、會議紀錄、Email、匯出檔，私訊串接放後面。
