# TOEIC Vocabulary Quiz

從 Notion「多益單字庫」同步單字，使用 GitHub Pages 顯示「英文 → 四選一中文意思」題目。

## 目前功能

- 四選一：題目顯示英文，選中文解釋
- 題目隨機、不重複跑完一輪後重新洗牌
- 顯示詞性與答題後例句
- 正確率、連對、作答數統計
- 錯題記錄存在瀏覽器 localStorage
- 可切換「錯題優先」
- 可依 Notion「熟悉度」篩選：考前字 / 新單字 / 複習中 / 熟悉
- 預設進入「考前字」題庫；篩選後四個選項優先都從同一題庫抽取
- 支援 1–4、A–D、Enter 快捷鍵
- GitHub Actions 每小時自動同步 Notion
- Notion Token 不會出現在前端

## 1. 建立 GitHub repo

把這個資料夾全部 push 到 repo 的 `main` branch。

## 2. 開啟 GitHub Pages

GitHub repo → Settings → Pages → Build and deployment：

- Source：Deploy from a branch
- Branch：`main`
- Folder：`/ (root)`

儲存後 GitHub 會提供 Pages 網址。

## 3. 建立 Notion internal integration / connection

在 Notion 的 Creator / Integration 設定建立 internal connection，取得 token。

接著到「多益單字庫」頁面：

`•••` → `Add connections` → 加入剛建立的 connection。

## 4. 設定 GitHub Actions Secrets

GitHub repo → Settings → Secrets and variables → Actions → New repository secret

新增：

- `NOTION_TOKEN`：Notion internal connection token
- `NOTION_DATA_SOURCE_ID`：`15cb8270-0f90-40df-8ab8-8b09589f3616`

> 這個 Data Source ID 是目前「多益單字庫」實際使用的 data source。

## 5. 第一次同步

GitHub repo → Actions → `Sync Notion vocabulary` → Run workflow。

同步成功後會自動更新 `data/words.json` 並 commit。

之後預設每小時同步一次。你也可以隨時手動 Run workflow。

## 題庫 JSON 格式

前端只讀 `data/words.json`，格式：

```json
[
  {
    "word": "consolidate",
    "meaning": "鞏固；合併；整合",
    "example": "The company consolidated its operations to reduce costs.",
    "addedDate": "2026-08-09",
    "familiarity": "新單字",
    "pos": "verb"
  }
]
```

## 安全注意

不要把 `NOTION_TOKEN` 寫進 `app.js`、`words.json` 或任何會被 GitHub Pages 發布的檔案。GitHub Pages 是純前端，因此不能安全地直接呼叫需要 secret 的 Notion API；本專案改由 GitHub Actions 在伺服器端同步，再把結果輸出成靜態 JSON。

另外，GitHub Pages 網站上的 `words.json` 會跟著頁面公開可讀。如果你只是自己使用、但不希望任何人能看到題庫內容，需另外加存取控制或改用有登入保護的部署方式。
