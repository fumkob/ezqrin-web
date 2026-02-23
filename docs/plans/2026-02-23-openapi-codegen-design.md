# OpenAPI コード自動生成設計書

**作成日**: 2026-02-23
**ステータス**: 承認済み

## 概要

`ezqrin-server` を git submodule として追加し、その OpenAPI 仕様から orval を使って TypeScript の型定義・API 関数・TanStack Query フックを自動生成する。生成コードを各リクエストで使用するよう既存コードを置き換える。

## アーキテクチャ

### ディレクトリ構造

```
ezqrin-web/
├── server/                          # git submodule (ezqrin-server)
│   └── api/
│       └── openapi.yaml             # OpenAPI 仕様のエントリポイント
├── src/
│   ├── lib/
│   │   ├── api/
│   │   │   └── client.ts            # 既存の認証付き fetch ラッパー（維持）
│   │   └── generated/               # orval が生成するコード (.gitignore 対象)
│   │       ├── model/               # 型定義 (スキーマから生成)
│   │       ├── events.ts            # Events API 関数 + Query フック
│   │       ├── participants.ts      # Participants API 関数 + Query フック
│   │       ├── auth.ts              # Auth API 関数
│   │       └── checkins.ts          # Checkins API 関数 + Query フック
│   └── types/
│       └── api.ts                   # 削除 → generated/model/ に統合
├── orval.config.ts                  # orval 設定ファイル
└── package.json
```

### データフロー

1. `npm run generate` 実行
2. orval が `server/api/openapi.yaml`（$ref 解決含む）を読み込む
3. `src/lib/generated/` に TypeScript コードを生成
4. 生成されたコードが `apiFetch` を mutator として利用（JWT 認証・リフレッシュを自動的に通す）

## 技術選定

**コード生成ツール**: orval

- TanStack Query v5 フックを直接生成できる
- mutator オプションで既存の `apiFetch` を統合可能
- `tags-split` モードでタグごとにファイルを分割できる
- $ref を含む複数ファイル OpenAPI 仕様に対応

## orval 設定

```ts
// orval.config.ts
export default {
  ezqrin: {
    input: './server/api/openapi.yaml',
    output: {
      mode: 'tags-split',
      target: './src/lib/generated',
      schemas: './src/lib/generated/model',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/lib/api/client.ts',
          name: 'apiFetch',
        },
      },
    },
  },
}
```

## 移行方針

| ファイル | 対応 |
|----------|------|
| `src/types/api.ts` | **削除** — `src/lib/generated/model/` に統合 |
| `src/lib/api/events.ts` | **削除** — 生成物に置き換え |
| `src/lib/api/participants.ts` | **削除** — 生成物に置き換え |
| `src/lib/api/checkins.ts` | **削除** — 生成物に置き換え |
| `src/lib/api/auth.ts` | **部分維持** — setTokens/clearTokens の呼び出しを生成関数のラッパーとして残す |
| `src/lib/api/client.ts` | **維持** — mutator として機能し続ける |
| `src/hooks/` | **削除候補** — orval が TanStack Query フックを生成するため不要 |
| 各コンポーネント/ページ | **import パス更新** — `@/types/api` → `@/lib/generated/model` |

## npm スクリプト

```json
{
  "scripts": {
    "generate": "orval"
  }
}
```

## .gitignore 追加

```
src/lib/generated/
```

## 追加依存パッケージ

```json
{
  "devDependencies": {
    "orval": "^7.x"
  }
}
```

## 制約・注意事項

- `apiFetch` の型シグネチャを orval の mutator に合わせて調整が必要な場合がある
- auth エンドポイントの `setTokens` 呼び出しはログイン・リフレッシュ処理に必要なため、ラッパーで維持
- submodule 初期化は `git submodule update --init` で行う
