# SAML 認証フロー解説

このドキュメントでは、本プロジェクトで実装されている SAML 2.0 認証のフローと、メタデータの構造・交換の仕組みについて解説します。

## 目次

1. [SAML 認証フロー](#saml-認証フロー)
2. [メタデータの構造](#メタデータの構造)
3. [このプロジェクトでの実装](#このプロジェクトでの実装)
4. [メタデータの手動設定方法](#メタデータの手動設定方法)
5. [署名と証明書](#署名と証明書)
6. [Keycloak と realm-export.json](#keycloak-と-realm-exportjson)
7. [デバッグ](#デバッグ)

---

## SAML 認証フロー

### SP-Initiated SSO（本プロジェクトで使用）

```txt
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Browser │         │    SP    │         │   IdP    │
│          │         │ :3000    │         │  :8080   │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │ 1. GET /login      │                    │
     │───────────────────>│                    │
     │                    │                    │
     │ 2. 302 Redirect    │                    │
     │   SAMLRequest      │                    │
     │<───────────────────│                    │
     │                    │                    │
     │ 3. GET /protocol/saml?SAMLRequest=...   │
     │────────────────────────────────────────>│
     │                    │                    │
     │ 4. ログイン画面表示                      │
     │<────────────────────────────────────────│
     │                    │                    │
     │ 5. ユーザー認証（ID/PW入力）             │
     │────────────────────────────────────────>│
     │                    │                    │
     │ 6. 302 + Auto-POST Form                 │
     │   SAMLResponse (HTML form)              │
     │<────────────────────────────────────────│
     │                    │                    │
     │ 7. POST /acs       │                    │
     │   SAMLResponse     │                    │
     │───────────────────>│                    │
     │                    │                    │
     │                    │ 8. 署名検証         │
     │                    │    属性抽出         │
     │                    │                    │
     │ 9. 302 /profile    │                    │
     │<───────────────────│                    │
     │                    │                    │
     │ 10. ログイン完了   │                    │
     │<───────────────────│                    │
```

### 各ステップの詳細

| Step | 説明                                            | 実装箇所                    |
| ---- | ----------------------------------------------- | --------------------------- |
| 1    | ユーザーが「Login with SAML」をクリック         | `GET /login`                |
| 2    | SP が AuthnRequest を生成し、IdP へリダイレクト | `src/routes/index.ts:55-60` |
| 3    | ブラウザが IdP の SSO エンドポイントへ移動      | Keycloak                    |
| 4-5  | IdP でユーザー認証                              | Keycloak ログイン画面       |
| 6    | IdP が SAMLResponse を含む HTML フォームを返す  | Keycloak                    |
| 7    | ブラウザが SP の ACS へ POST                    | `POST /acs`                 |
| 8    | SP が署名を検証し、属性を抽出                   | `src/routes/index.ts:64-90` |
| 9-10 | 認証成功、プロフィール画面へ                    | セッション保存              |

---

## メタデータの構造

### IdP メタデータ

IdP メタデータは、IdP の情報を SP に伝えるための XML ドキュメントです。

**取得 URL:** `http://localhost:8080/realms/myrealm/protocol/saml/descriptor`

```xml
<md:EntityDescriptor entityID="http://localhost:8080/realms/myrealm">
  <md:IDPSSODescriptor>

    <!-- 署名検証に使う公開鍵証明書 -->
    <md:KeyDescriptor use="signing">
      <ds:X509Certificate>MIIDBT...</ds:X509Certificate>
    </md:KeyDescriptor>

    <!-- SSO エンドポイント（ログイン先） -->
    <md:SingleSignOnService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
      Location="http://localhost:8080/realms/myrealm/protocol/saml"/>
    <md:SingleSignOnService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="http://localhost:8080/realms/myrealm/protocol/saml"/>

    <!-- SLO エンドポイント（ログアウト先） -->
    <md:SingleLogoutService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
      Location="http://localhost:8080/realms/myrealm/protocol/saml"/>

    <!-- サポートする NameID 形式 -->
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</md:NameIDFormat>

  </md:IDPSSODescriptor>
</md:EntityDescriptor>
```

**重要な要素:**

| 要素                  | 説明                     | 用途                           |
| --------------------- | ------------------------ | ------------------------------ |
| `entityID`            | IdP の一意識別子         | SAMLResponse の Issuer と照合  |
| `X509Certificate`     | 署名検証用の公開鍵証明書 | SAMLResponse の署名検証        |
| `SingleSignOnService` | SSO エンドポイント URL   | AuthnRequest の送信先          |
| `Binding`             | 通信方式                 | HTTP-Redirect または HTTP-POST |

### SP メタデータ

SP メタデータは、SP の情報を IdP に伝えるための XML ドキュメントです。

**取得 URL:** `http://localhost:3000/metadata`

```xml
<md:EntityDescriptor entityID="http://localhost:3000/metadata">
  <md:SPSSODescriptor AuthnRequestsSigned="true" WantAssertionsSigned="true">

    <!-- SP の署名証明書（オプション） -->
    <md:KeyDescriptor use="signing">
      <ds:X509Certificate>...</ds:X509Certificate>
    </md:KeyDescriptor>

    <!-- ACS: SAMLResponse を受け取るエンドポイント -->
    <md:AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="http://localhost:3000/acs"
      index="0"/>

    <!-- SLO: ログアウト要求を受け取るエンドポイント -->
    <md:SingleLogoutService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
      Location="http://localhost:3000/slo"/>

  </md:SPSSODescriptor>
</md:EntityDescriptor>
```

**重要な要素:**

| 要素                       | 説明                     | 用途                     |
| -------------------------- | ------------------------ | ------------------------ |
| `entityID`                 | SP の一意識別子          | IdP でのクライアント識別 |
| `AssertionConsumerService` | ACS URL                  | SAMLResponse の POST 先  |
| `AuthnRequestsSigned`      | リクエストに署名するか   | セキュリティ設定         |
| `WantAssertionsSigned`     | 署名付きレスポンスを要求 | セキュリティ設定         |

---

## このプロジェクトでの実装

### メタデータの取得フロー

```txt
起動時:
┌─────────────────────────────────────────────────────────────┐
│ SP (src/index.ts)                                           │
│                                                             │
│  1. config.yaml / 環境変数から IDP_METADATA_URL を取得      │
│                     ↓                                       │
│  2. axios.get(IDP_METADATA_URL) で IdP メタデータを取得     │
│                     ↓                                       │
│  3. samlify.IdentityProvider({ metadata: xml }) で解析      │
│                     ↓                                       │
│  4. IdP の entityID, SSO URL, 証明書を抽出・保持           │
└─────────────────────────────────────────────────────────────┘
```

**実装コード（src/saml/idp.ts）:**

```typescript
// IdP メタデータを URL から自動取得
const response = await axios.get(config.idp.metadataUrl);
return samlify.IdentityProvider({
  metadata: response.data,
});
```

### SP メタデータの生成

```txt
リクエスト時:
┌─────────────────────────────────────────────────────────────┐
│ GET /metadata                                               │
│                     ↓                                       │
│ samlify が config から XML を自動生成                       │
│   - entityID: config.sp.entityId                           │
│   - ACS URL: config.server.baseUrl + "/acs"                │
│   - 署名証明書: 起動時に自動生成                            │
└─────────────────────────────────────────────────────────────┘
```

**実装コード（src/saml/sp.ts）:**

```typescript
samlify.ServiceProvider({
  entityID: config.sp.entityId,
  assertionConsumerService: [
    {
      Binding: samlify.Constants.BindingNamespace.Post,
      Location: `${config.server.baseUrl}/acs`,
    },
  ],
  authnRequestsSigned: true,
  privateKey: keyPair.privateKey,
  signingCert: keyPair.certificate,
});
```

### 認証フローの実装

**AuthnRequest 生成（src/routes/index.ts:55-60）:**

```typescript
router.get("/login", (_req, res) => {
  // samlify が AuthnRequest を生成し、署名してリダイレクト URL を構築
  const { context } = sp.createLoginRequest(idp, "redirect");
  res.redirect(context);
});
```

**SAMLResponse 処理（src/routes/index.ts:64-90）:**

```typescript
router.post("/acs", async (req, res) => {
  // samlify が署名検証、属性抽出を行う
  const { extract } = await sp.parseLoginResponse(idp, "post", req);

  // セッションに保存
  req.session.user = {
    nameId: extract.nameID,
    attributes: extract.attributes,
  };
});
```

---

## メタデータの手動設定方法

IdP メタデータ URL が利用できない場合、手動で設定できます。

### 方法 1: config.yaml で直接指定

```yaml
idp:
  # metadataUrl を使わず、直接指定
  entityId: http://localhost:8080/realms/myrealm
  ssoUrl: http://localhost:8080/realms/myrealm/protocol/saml
  certificate: |
    MIIDBTCCAe2gAwIBAgIUBVBGZZi8TKohM0sl1Hm+d0khUqwwDQYJKoZIhvcNAQEL
    BQAwEjEQMA4GA1UEAwwHbXlyZWFsbTAeFw0yNjAxMDcxNzAyMjJaFw0zNjAxMDUx
    ...
```

### 方法 2: 環境変数で指定

```bash
# IDP_METADATA_URL を設定しない代わりに以下を設定
IDP_ENTITY_ID=http://localhost:8080/realms/myrealm
IDP_SSO_URL=http://localhost:8080/realms/myrealm/protocol/saml
IDP_CERTIFICATE="MIIDBT..."
```

### IdP 側（Keycloak）への SP 登録

Keycloak に SP を登録するには、`idp/realm-export.json` の `clients` セクションを編集します：

```json
{
  "clients": [
    {
      "clientId": "http://localhost:3000/metadata", // SP の entityID
      "protocol": "saml",
      "rootUrl": "http://localhost:3000",
      "adminUrl": "http://localhost:3000/acs", // ACS URL
      "redirectUris": ["http://localhost:3000/*"],
      "attributes": {
        "saml.force.post.binding": "true",
        "saml.server.signature": "true", // IdP がレスポンスに署名
        "saml.client.signature": "false", // SP のリクエスト署名は不要
        "saml_name_id_format": "username"
      }
    }
  ]
}
```

---

## 署名と証明書

### 署名の種類

| 署名対象     | 設定                       | 説明                          |
| ------------ | -------------------------- | ----------------------------- |
| AuthnRequest | `authnRequestsSigned`      | SP → IdP へのリクエストに署名 |
| SAMLResponse | `saml.server.signature`    | IdP → SP へのレスポンスに署名 |
| Assertion    | `saml.assertion.signature` | アサーション部分のみ署名      |

### このプロジェクトでの証明書管理

**SP 側（自動生成）:**

```txt
起動時に node-forge で自己署名証明書を生成
  ↓
src/saml/cert.ts: generateSelfSignedCert()
  ↓
メモリに保持（再起動で再生成）
```

**IdP 側（固定）:**

```txt
idp/realm-export.json に秘密鍵・証明書を定義
  ↓
Keycloak 起動時にインポート
  ↓
再起動しても同じ証明書を使用（SP 側の設定変更不要）
```

### 証明書を変更する場合

1. **新しい証明書を生成:**

```bash
# OpenSSL で生成
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 3650 -nodes

# Base64 エンコード（改行なし）
cat cert.pem | grep -v "CERTIFICATE" | tr -d '\n'
```

2. **IdP に設定（realm-export.json）:**

```json
{
  "components": {
    "org.keycloak.keys.KeyProvider": [
      {
        "config": {
          "privateKey": ["MIIEv...（秘密鍵）"],
          "certificate": ["MIIDB...（証明書）"]
        }
      }
    ]
  }
}
```

3. **Keycloak を再起動:**

```bash
make docker-down
make docker-up
```

---

## Keycloak と realm-export.json

### Keycloak の基本構造

Keycloak は **Realm（レルム）** という単位でテナント/名前空間を管理します：

```txt
Keycloak サーバー
├── master realm（管理用、デフォルトで存在）
│   └── admin ユーザー
│
└── myrealm（アプリケーション用に作成）
    ├── Users（ユーザー）
    │   └── testuser
    ├── Clients（連携アプリケーション = SP）
    │   └── http://localhost:3000/metadata
    ├── Roles（権限）
    └── Keys（SAML 署名鍵）
        └── rsa-saml-signing
```

### realm-export.json とは

Keycloak の Realm 設定をエクスポートした JSON ファイルです。このプロジェクトでは、Keycloak 起動時に自動インポートすることで、手動設定なしで IdP を構築しています。

**インポートの仕組み（docker-compose.yml）:**

```yaml
idp:
  image: quay.io/keycloak/keycloak:26.0
  command: start-dev --import-realm  # ← 起動時にインポート実行
  volumes:
    # /opt/keycloak/data/import/ 内の JSON を自動読み込み
    - ./idp/realm-export.json:/opt/keycloak/data/import/realm-export.json:ro
```

### realm-export.json の構造

```json
{
  "realm": "myrealm",
  "enabled": true,
  "sslRequired": "none",

  // ========== ユーザー定義 ==========
  "users": [
    {
      "username": "testuser",
      "enabled": true,
      "email": "testuser@example.com",
      "firstName": "Test",
      "lastName": "User",
      "credentials": [
        {
          "type": "password",
          "value": "password",      // 平文で指定（インポート時にハッシュ化される）
          "temporary": false
        }
      ]
    }
  ],

  // ========== クライアント（SP）定義 ==========
  "clients": [
    {
      "clientId": "http://localhost:3000/metadata",  // SP の entityID と一致させる
      "name": "Simple SAML SP",
      "enabled": true,
      "protocol": "saml",                            // SAML プロトコルを使用
      "rootUrl": "http://localhost:3000",
      "baseUrl": "/",
      "redirectUris": ["http://localhost:3000/*"],
      "adminUrl": "http://localhost:3000/acs",       // ACS URL

      "attributes": {
        "saml.force.post.binding": "true",           // POST バインディングを強制
        "saml.authnstatement": "true",
        "saml.server.signature": "true",             // IdP がレスポンスに署名
        "saml.assertion.signature": "false",
        "saml.client.signature": "false",            // SP の署名検証はしない
        "saml_name_id_format": "username"            // NameID にユーザー名を使用
      },
      "fullScopeAllowed": true
    }
  ],

  // ========== 署名鍵定義 ==========
  "components": {
    "org.keycloak.keys.KeyProvider": [
      {
        "name": "rsa-saml-signing",
        "providerId": "rsa",
        "config": {
          // 秘密鍵（PKCS#8 形式、Base64）
          "privateKey": ["MIIEvAIBADANBgkqhki..."],
          // 公開鍵証明書（X.509 形式、Base64）
          "certificate": ["MIIDBTCCAe2gAwIBAgIU..."],
          "priority": ["100"],
          "algorithm": ["RS256"]
        }
      }
    ]
  }
}
```

### 主要な設定項目

| セクション | 説明 |
|-----------|------|
| `realm` | Realm 名。URL パスに使われる（`/realms/myrealm/...`） |
| `users` | テストユーザーの定義 |
| `clients` | SP（サービスプロバイダー）の登録情報 |
| `components.KeyProvider` | SAML 署名に使う RSA 鍵ペア |

### clients の attributes 詳細

| 属性 | 説明 |
|-----|------|
| `saml.server.signature` | `true`: IdP が SAMLResponse に署名する |
| `saml.assertion.signature` | `true`: Assertion 部分にも個別に署名する |
| `saml.client.signature` | `true`: SP からの AuthnRequest の署名を検証する |
| `saml.force.post.binding` | `true`: HTTP-POST バインディングを強制 |
| `saml_name_id_format` | NameID の形式（`username`, `email`, `persistent` など） |

### realm-export.json の作成方法

#### 方法 1: Keycloak 管理画面からエクスポート

```bash
# 1. Keycloak を起動
make docker-up

# 2. 管理画面にアクセス
#    http://localhost:8080
#    admin / admin でログイン

# 3. 左上のドロップダウンで「myrealm」を選択

# 4. 左メニュー「Realm settings」→ 右上「Action」→「Partial export」
#    - Include clients: ON
#    - Include groups and roles: ON
#    → Export ボタンをクリック

# 5. ダウンロードされた JSON を idp/realm-export.json として保存
```

#### 方法 2: CLI でエクスポート

```bash
# Keycloak コンテナ内でエクスポート
docker exec -it simple-saml-sp-idp-1 \
  /opt/keycloak/bin/kc.sh export \
  --dir /tmp/export \
  --realm myrealm

# ファイルをホストにコピー
docker cp simple-saml-sp-idp-1:/tmp/export/myrealm-realm.json ./idp/realm-export.json
```

#### 方法 3: 手動で作成（最小構成）

```json
{
  "realm": "myrealm",
  "enabled": true,
  "sslRequired": "none",

  "users": [
    {
      "username": "testuser",
      "enabled": true,
      "credentials": [
        { "type": "password", "value": "password", "temporary": false }
      ]
    }
  ],

  "clients": [
    {
      "clientId": "http://localhost:3000/metadata",
      "protocol": "saml",
      "rootUrl": "http://localhost:3000",
      "adminUrl": "http://localhost:3000/acs",
      "redirectUris": ["http://localhost:3000/*"],
      "attributes": {
        "saml.force.post.binding": "true",
        "saml.server.signature": "true"
      }
    }
  ]
}
```

> **注意:** 署名鍵（`components.KeyProvider`）を省略すると、Keycloak が起動時に自動生成します。ただし、再起動のたびに鍵が変わるため、SP 側の証明書設定も更新が必要になります。本プロジェクトでは固定の鍵を定義しています。

### 新しい SP を追加する場合

1. `clients` 配列に新しいエントリを追加：

```json
{
  "clients": [
    // 既存の SP...
    {
      "clientId": "http://localhost:4000/metadata",  // 新 SP の entityID
      "protocol": "saml",
      "rootUrl": "http://localhost:4000",
      "adminUrl": "http://localhost:4000/acs",
      "redirectUris": ["http://localhost:4000/*"],
      "attributes": {
        "saml.force.post.binding": "true",
        "saml.server.signature": "true",
        "saml.client.signature": "false",
        "saml_name_id_format": "username"
      }
    }
  ]
}
```

2. Keycloak を再起動：

```bash
make docker-down
make docker-up
```

---

## デバッグ

### SAML メッセージの確認

1. **ブラウザの開発者ツール:**

   - Network タブで `/login` のリダイレクト URL を確認
   - `SAMLRequest` パラメータを Base64 デコード

2. **SP のデバッグページ:**

   - ログイン後 `http://localhost:3000/debug` で SAMLResponse を確認

3. **環境変数でログ出力:**

```yaml
debug:
  enabled: true
  logSamlMessages: true # コンソールに SAML メッセージを出力
```

### よくある問題

| 問題                 | 原因               | 解決策                   |
| -------------------- | ------------------ | ------------------------ |
| 署名検証エラー       | 証明書の不一致     | IdP メタデータを再取得   |
| Destination mismatch | ACS URL の不一致   | SP/IdP 双方の URL を確認 |
| Invalid Issuer       | entityID の不一致  | 設定を確認               |
| 時刻エラー           | サーバー時刻のずれ | NTP で同期               |
