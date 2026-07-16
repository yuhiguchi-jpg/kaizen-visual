# KAIZEN VISIONからLark Baseへの共有・移行方法

**作成日:** 2026-07-14  
**作成者:** Manus AI

## 結論

**実現可能です。** 現在のMySQL/TiDBに保存されている改善事例、ユーザー、気づき、コメント、いいね、リアクションは、Lark Baseのテーブルとレコードに変換できます。Lark Base OpenAPIは、カスタムアプリからのレコード作成・更新、フィールド操作、添付ファイル登録に対応しています。[1] [2]

KAIZEN VISIONには、外部キー、認証用ユーザー情報、コメント・いいね、AI生成画像などがあるため、**既存DBを正本として残し、Lark Baseを閲覧・集計・社内共有用のミラーとして使う一方向同期**が最も安全です。最初に既存データを一括登録し、その後は改善事例の作成・更新・公開・削除時にLark Baseへ反映します。

> **推奨方針:** 「KAIZEN VISIONで入力・編集し、Lark Baseで共有・集計する」構成から始める。Lark Baseでの編集も必要になった場合だけ、変更イベントを使った双方向同期へ拡張する。

## 方式比較

| 方式 | 実現方法 | 長所 | 主な注意点 | 難易度・推奨度 |
|---|---|---|---|---|
| **一括移行のみ** | DBからCSVまたはAPI用JSONを生成し、Lark Baseへ一度だけ登録する | 最短で共有を開始でき、運用変更が少ない | 移行後の更新は自動反映されない。画像添付やテーブル間リンクは追加処理が必要 | **低／短期用途に推奨** |
| **一方向同期：KAIZEN VISION → Lark Base** | 初回一括登録後、アプリ内の作成・更新・削除処理からLark Base APIを呼ぶ | 既存アプリの機能・整合性を維持しつつ、Lark内で閲覧・集計できる | API失敗時の再試行、重複防止、Lark側での不用意な直接編集を制御する必要がある | **中／最推奨** |
| **Lark Baseを正本にする** | MySQL/TiDBを廃止または縮小し、アプリがLark Base APIを直接読み書きする | データの所在をLarkに一本化できる | API制限、応答速度、複雑なリレーション、認証情報、コメント・いいね等の高頻度更新に影響される | **高／現時点では非推奨** |
| **双方向同期** | 上記の一方向同期に加え、Lark Baseのレコード変更イベントを受信し、DBへ反映する | アプリとLark Baseのどちらからでも編集できる | 同時編集の競合、更新ループ、削除処理、権限判定、イベント重複排除が必要 | **最高／明確な必要性が出た後** |

Lark Baseにはレコード追加・編集・削除を通知する変更イベントがあり、双方向同期自体は技術的に可能です。ただし、数式フィールド値の変化はレコード変更イベントを発火しません。[3] また、イベント受信側は3秒以内にHTTP 200を返し、再送されるイベントを`event_id`で重複排除する必要があります。[4]

## 推奨するデータ構成

全DBを共有する場合は、現行テーブルをLark Base内の複数テーブルへ対応付けます。単に改善事例を社内共有したい場合は、まず「改善事例」1テーブルだけを同期するのが適切です。

| 現行DB | Lark Base候補 | 主な項目 | 移行上の扱い |
|---|---|---|---|
| `improvement_cases` | 改善事例 | 元DB ID、タイトル、作成者、改善前、課題、解決策、Before秒、After秒、頻度、年間削減時間、状態、制作物URL、画像、作成・公開日時 | **最初に同期する中心テーブル**。年間削減時間は数値として同期し、表示用の時・分・秒文字列も追加可能 |
| `users` | ユーザー | 元DB ID、LarkユーザーID、氏名、メール、役割 | 個人フィールドに直接変換できない場合に備え、文字列IDと氏名を保持 |
| `insights` | 気づき | 元DB ID、作成者、ジャンル、本文、日時 | 改善事例と別テーブルで共有 |
| `insight_comments` | 気づきコメント | 元DB ID、気づきID、作成者、本文、日時 | 気づきへのリンクレコードまたは文字列IDで関連付け |
| `insight_likes` | 気づきいいね | 元DB ID、気づきID、ユーザーID、日時 | 明細同期より、気づき側の集計値だけ同期する構成も選択可能 |
| `insight_reactions` | 気づきリアクション | 元DB ID、気づきID、ユーザーID、種別、日時 | 件数集計だけを共有する方がLark Baseで扱いやすい場合がある |

現行DBの整数主キーは、Lark Base側に**「元DB ID」**として必ず保存します。さらに同期管理用として、DB側に`lark_record_id`、最終同期日時、同期状態、最終エラーを保持すると、更新時の照合と再試行が安全になります。

## 推奨方式の実現手順

### 1. Lark Base側を準備する

Lark Baseに「改善事例」テーブルを作成し、文字列、数値、日時、単一選択、URL、添付ファイル等のフィールドを用意します。バックエンド同期には、利用者個人の権限に左右されにくい`tenant_access_token`を使う構成が適しています。ただし、Larkアプリを対象Baseの所有者または共同編集者に追加し、レコード追加またはBase管理権限を付与する必要があります。高度な権限を有効にしているBaseでは、アプリを含むグループに読み書き権限を与える必要があります。[1] [5]

