# バイブスジャパン vol.8 ｜ LP（ランディングページ）

学歴で生きるな、バイブスで生きろ。 — 2027.2.13(土) なんばHatch

## 📁 ファイル構成
```
vibes-japan-vol8-lp/
├─ index.html        … 本体（1ページスクロール型）
├─ css/style.css     … デザイン（赤×黒テーマ / SPファースト）
├─ js/script.js      … ナビ・写真読込・映像・フォーム・サンクス表示
└─ assets/           … ★ここに写真/動画を置くだけで自動反映★
```

## ▶️ 確認方法
`index.html` をダブルクリックしてブラウザで開くだけ（サーバー不要）。

## 🎨 デザイン
- **赤 × 黒**を基調（青ネオンは全廃）。炎をイメージした赤〜暖色のグラデーションをアクセントに使用。
- **1ページスクロール型**。上部固定ナビをクリックすると該当セクションへスムーズスクロール（現在地をハイライト）。
- スマホではナビがハンバーガーメニューに変化。
- 参考構成：STARTUP PARADISE（スタパラ）のセクション構成を踏襲。

## 🧱 ページ構成（上から順）
`HERO → MOVIE（ダイジェスト） → クイック申込フォーム → INTRODUCTION → CONTENTS → SPEAKERS → TIMETABLE → VOICE（実績・声） → SPONSOR → FAQ → OUTLINE → ENTRY（最終申込フォーム）`

- 申込フォームは仕様どおり **2箇所**（FV直下のクイック／最下部のメイン）。
- **TIMETABLE / SPEAKERS（ゲスト）/ SPONSOR** は仮データです。確定次第の差し替えを想定。

## 📷 写真・動画の入れ方（最重要）
`assets/` に、**下の決まったファイル名**で置くだけで自動反映されます。未配置の箇所はデザイン済みプレースホルダーが出て、レイアウトは崩れません。

| ファイル名（assets/ 内） | 使用箇所 | 推奨 |
|---|---|---|
| `fv-bg.jpg` | HERO背景 | 横長・2000px以上 |
| `digest.mp4` | ダイジェスト映像 | 16:9・MP4/H.264 |
| `digest-poster.jpg` | 映像サムネ（任意） | 16:9 |
| `program-pitch.jpg` | CONTENTS① バトルピッチ | 16:9 |
| `program-matching.jpg` | CONTENTS② マッチング | 21:9 |
| `program-live.jpg` | CONTENTS③ ライブ | 16:9 |
| `organizer.jpg` | SPEAKERS 西 奈槻 氏 | 正方形 |
| `guest-1.jpg`〜`guest-3.jpg` | SPEAKERS ゲスト（解禁時） | 正方形 |
| `gallery-1.jpg`〜`gallery-6.jpg` | VOICE 過去開催ギャラリー | 4:3 |
| `sponsor-1.png`〜`sponsor-8.png` | SPONSOR 参画企業ロゴ | 白抜き・透過PNG |
| `logo.png` | イベントロゴ（ヘッダー左上・フッター） | **白抜き・透過PNG**（暗背景用）・高さ40〜80px相当 |
| `logo-yaruka.png` | 主催「やるかやらんか」ロゴ（フッター） | 白抜き・透過PNG |
| `favicon.png` | ブラウザのタブアイコン | 正方形・512×512 |
| `ogp.jpg` | SNSシェア用サムネ | 1200×630 |

> **ロゴについて**：`logo.png` を置くとヘッダー左上とフッターのテキストが自動で画像ロゴに切り替わります。無ければ現在のテキストロゴが表示されます。背景が黒いので**白抜き（明るい色）の透過PNG**を推奨。

> ⚠️ Windowsの「登録された拡張子は表示しない」設定のままだと `organizer.jpg.jpg` のような**二重拡張子**になり読み込めません。エクスプローラーの「表示 → ファイル名拡張子」にチェックを入れて確認してください。
> ※`.jpg`以外（`.png`/`.webp`）で入れる場合は `index.html` の該当 `src` を書き換え。WebP化でLighthouseスコア向上。

## ✍️ 差し替え・確認をお願いしたい箇所
- **TIMETABLE**：仮スケジュール（12:30開場〜18:00クローズ）。確定時間に差し替え。
- **SPEAKERS**：ゲスト3枠は「Coming Soon」。解禁時に写真＋氏名を差し替え。
- **SPONSOR**：`sponsor-1〜8.png` を実ロゴに差し替え（数の増減も可）。
- **OUTLINE**：「お問い合わせ先メールアドレス」を設定してください。

## 🔌 バックエンド連携（GAS ＋ Googleスプレッドシート）
申込データの保存・自動返信メール（QR付き）・シリアル発番を、無料・サーバー不要で構築できます。

- **コード**：[backend/vibes-gas.gs](backend/vibes-gas.gs)
- **セットアップ手順**：[backend/BACKEND.md](backend/BACKEND.md)（所要10〜15分・図解付き）

手順どおりデプロイし、発行されたURLを `js/script.js` 先頭の `ENDPOINT_URL` に貼るだけで連携完了します。
```js
var ENDPOINT_URL = ''; // ← GASのウェブアプリURLを貼り付け
```
- 未設定時はモック動作（サンクス表示までは動作、データ送信なし）。
- 連携後はGASが返す `serial` / `qrUrl` を使ってサンクス画面にQRを表示します。
- 送信データ：`{ name, kana, school, email, tel, purpose[], formType, submittedAt }`

> 📧 700名規模のメール送信は、無料Gmailの送信上限（約100通/日）を超えるおそれがあります。**Google Workspaceアカウントでの運用**を推奨（詳細はBACKEND.md）。

## 📱 動作確認推奨環境
iOS Safari最新 / Android Chrome最新 / PC Chrome・Safari最新
