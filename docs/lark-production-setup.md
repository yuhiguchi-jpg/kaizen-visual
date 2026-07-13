# KAIZEN VISION — Lark認証 本番設定・確認ガイド

**作成者:** Manus AI  
**更新日:** 2026年7月13日

## 1. 実装済みの認証構成

KAIZEN VISIONは、Lark企業自建アプリの利用者を認証元とする構成へ移行済みです。通常ブラウザではLark OAuth認可画面へ遷移し、Larkデスクトップ／モバイルアプリ内ではH5 JSSDKの `h5sdk.ready` 完了後に `tt.requestAccess` を呼びます。取得した一時コードはサーバーで `user_access_token` に交換し、Larkの `user_info` APIから取得した `open_id` をアプリ内ユーザーIDとして保存します。

| 利用経路 | 認証方法 | ユーザー操作 |
|---|---|---|
| 通常ブラウザ | Lark OAuth認可URL → コールバック | 初回はLarkへのログインまたは同意が必要 |
| Larkデスクトップ／モバイル内 | H5 JSSDK `tt.requestAccess` | Larkクライアント内で認証。追加権限は要求しない |
| 認証後セッション | HttpOnly Cookie | Authorization Bearerフォールバックは使用しない |

Larkの `user_info` APIは基本ログイン情報の取得に必須scopeを要求しません。追加scopeが必要なのはメール、携帯番号、雇用情報、`user_id`などの機微フィールドです。[1] 本アプリは基本認証に `open_id`、氏名、アバターを使用するため、通常ブラウザの認可URLには `scope` を付けず、Lark内の `requestAccess` には空の `scopeList: []` を渡します。Lark公式仕様でも、空配列はユーザー資格情報の取得だけを許可する構成とされています。[2] [3]

## 2. Lark Developer Consoleの設定値

[Lark Developer Console](https://open.larksuite.com/app)で対象の企業自建アプリを開き、以下の値を登録してください。URLは**完全一致**で入力します。特にコールバックURLの末尾やパスが異なるとOAuthが失敗します。Lark公式仕様でも、認可に指定する `redirect_uri` を事前に安全設定のリダイレクトURLへ登録する必要があります。[4]

| 設定項目 | 登録値 |
|---|---|
| PC版ホームページURL | `https://kaizenapp-7fhzykvl.manus.space/` |
| モバイル版ホームページURL | `https://kaizenapp-7fhzykvl.manus.space/` |
| 通常ブラウザOAuthコールバック | `https://kaizenapp-7fhzykvl.manus.space/api/oauth/lark/callback` |
| Lark内で `requestAccess` を呼ぶページ | `https://kaizenapp-7fhzykvl.manus.space/` |
| Webアプリのドメイン入力欄がある場合 | `kaizenapp-7fhzykvl.manus.space` |

Developer Consoleのメニュー名は表示言語やコンソール更新により多少異なる場合がありますが、設定順は次のとおりです。

| 順序 | 設定場所 | 実施内容 |
|---:|---|---|
| 1 | Credentials & Basic Info | App IDがKAIZEN VISIONへ登録済みのApp IDと一致することを確認する |
| 2 | Add Features / Web App | PC版・モバイル版のホームページURLを上表のURLへ設定する |
| 3 | Development Configuration / Security Settings | コールバックURLと、Lark内で認証を開始するホームページURLをリダイレクトURL一覧へ追加する |
| 4 | Permissions & Scopes | 基本ログインだけなら追加scopeを申請しない。メール等が必要になった時だけ個別に申請する |
| 5 | Version Management & Release | 新しいバージョンを作成し、利用可能範囲を設定して企業内へ公開する |

> **重要:** `requestAccess` に渡す権限がDeveloper Console側で未申請の場合、Larkは認可エラーを返します。今回は空scopeで基本ログインだけを行うため、連絡先閲覧権限などを追加する必要はありません。[2] [4]

## 3. Secretsの接続状況

KAIZEN VISIONには `LARK_APP_ID`、`LARK_APP_SECRET`、`LARK_REDIRECT_URI` を登録済みです。App ID／App SecretはLarkの実APIでtenant access tokenを取得する統合テストにより有効性を確認済みで、App Secret自体はコードやドキュメントへ保存していません。

| 環境変数 | 状態 | 用途 |
|---|---|---|
| `LARK_APP_ID` | 接続・実API検証済み | OAuthおよびLark内H5認証のアプリ識別 |
| `LARK_APP_SECRET` | 接続・実API検証済み | サーバー側の認可コード交換 |
| `LARK_REDIRECT_URI` | 接続済み | 通常ブラウザOAuthのコールバック完全URL |

## 4. 公開後の受入確認

Developer Consoleの設定を保存・公開した後、通常ブラウザとLark内の両方で確認します。OAuth認可コードは短時間のみ有効で、1回だけ使用できるため、失敗したコードを再利用せず、ログインを最初からやり直してください。[4]

| テスト | 操作 | 合格条件 |
|---|---|---|
| 通常ブラウザ | シークレットウィンドウでアプリを開き、「Larkでログイン」を押す | Lark認可後にアプリへ戻り、ログイン済み表示になる |
| Larkデスクトップ | LarkのワークプレイスからKAIZEN VISIONを開く | 外部ブラウザへ移動せず、Lark内でログインが完了する |
| Larkモバイル | Larkモバイルのワークプレイスから開く | H5画面内でログインが完了し、投稿一覧を利用できる |
| ログアウト | ユーザーメニューからログアウトする | セッションCookieが削除され、再度ログイン画面になる |
| 別ユーザー | 別のLark企業ユーザーでログインする | 別の `lark:open_id` を持つ新規ユーザーとして登録される |

## 5. 既存データの扱い

今回の「引き継がない」は、**旧ユーザーIDとLarkユーザーIDを自動対応付けしない**方針として実装しています。既存ユーザーや既存投稿の削除は行っていません。データ削除は復元できない可能性があるため、明示的な確認なしには実行していません。

| 対象 | 現在の扱い |
|---|---|
| 旧ユーザー | Larkユーザーへ自動統合しない |
| Larkで初回ログインしたユーザー | `lark:{open_id}` の新規ユーザーとして登録する |
| 既存投稿・コメント・いいね | データベースに保持する |
| 既存投稿の表示 | 現行の公開範囲ルールに従うため、新しいLarkユーザーから見える場合がある |

既存投稿も含めて完全な初期状態にしたい場合は、削除対象とバックアップ方針を別途確定してからデータクリーンアップを行ってください。

## 6. 実装検証結果

認証変更後に、Lark OAuth URL、v2トークン交換、ユーザー情報正規化、空scope、JSSDK ready待機、Cookie限定セッション、App ID／Secretの実API接続を含むVitestを実行しました。2026年7月13日時点で**12テストファイル・51テストが成功**し、TypeScript型検査と本番ビルドも成功しています。ビルドではJavaScriptチャンクサイズに関する性能上の警告が1件ありますが、認証機能やビルド成功を妨げるエラーではありません。

## References

[1]: https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/authen-v1/authen/user_info "Obtain login user information — Lark Developer"

[2]: https://open.larksuite.com/document/uYjL24iN/uUzMuUzMuUzM/requestaccess "requestAccess — Lark Developer"

[3]: https://open.larksuite.com/document/uYjL24iN/uMTMuMTMuMTM/development-guide/webapp-incremental-authorization-access-guide "Lark client web app end user consent guide — Lark Developer"

[4]: https://open.larksuite.com/document/common-capabilities/sso/api/obtain-oauth-code "Obtain OAuth code — Lark Developer"
