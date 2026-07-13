# Lark認証・Webアプリ組み込み調査メモ

## 公式情報から確認できた事項

LarkのWebアプリログインはOAuth 2.0を基盤としており、Lark Developer Consoleでアプリを作成してApp IDとApp Secretを取得し、Security Settingsに認可コード受信用のRedirect URLを登録する必要がある。

現在推奨されるWebログインは、認可コード取得、認可コードとuser access tokenの交換、ユーザー情報取得、必要に応じたトークン更新の順で行う。旧Web Application SSOは非推奨で、新しいAuthen v1ログイン方式を使う。

Lark内のWebページではシームレスログインが可能であり、Lark 5.1以降は新しいin-app web page向け自動ログイン方式が推奨されている。外部ブラウザではLarkのQRコードまたはアカウント認証が必要になる一方、Larkクライアント内では一時認可コードを取得してアプリ側セッションを確立できる。

Lark内のWebページはApp Centerから開ける。チャット内リンクの場合、モバイルではWebView、PCではシステムブラウザへ遷移する挙動が公式説明にあるため、常にLark内表示させたい場合はWeb Appのアプリ入口として登録する構成が適切と考えられる。

## 参照URL

1. https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/authen-v1/login-overview
2. https://open.larksuite.com/document/server-docs/getting-started/authen-v1/build-login-free-system-
3. https://open.larksuite.com/document/common-capabilities/sso/web-application-sso/web-app-overview?lang=en-US

## 現時点の設計仮説

KAIZEN VISIONは、Lark Developer Consoleで社内アプリとして登録し、公開済みHTTPS URLをWeb Appの入口へ設定する。フロントエンドはLarkクライアント内で一時認可コードを取得し、バックエンドがLark APIと交換してユーザー情報を取得する。取得したLarkユーザーIDをアプリのusersテーブルへ紐付け、既存のJWT／Cookieセッションへ変換する。外部ブラウザから開いた場合は通常のLark OAuthへフォールバックする構成が適切と考えられる。

## 推奨構成

Lark内では、フロントエンドから `tt.requestAccess` を呼び出して有効期間3分・一度限りの一時コードを取得し、コードをKAIZEN VISIONのバックエンドへ送る。バックエンドはLark Authen v1 APIでコードを交換し、Larkユーザー情報を取得した後、アプリ独自のHttpOnly Cookieセッションを発行する。Lark外のブラウザからアクセスする可能性を残す場合は、通常のLark Web OAuthをフォールバックとして用意する。

| 対象 | 変更内容 |
|---|---|
| Lark Developer Console | 企業自建アプリを作成し、Web App能力、ホームURL、Redirect URL、必要な権限を設定する |
| フロントエンド | Manusの `startLogin()` をLarkクライアント判定、`tt.requestAccess`、外部ブラウザ用Lark OAuth開始処理へ置換する |
| バックエンド | Larkコード交換、ユーザー情報取得、コールバック、独自セッション発行処理を追加する |
| 認証コンテキスト | Manus SDK依存のユーザー同期を外し、検証済み独自JWTからDBユーザーを解決する |
| データベース | `openId` を汎用の外部IDへ置換するか、`authProvider` と `providerUserId` を追加する。既存投稿との関係を保持するためusersの数値IDは変えない |
| 管理者判定 | Manusの `OWNER_OPEN_ID` 依存を、Lark user_id/open_idまたは管理者許可リストへ変更する |
| Secrets | `LARK_APP_ID`、`LARK_APP_SECRET`、必要に応じてLark Redirect URI関連設定を追加する |

## 移行上の注意点

既存のManusユーザーとLarkユーザーを自動的に同一人物と断定すると、投稿・コメントの所有者が誤って紐付く可能性がある。安全な移行は、管理者が既存ユーザーIDとLarkユーザーIDの対応表を確定し、users行を維持したままLark識別子を追加する方式である。また、Lark内WebViewではCookie制約を考慮し、現在と同様に `Secure`、`HttpOnly`、`SameSite=None` のセッションCookieを維持し、必要ならAuthorizationヘッダーによる補助経路を残す。

## 追加参照URL

4. https://open.larksuite.com/document/uYjL24iN/uUzMuUzMuUzM/requestaccess
5. https://open.larksuite.com/document/client-docs/h5/development-guide/step1

## Authen v1 API実装メモ

通常ブラウザの認可開始URLとして、Lark公式は `GET https://open.larksuite.com/open-apis/authen/v1/index` を示している。`redirect_uri`、`app_id`、任意の `state` を指定し、Lark Developer ConsoleのSecurity SettingsへRedirect URLを事前登録する。認可後はRedirect URLへ `code` と元の `state` が付与される。認可コードは一度だけ使用でき、有効期限がある。

