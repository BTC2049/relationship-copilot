# AI Relationship Copilot

Crypto Growth CRM 的聊天紀錄分析版。

## 產品定位

這版參考成熟 Revenue Intelligence 工具的產品結構，但改成 Crypto BD / KOL / Agent / 社群主使用的 Relationship Intelligence OS。

核心流程：

- Capture：擷取 TG、LINE、IG、FB、LinkedIn、Email、會議紀錄等互動
- Understand：用聊天證據分析人脈價值與合作可能
- Prioritize：找出高價值、流失風險、活躍上升、疑似模板訊息
- Act：產生本週聯絡清單、推薦合作方式與 follow-up 角度

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
- 檢查過去互動是否有來有回
- 檢查語言與疑似模板/機器人訊息
- 只根據聊天內容評估商業合作價值，不推測資產、收入或身分背景
- 對每個分數列出聊天內容證據；證據不足會直接標示
- 依六大維度評分：資源能力、人脈影響力、加密貨幣相關度、合作意願、代理潛力、VIP客戶潛力
- 找出真正有證據支撐的高價值人脈
- 找出 90 天以上沒有互動的沉睡關係
- 找出高價值但快流失的合作夥伴
- 找出近期互動活躍度上升的人
- 產生這週最值得聯絡的 10 個人
- 產生每個人的建議開場與維護策略
- 輸出人物類型、推薦合作方式、100 字內 AI 總結與信心度

## 直接串接平台的現實限制

直接讀 Telegram、LINE、IG、FB、LinkedIn 私訊資料需要平台授權、app key、OAuth callback、權限審核，且多數平台不允許任意讀取個人私訊。

工具頁面底部有「平台直接串接路線」與可展開的 Setup Guide，分別說明 Telegram、LINE、IG / FB、LinkedIn 的快速匯入方式、正式串接方式與限制。

建議 MVP 路線：

1. 先支援官方匯出檔與聊天備份。
2. 再接 Telegram Bot / Telegram export workflow。
3. LINE 先接官方帳號 webhook 與聊天備份，不把個人 LINE 私訊當第一版核心。
4. IG / FB 先接 Meta 商業帳號訊息，不從個人私訊起步。
5. LinkedIn 先接 CRM、會議紀錄、Email、匯出檔，私訊串接放後面。