設定値として、Larkの`app_token`、`table_id`、必要に応じてフィールドIDを環境変数または安全な設定領域に保存します。認証情報をソースコードやLark Baseのセルへ保存してはいけません。

### 2. 既存データを一括登録する

DBから対象データを読み出し、Lark Baseのフィールド型に合わせて変換します。Larkの一括作成APIは1回500レコードまでで、バッチ処理は全件成功または全件失敗です。[1] [5] そのため、例えば100〜300件単位に分け、失敗バッチを再試行できる形にします。

ユーザーなど参照先のテーブルを先に登録し、そのLarkレコードIDを取得してから、改善事例やコメントのリンクフィールドを設定します。単純な社内共有が目的なら、初期段階ではリンクレコードを使わず、「作成者名」「元ユーザーID」を通常フィールドとして保存すると移行が容易です。

### 3. 新規・更新・削除を同期する

KAIZEN VISIONで改善事例の保存が成功した後、同じレコードをLark Baseへ作成または更新します。同期処理が失敗してもアプリ本体の保存を取り消さず、未同期状態として記録して再試行する構成が安全です。

Lark Baseは同一テーブルに対する並行書き込みをサポートせず、書き込み競合エラーを返すことがあります。[1] そのため、Larkへの書き込みはキューで直列化し、429または一時エラー時には待機時間を尊重して再試行します。OpenAPIのレート制限はAPI・アプリ・テナント単位で異なり、超過時はHTTP 429と`x-ogw-ratelimit-reset`が返されます。[6]

### 4. 定期照合を追加する

日次など低頻度で、DBの`updatedAt`とLark側の同期状態を照合し、漏れた更新を再送します。通常の更新はイベント直後に反映し、定期照合は障害時の保険として使います。

## 画像の扱い

現行の`imageUrl`をLark BaseのURLフィールドへそのまま入れる方法が最も簡単です。ただし、URLが認証必須または一時署名URLの場合、Lark Base上で後から閲覧できない可能性があります。

Lark Baseの添付フィールドへ恒久的にコピーする場合は、画像データをLark DriveのメディアアップロードAPIへ送り、取得した`file_token`をレコードの添付フィールドへ設定します。これは「画像アップロード」と「レコード更新」の2段階処理です。[2] APIで登録する添付は、同じアプリがアップロードしたファイルでなければ拒否される場合があります。[1]

| 画像方式 | 適する状況 | 注意点 |
|---|---|---|
| URLフィールド | 早く共有を開始したい、画像URLが恒久・社内アクセス可能 | URLの失効、認証、公開範囲を確認する |
| Lark添付へコピー | Lark Base内だけで確実に表示・保管したい | アップロードAPI、容量、再アップロード防止、削除時の扱いが必要 |

## Lark Baseを正本にする場合の追加課題

Lark Base APIの公式エラー定義には、1テーブルあたり20,000レコード、1回500レコードの上限が示されています。ただし、契約プランや今後の仕様変更で実効上限が変わる可能性があるため、導入時に対象テナントで確認が必要です。[1] また、Baseを正本にすると、ユーザー、投稿、コメント、いいね、リアクションの外部キー制約や削除連鎖をアプリ側で再実装する必要があります。

このため、**改善事例の共有・集計が主目的なら、Lark Baseはミラーとし、認証・権限・AI画像生成・コメント等の業務ロジックはKAIZEN VISIONに残す**方が、保守性とデータ整合性のバランスが良くなります。

## 最終推奨案

第一段階は、改善事例テーブルのみを対象に、次の構成で開始することを推奨します。

1. 現行MySQL/TiDBを正本として維持する。
2. Lark Baseに「改善事例」テーブルを作る。
3. 既存改善事例を一括登録する。
4. 新規作成・更新・公開・削除を一方向同期する。
5. 画像は最初はURLで共有し、必要ならLark添付へコピーする。
6. Lark Base側は原則閲覧・集計用とし、直接編集は制限する。
7. Lark側での編集要望が明確になった時点で、レコード変更イベントと競合ルールを追加する。

この構成なら、現行アプリの動作を変えずにLark内での閲覧・分析を実現でき、将来の双方向同期にも段階的に拡張できます。

## References

[1]: https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-table-record/batch_create "Lark Developer — Create records"
[2]: https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/attachment "Lark Developer — Attachment Field"
[3]: https://open.larksuite.com/document/server-docs/docs/drive-v1/event/list/bitable-record-changed "Lark Developer — Bitable Record Changed"
[4]: https://open.larksuite.com/document/server-docs/event-subscription/overview-of-event-subscription "Lark Developer — Event Overview"
[5]: https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/bitable/notification "Lark Developer — Base OpenAPI Access Guide"
[6]: https://open.larksuite.com/document/ukTMukTMukTM/uUzN04SN3QjL1cDN "Lark Developer — Rate limits"
[7]: https://www.larksuite.com/hc/en-US/articles/661148936282-use-webhook-triggers-in-automations "Lark Help Center — Use webhook triggers in automations"