旧OIDCコード交換APIは `POST https://open.larksuite.com/open-apis/authen/v1/oidc/access_token` であるが、2025年6月26日時点の公式ページでは非推奨とされている。最新APIは `POST https://open.larksuite.com/open-apis/authen/v2/oauth/token` で、JSON本文へ `grant_type: "authorization_code"`、`client_id`、`client_secret`、`code`、Web OAuthでは `redirect_uri`、PKCE利用時は `code_verifier` を渡す。通常ブラウザの認可URLは `https://accounts.larksuite.com/open-apis/authen/v1/authorize` を用い、PKCE S256とstate検証を組み合わせる。ユーザー情報は `GET https://open.larksuite.com/open-apis/authen/v1/user_info` へuser access tokenをBearerで送って取得する。

トークンAPIの `code` は文字列の `"0"` で成功し、`access_token`、`expires_in`、`refresh_token`、`refresh_token_expires_in`、`scope`、`token_type` を返す。認可コードは5分間・一度限りであり、ユーザーがアプリの利用権限を持たない場合、App ID／Secret不正、Redirect URI不一致、PKCE失敗、アプリ未有効化を個別エラーとして扱う。KAIZEN VISIONは永続的なLark API代理操作を必要としないため、`offline_access` とrefresh token保存は初期実装では要求しない。

6. https://open.larksuite.com/document/server-docs/getting-started/authen-v1/api/request-authentication
7. https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/authen-v1/oidc-access_token/create
8. https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/authentication-management/access-token/get-user-access-token

## Web App設定と表示方式

Lark Developer Consoleでは企業自建アプリへ「Web App」能力を追加し、公開HTTPSのWebアプリホームURLを設定する。Lark V7.4以降では、デスクトップホームと新規ページをLark内タブで開くか通常ブラウザで開くかを管理画面で選択できる。KAIZEN VISIONはホームをLark内表示にしつつ、同じ公開URLを通常ブラウザから直接開いた場合もLark OAuthへフォールバックする。

9. https://open.larksuite.com/document/client-docs/h5/development-guide/step1

## 実装で採用したOAuth v2フロー

コード交換には `POST https://open.larksuite.com/open-apis/authen/v2/oauth/token` を使用する。JSON本文へ `grant_type: "authorization_code"`、`client_id`（App ID）、`client_secret`（App Secret）、`code` を送り、通常ブラウザOAuthでは認可開始時と完全一致する `redirect_uri` も送る。成功時はトップレベルの `code: "0"` と `access_token` を確認する。Lark内の `tt.requestAccess` で取得したコードはリダイレクトURIに結び付かないため、コード交換時に `redirect_uri` を送らない。

ユーザー情報は `GET https://open.larksuite.com/open-apis/authen/v1/user_info` を `Authorization: Bearer {user_access_token}` で呼び出す。取得した `data.open_id` は `lark:{open_id}` に名前空間化して `users.openId` へ保存する。既存Manusユーザーとは紐付けず、Larkで初回ログインした時点で別ユーザーとして作成する。

10. https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/authentication-management/access-token/get-user-access-token

## 最小権限ログインの確定事項

`GET /open-apis/authen/v1/user_info` はAPI自体の必須scopeがなく、氏名・アバター・`open_id`・`union_id`などの基本ログイン情報を取得できる。メール、携帯番号、雇用情報、`user_id`などの機微フィールドのみ個別のフィールドscopeを必要とする。本アプリではユーザー識別に `open_id`、表示に氏名・アバターのみを使用するため、追加の連絡先scopeは要求しない。

Larkクライアント内の `tt.requestAccess` は `scopeList` が必須だが、空配列 `[]` を渡すと「ユーザー資格情報の取得のみ」を許可する。ウェブアプリでは `appID` が必須で、Lark 6.9.0以降で利用できる。また、公式ガイドでは `window.h5sdk.ready` のコールバック後に呼び出すことが前提とされる。

通常ブラウザOAuthの認可URLでも、基本ユーザー情報だけを使う場合は追加scopeを付けない。不要なscopeを認可URLへ付け、Developer Console側で未申請の場合はエラー20027の原因になるため、最小権限とする。

Lark公式H5 JSSDKの現行例はバージョン1.5.44で、配信URLは `https://lf-package-sg.larksuitecdn.com/obj/lark-static-sgsaas/lark/op/h5-js-sdk-1.5.44.js`。2026年7月13日時点でHTTP 200およびJavaScript MIMEタイプを確認した。

11. https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/authen-v1/authen/user_info
12. https://open.larksuite.com/document/common-capabilities/sso/api/obtain-oauth-code
13. https://open.larksuite.com/document/uYjL24iN/uUzMuUzMuUzM/requestaccess
14. https://open.larksuite.com/document/uYjL24iN/uMTMuMTMuMTM/development-guide/webapp-incremental-authorization-access-guide
15. https://open.larksuite.com/document/client-docs/h5/introduction?from=home
