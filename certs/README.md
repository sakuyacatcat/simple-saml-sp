# SP Certificate Directory

SP（Service Provider）の証明書ファイルをこのディレクトリに配置してください。

## 必要なファイル

| ファイル | 説明 |
|---------|------|
| `sp.key` | SP秘密鍵（PEM形式） - AuthnRequestの署名に使用 |
| `sp.crt` | SP公開鍵証明書（PEM形式） - IdPに登録、SP metadataに含まれる |

## 自己署名証明書の作成

以下のコマンドで自己署名証明書を作成できます：

```bash
openssl req -x509 -newkey rsa:2048 \
  -keyout certs/sp.key \
  -out certs/sp.crt \
  -days 365 -nodes \
  -subj "/CN=Simple SAML SP/O=Test Organization"
```

### 各オプションの説明

| オプション | 説明 |
|-----------|------|
| `-x509` | 自己署名証明書を作成 |
| `-newkey rsa:2048` | 2048ビットのRSA鍵を新規生成 |
| `-keyout` | 秘密鍵の出力先 |
| `-out` | 証明書の出力先 |
| `-days 365` | 有効期限（365日） |
| `-nodes` | 秘密鍵をパスワードで暗号化しない |
| `-subj` | 証明書のSubject（識別名） |

## 証明書の確認

作成した証明書の内容を確認：

```bash
# 証明書の情報を表示
openssl x509 -in certs/sp.crt -text -noout

# 秘密鍵の情報を表示
openssl rsa -in certs/sp.key -check
```

## 注意事項

- このディレクトリの証明書ファイル（`*.key`, `*.crt`, `*.pem`）は `.gitignore` で除外されています
- 本番環境では信頼されたCAから発行された証明書を使用してください
- 秘密鍵は安全に管理し、公開しないでください
