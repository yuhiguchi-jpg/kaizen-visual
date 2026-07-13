# 本番画像障害の調査記録

調査日: 2026-07-13

## 実通信で確認した事実

- 本番ドメイン: `https://kaizenapp-7fhzykvl.manus.space`
- `GET /api/oauth/lark/config` は HTTP 200 で、Lark App ID と state を返す。
- `GET /api/oauth/lark/start` は HTTP 302 で、同じ本番ドメインの `/api/oauth/lark/callback` を redirect_uri として Lark の認可画面へ遷移する。
- `__Host-oauth_state` は `Secure; HttpOnly; SameSite=Lax; Path=/` で発行される。
- 本番DBには 2026-07-13 07:34:09 作成の画像付き下書きがあり、新規画像生成とDB保存自体は本番で少なくとも1回成功している。
- 実画像 `https://kaizenapp-7fhzykvl.manus.space/manus-storage/generated/1783928098015_3fe03fb5.png` は、アプリのExpressルートより前段で HTTP 307 に変換され、CloudFront署名URLへ転送される。
- CloudFrontは HTTP 200、2,283,697 bytes、実体は 1536×1024 PNG を返すが、`Content-Type: application/octet-stream` と `X-Content-Type-Options: nosniff` が付く。

## 根因候補

`/manus-storage/*` は本番プラットフォームの予約経路としてアプリのExpress処理より前段で処理されるため、アプリ側で追加した正しいMIMEタイプのストリーミング処理が本番では実行されていない。Lark WebViewなどの厳格なクライアントでは、`application/octet-stream` と `nosniff` の組み合わせによりPNGを画像として描画できない可能性が高い。

## 修正方針

プラットフォーム予約パスを避け、アプリ管理下の `/api/storage/*` で署名URLから画像を取得し、拡張子または上流ヘッダーから正しい `Content-Type` を付けて返す。新規保存URLは `/api/storage/*` に変更し、既存DBの `/manus-storage/*` は表示時またはAPI返却時に互換変換する。

## Lark認証の追加調査

Lark公式のログイン不要Webアプリ例では、Lark内の `tt.requestAccess` が返すログイン事前認可codeは、通常ブラウザOAuth用のv2 OAuth token endpointではなく、app access tokenをAuthorizationに付けて `POST /open-apis/authen/v1/access_token` へ渡して user access tokenへ交換する。現行実装は通常ブラウザとLark内の両codeを `POST /open-apis/authen/v2/oauth/token` で交換しており、Lark内ログイン失敗の有力な原因候補である。

また公式ガイドでは、`tt.requestAccess` が存在しない場合、または `errno === 103`（クライアントが古い）では `tt.requestAuthCode` へフォールバックする必要がある。現行実装はブラウザOAuthへ遷移しており、Lark内のログイン不要導線を維持できない。

参考資料:

- https://open.larksuite.com/document/uYjL24iN/uUzMuUzMuUzM/requestaccess
- https://open.larksuite.com/document/home/quickly-create-a-login-free-web-app/introduction-to-sample-code
- https://open.larksuite.com/document/client-docs/h5/development-guide/step-3
- https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/authen-v1/access_token/create

## 実施した修正

画像配信は、新規保存URLをプラットフォーム予約経路ではない `/api/storage/*` へ変更した。アプリのExpressルートが署名URLから画像バイトを取得し、PNGなどの正しい `Content-Type` と `nosniff` を付けて返す。既存DBに保存済みの `/manus-storage/*` URLは、公開一覧APIから返す際に `/api/storage/*` へ互換変換するため、データ移行や再生成は不要である。

Lark内ログインは、`tt.requestAccess` または `tt.requestAuthCode` のcodeを、最初に取得したapp access tokenとともに `POST /open-apis/authen/v1/access_token` へ渡す専用交換処理へ分離した。通常ブラウザのOAuth callbackは、従来どおりv2 OAuth token endpointを使用する。旧Larkクライアントでは `tt.requestAuthCode` へフォールバックする。

## 検証結果

通常の全回帰試験は **61件成功、2件は明示実行型の統合試験としてスキップ**、TypeScript型検査と本番ビルドも成功した。さらに統合試験を明示実行し、Forgeのモデル取得、S3への保存・再取得、実際の `MODEL_GPT_IMAGE_2` 画像生成・保存の **2件が成功**した。これにより、Forge資格情報と画像生成サービス自体は正常であり、主障害は画像配信URLとLark内code交換方式の本番差分にあると判断した。
