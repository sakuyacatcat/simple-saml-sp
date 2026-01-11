# IdP Metadata Directory

IdP（Identity Provider）のSAML metadataをこのディレクトリに配置してください。

## 必要なファイル

| ファイル | 説明 |
|---------|------|
| `idp.xml` | IdPのSAML metadata（XML形式） |

## Metadataに含まれる情報

IdP metadataには以下の情報が含まれています：

- **EntityID**: IdPの一意識別子
- **SingleSignOnService**: SSO（ログイン）エンドポイントURL
- **SingleLogoutService**: SLO（ログアウト）エンドポイントURL
- **X509Certificate**: SAMLレスポンスの署名検証に使用する公開鍵証明書

## Keycloakからのダウンロード方法

### 方法1: curlでダウンロード

```bash
# Keycloakが起動している状態で実行
curl -o metadata/idp.xml \
  http://localhost:8080/realms/myrealm/protocol/saml/descriptor
```

### 方法2: ブラウザでダウンロード

1. Keycloakを起動: `make idp-up`
2. ブラウザで以下のURLにアクセス:
   ```
   http://localhost:8080/realms/myrealm/protocol/saml/descriptor
   ```
3. 表示されたXMLをコピーして `metadata/idp.xml` として保存

### 方法3: Keycloak管理画面からエクスポート

1. Keycloak管理画面にログイン: http://localhost:8080/admin (admin/admin)
2. Realm Settings → General → SAML 2.0 Identity Provider Metadata をクリック
3. ダウンロードしたファイルを `metadata/idp.xml` として保存

## Metadataの確認

ダウンロードしたmetadataの内容を確認：

```bash
# XMLを整形して表示
cat metadata/idp.xml | xmllint --format -

# EntityIDを確認
grep -o 'entityID="[^"]*"' metadata/idp.xml
```

## 注意事項

- このディレクトリのXMLファイル（`*.xml`）は `.gitignore` で除外されています
- IdPの証明書が更新された場合は、metadataを再取得してください
- metadata内の証明書は署名検証に使用されるため、正確なコピーが必要です
