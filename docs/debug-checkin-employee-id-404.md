# チェックイン画面 employee ID 入力時 404 エラー 調査報告書

**調査日**: 2026-02-24
**対象エンドポイント**: `POST /api/v1/events/{id}/checkin`
**症状**: employee ID を入力してチェックインすると 404 エラーが返る

---

## サーバーログ

```
WARN  request completed with client error
  method: POST
  path: /api/v1/events/78bb1399-c68e-4167-b503-1328980feed8/checkin
  status: 404
  duration_ms: 3
```

---

## 根本原因

`src/app/(admin)/events/[id]/checkin/page.tsx:32-35` のロジックが employee ID に対応していない。

```typescript
const isUUID = UUID_REGEX.test(input);
const checkinData = isUUID
  ? { participant_id: input, method: 'manual' as const }  // UUID → 参加者IDとして送信
  : { qr_code: input, method: 'qrcode' as const };         // 非UUID → QRコードとして送信 ← ここが問題
```

employee ID（例: `EMP001`、`12345`）は UUID 形式でないため、**QRコードとして誤って送信**される。

---

## データフロー

```
入力: "EMP001" (employee ID)
  │
  ├─ UUID_REGEX.test("EMP001") = false
  │
  ↓ { qr_code: "EMP001", method: 'qrcode' } を POST
  │
  ↓ CheckinHandler.CheckInParticipant()
  │   └─ findParticipantForCheckIn() → findParticipantByQRCode()
  │
  ↓ participantRepo.FindByQRCode(ctx, "EMP001")
  │   └─ employee ID はQRコードトークンではないため一致なし
  │
  ↓ apperrors.NotFound("invalid QR code or participant not found")
  │
  → HTTP 404
```

---

## 不足している実装

| レイヤー | 現状 | 必要なもの |
|---|---|---|
| `ParticipantRepository` インターフェース | `FindByQRCode`、`FindByID` のみ | `FindByEmployeeID(ctx, eventID, employeeID)` が未実装 |
| `CheckInRequest` スキーマ | `method`、`qr_code`、`participant_id` のみ | `employee_id` フィールドがない |
| チェックイン Usecase | QRコード・参加者UUID の2方式のみ | employee ID による参加者検索ロジックがない |
| フロントエンド | UUID/非UUID の2分岐のみ | employee ID を識別して適切なフィールドで送信する処理がない |

---

## 修正範囲（サーバー側）

1. **`server/internal/domain/repository/participant_repository.go`**
   `ParticipantRepository` インターフェースに `FindByEmployeeID` を追加

2. **`server/internal/infrastructure/database/participant_repository.go`**
   `FindByEmployeeID` の DB クエリ実装を追加

3. **`server/api/schemas/checkin.yaml`**
   `CheckInRequest` に `employee_id` フィールドを追加

4. **`server/internal/usecase/checkin/types.go`**
   `CheckInInput` に `EmployeeID *string` を追加

5. **`server/internal/usecase/checkin/checkin.go`**
   `findParticipantForCheckIn` に employee ID 検索ロジックを追加

6. **`server/internal/interface/api/handler/checkin.go`**
   `setCheckinMethodFields` で `employee_id` フィールドを処理するよう更新

---

## 修正範囲（フロントエンド側）

7. **`src/app/(admin)/events/[id]/checkin/page.tsx`**
   employee ID パターンを識別して `{ employee_id: input, method: 'manual' }` として送信するよう修正
   （または生成コードの再生成）
