# PianoTracker

**[English](README.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md)**

---

ピアノ練習者向けのデスクトップトラッカー — MIDIキーボードに接続し、練習を記録・可視化して、OBSにリアルタイムオーバーレイを配信します。

> Electron + React + TypeScript で構築。SQLiteによるオフラインファースト設計。オープンソース予定。

---

## 機能紹介

### 🎹 リアルタイム MIDI
- Roland FP-30（その他 USB MIDI デバイス）を自動検出 — 差し込むだけで即認識、再起動不要
- ベロシティに応じた色の濃さで 88 鍵をリアルタイム可視化
- サステインペダルのトラッキング（物理的な押鍵とペダル延音を区別）
- リアルタイムコード認識：ルート音、品質（メジャー/マイナー/ディミニッシュ/オーギュメント/サス/7th/9th）、転回形

### 📊 練習統計
- セッションごと・日別の押鍵数、練習時間、使用音符数、認識コード数
- よく弾く音が一目でわかる 88 鍵ヒートマップ
- スケール分析：演奏中のスケールをリアルタイム検出（メジャー、ナチュラルマイナー、ドリアン、ペンタトニック、ブルースなど）

### 📅 カレンダーと練習計画
- 月別カレンダー表示 — 練習した日を一覧で確認
- 統計タブの GitHub スタイル年間ヒートマップ
- 任意の日を右クリックして練習計画を追加：目標時間と内容を記録
- 今日の計画がある場合、練習画面上部にバナーで表示

### 🎵 曲目管理
- 練習中の曲をステータスで管理：未開始 / 練習中 / 完了
- 作曲家・メモを追加し、ステータスをいつでも更新可能

### 📡 OBS ライブオーバーレイ
- ローカル HTTP サーバー `http://localhost:7890/overlay` — OBS のブラウザソースとして追加
- **88 鍵ライブピアノ** をオーバーレイ下部に全幅表示（Canvas 描画、SSE リアルタイム配信 — ポーリング遅延なし）
- 個別にオン/オフできる表示要素：現在のコード、前のコード、練習タイマー、連続記録バッジ、今日の練習時間、ステータスインジケーター
- OBS ピアノ独自のキーカラー設定（押下/サステイン × 白鍵/黒鍵）— 練習設定からワンクリックで同期も可能
- テーマ：ダーク / ライト / ミニマル
- 位置（4コーナー）、コードフォントサイズ、背景の不透明度を調整可能

### ⚙️ 設定
- コード保持時間の閾値：指を離す際の短い変化を無視して誤認識を防止
- RGBA カラーピッカーでキーの色を細かくカスタマイズ — 白鍵/黒鍵、押下/サステインを個別設定

### 🌐 多言語対応
- 中国語（簡体字）· English · 日本語

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| デスクトップ | Electron 31 |
| UI | React 18 + TypeScript |
| ビルド | electron-vite + Vite |
| データベース | better-sqlite3（オフラインファースト） |
| MIDI | Web MIDI API |
| OBS サーバー | Express 5 + SSE |
| カラーピッカー | react-colorful |
| i18n | i18next + react-i18next |

---

## はじめに

### 動作要件

- [Node.js](https://nodejs.org/) 18 以上
- USB MIDI キーボード（Roland FP-30 で開発・テスト済み）

### インストール & 起動

```bash
git clone https://github.com/luoyeye001/PianoTracker.git
cd PianoTracker
npm install
npm run dev
```

アプリウィンドウが自動的に開きます。USB で MIDI キーボードを接続すると即座に認識されます。

### ビルド

```bash
# Windows インストーラー（.exe）
npm run pack:win

# macOS ディスクイメージ（.dmg）
npm run pack:mac
```

出力ファイルは `dist/` フォルダに生成されます。

---

## OBS の設定

1. PianoTracker を起動
2. OBS で**ブラウザ**ソースを追加
3. URL を `http://localhost:7890/overlay` に設定
4. 幅/高さをキャンバスに合わせて設定（例：1920×1080）
5. 背景色を透明に設定（カスタムカラー → #00000000）
6. アプリの **OBS** タブから表示要素をカスタマイズ

---

## プロジェクト構成

```
src/
├── main/               # Electron メインプロセス
│   ├── index.ts        # アプリエントリー、ウィンドウ作成
│   ├── db.ts           # SQLite スキーマとクエリ
│   ├── ipcHandlers.ts  # IPC チャンネル登録
│   └── obsServer.ts    # Express HTTP + SSE サーバー
├── preload/
│   └── index.ts        # セキュアブリッジ（contextBridge）
└── renderer/src/
    ├── App.tsx          # ルートコンポーネント、OBS 状態配信
    ├── hooks/           # useMidi, usePracticeSession, useSettings, ...
    ├── components/      # RealtimePiano, PianoHeatmap, Sidebar, ...
    ├── pages/           # PracticePage, StatsPage, CalendarPage, ...
    ├── utils/           # コード認識、スケール分析
    └── i18n/            # zh / en / ja 翻訳ファイル

resources/
└── obs-overlay/
    └── index.html      # 独立した OBS オーバーレイページ
```

---

## ロードマップ

### ✅ フェーズ 1 — コア機能（完了）
- MIDI 接続とホットプラグ
- 88 鍵ヒートマップ
- コード認識
- 練習カレンダーと年間ヒートマップ
- 曲目管理
- 多言語 UI

### ✅ フェーズ 3（一部前倒し）
- リアルタイムピアノ・コード・タイマー・連続記録を含む OBS ライブオーバーレイ

### 🔲 フェーズ 2 — 分析機能
- MIDI ファイルのインポートと可視化
- エラー/リズム分析（参照 MIDI との比較）
- 左右手分離分析
- データエクスポート（CSV / JSON）

### 🔲 フェーズ 3 — 高度な機能
- トラッカーボード（Famitracker スタイルのリアルタイムスクロール音符タイムライン）
- Supabase によるクラウド同期（クロスデバイス、セルフホスト対応）

---

## ライセンス

[MIT](LICENSE) © 桃玖
