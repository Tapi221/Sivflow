# 認証およびデバイス識別の関係図

## 概要

本システムにおける「ユーザー認証（Authentication）」と「デバイス識別（Device Identification）」の相互関係、およびそれらがどのように連携してデータ同期のセキュリティと整合性を保証しているかを定義します。

## 認証と権限の階層構造

1.  **User Identity (Account)**: 「誰か」を識別。Firebase Auth Tokenによって保証される。
2.  **Device Identity (Client Instance)**: 「どこから」を識別。アプリ側で生成する`deviceId`によって追跡される。

この2層構造により、**「正当なユーザーであっても、無効化された（Revoked）端末からのアクセスは拒否する」** という高度な制御が可能になります。

## シーケンス図: 認証と同期のフロー

```mermaid
sequenceDiagram
    participant App as Client (App/Browser)
    participant Auth as Firebase Auth
    participant Firestore as Firestore
    participant Logic as SyncService (App Logic)

    Note over App: 1. Application Launch

    App->>App: Check LocalStorage for deviceId
    alt deviceId exists
        App->>App: Load existing deviceId
    else deviceId missing
        App->>App: Generate NEW UUIDv4
        App->>App: Save to LocalStorage
    end

    Note over App: 2. User Authentication

    App->>Auth: Login (Email/Google etc.)
    Auth-->>App: ID Token (JWT)
    Note right of App: ID Token contains "uid"

    Note over App: 3. Synchronization Request

    App->>Logic: Start Sync (SyncServiceV2.sync)
    Logic->>Logic: checkDeviceStatus()

    Logic->>Firestore: GET /sync_metadata/{uid}/devices/{deviceId}
    Note right of Logic: Request authorized by Security Rules<br/>(allow read if request.auth.uid == uid)

    alt Device is Active or New
        Firestore-->>Logic: Return Device Document (or null)
        Logic->>Logic: Status OK. Proceed.
        
        par Parallel Operations
            Logic->>Firestore: Update Device LastSyncTime
            Logic->>Firestore: Pull/Push Changes (Folders, Cards)
        end
        
    else Device is Revoked
        Firestore-->>Logic: Return Device Document (status: 'revoked')
        Logic->>Logic: THROW Error("DEVICE_REVOKED")
        Logic-->>App: Sync Failed: Access Denied
        App->>App: Show Alert & Force Logout
    end
```

## コンポーネント間の関係性

| コンポーネント | 役割 | 保持データ | ライフサイクル |
| :--- | :--- | :--- | :--- |
| **Firebase Auth** | ユーザー本人の正当性を保証 | `uid`, `email` | ログイン 〜 ログアウト/期限切れ |
| **LocalStorage** | クライアントインスタンスの同一性を保持 | `deviceId` | ブラウザデータ削除時まで永続 |
| **Firestore (Devices)** | デバイスの状態管理とアクセス制御ポリシー | `status`, `lastSyncTime` | 登録 〜 論理削除 〜 自動物理削除 |
| **Security Rules** | データアクセス権の最下層ガード | `request.auth.uid` | - |

### セキュリティチェックの2段階防御

1.  **Firebase Security Rules (Layer 1)**:
    *   そのデータにアクセスしようとしているのは、データの所有者本人か？
    *   検証: `request.auth.uid == resource.data.userId`
2.  **Application Logic / Sync Service (Layer 2)**:
    *   その端末は、現在もアクセスを許可されているか？
    *   検証: `device.status !== 'revoked'`

## 異常系シナリオ: 無効化された端末からのアクセス

デバイス管理画面で「登録解除（Revoke）」された端末が、再度アクセスを試みた場合の挙動です。

```mermaid
graph TD
    UserA[ユーザー] -->|1. デバイスAを紛失として解除| AdminDevice[管理用デバイス]
    AdminDevice -->|2. status='revoked'に更新| DB[(Firestore)]
    
    LostDevice[紛失したデバイスA] -->|3. アプリ起動 & 同期試行| SyncService
    SyncService -->|4. デバイスステータス確認| DB
    DB -->|5. 'revoked'を返却| SyncService
    SyncService -->|6. エラー送出 & ローカルデータ消去指令| LostDevice
    LostDevice -->|7. 強制ログアウト & データアクセス遮断| Lock[アクセス拒否]
    
    style LostDevice fill:#f9f,stroke:#333
    style Lock fill:#d33,stroke:#333,color:white
```

## 注意点

*   **デバイスIDの再生成**: ユーザーがブラウザのキャッシュをクリアしたり、再インストールを行った場合、`deviceId` は失われ、次回起動時に**新しいデバイス**として認識されます。これはセキュリティ上の仕様（意図された挙動）です。
*   **トークンとデバイスIDの独立性**: Firebaseの認証トークン自体には `deviceId` は含まれません。紐付けはアプリケーションロジック（`SyncService`）によって動的に検証されます。
