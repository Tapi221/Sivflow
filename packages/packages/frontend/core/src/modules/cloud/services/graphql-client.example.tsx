/**
 * GraphQL クライアントの使用例
 *
 * このファイルは実際のコンポーネントのサンプルです。
 * 実装時に参考にして、不要なら削除してください。
 */

import {
  getCurrentUserQuery,
  getWorkspacesQuery,
  serverConfigQuery,
  updateUserProfileMutation,
} from '@affine/graphql';
import React from 'react';

import { affineGqlClient } from './graphql-client';
import { useGqlMutation, useGqlQuery, useLazyGqlQuery } from './use-gql-hooks';

// ---------------------------------------------------------------------------
// 例 1: ユーザー情報の表示 (useGqlQuery)
// ---------------------------------------------------------------------------

/**
 * ログイン中ユーザーの情報を表示するコンポーネント
 */
export function CurrentUserProfile() {
  const { data, loading, error, refetch } = useGqlQuery(getCurrentUserQuery);

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return (
      <div>
        <p>エラー ({error.kind}): {error.message}</p>
        <button onClick={refetch}>再試行</button>
      </div>
    );
  }

  const user = data?.currentUser;
  if (!user) {
    return <div>未ログイン</div>;
  }

  return (
    <div>
      <h2>{user.name}</h2>
      <p>メール: {user.email}</p>
      {user.avatarUrl && (
        <img src={user.avatarUrl} alt={user.name} width={48} height={48} />
      )}
      <button onClick={refetch}>更新</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 例 2: ワークスペース一覧 (useGqlQuery)
// ---------------------------------------------------------------------------

/**
 * ユーザーのワークスペース一覧を表示するコンポーネント
 */
export function WorkspaceList() {
  const { data, loading, error } = useGqlQuery(getWorkspacesQuery);

  if (loading) return <p>ワークスペースを読み込み中...</p>;
  if (error) return <p>エラー: {error.message}</p>;

  const workspaces = data?.workspaces ?? [];

  return (
    <ul>
      {workspaces.map(ws => (
        <li key={ws.id}>
          ID: {ws.id} / チーム: {ws.team ? 'はい' : 'いいえ'}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// 例 3: プロフィール更新 (useGqlMutation)
// ---------------------------------------------------------------------------

/**
 * ユーザー名を更新するフォームコンポーネント
 */
export function UpdateProfileForm() {
  const [name, setName] = React.useState('');
  const [updateProfile, { loading, error, data, called }] =
    useGqlMutation(updateUserProfileMutation);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const result = await updateProfile({
      variables: { input: { name } },
    });

    if (result.data) {
      setName('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="新しい名前"
        disabled={loading}
      />
      <button type="submit" disabled={loading || !name.trim()}>
        {loading ? '更新中...' : '名前を変更'}
      </button>

      {error && <p style={{ color: 'red' }}>エラー: {error.message}</p>}
      {called && !loading && !error && data && (
        <p style={{ color: 'green' }}>更新しました！</p>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// 例 4: 手動クエリ (useLazyGqlQuery)
// ---------------------------------------------------------------------------

/**
 * ボタンを押したときだけサーバー設定を取得するコンポーネント
 */
export function ServerConfigViewer() {
  const [fetchConfig, { data, loading, error }] = useLazyGqlQuery(serverConfigQuery);

  return (
    <div>
      <button onClick={() => fetchConfig()} disabled={loading}>
        {loading ? '取得中...' : 'サーバー設定を取得'}
      </button>

      {error && <p>エラー: {error.message}</p>}

      {data?.serverConfig && (
        <dl>
          <dt>バージョン</dt>
          <dd>{data.serverConfig.version}</dd>
          <dt>名前</dt>
          <dd>{data.serverConfig.name}</dd>
          <dt>ベースURL</dt>
          <dd>{data.serverConfig.baseUrl}</dd>
          <dt>初期化済み</dt>
          <dd>{data.serverConfig.initialized ? 'はい' : 'いいえ'}</dd>
        </dl>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 例 5: クライアントを直接使う (命令型)
// ---------------------------------------------------------------------------

/**
 * フックを使わずに命令的にクエリを実行する例。
 * サービス層やユーティリティ関数から呼び出す場合に使います。
 */
export async function fetchCurrentUser() {
  const { data, error } = await affineGqlClient.query({
    query: getCurrentUserQuery,
  });

  if (error) {
    console.error(`[GraphQL] ユーザー取得失敗 (${error.kind}):`, error.message);
    return null;
  }

  return data.currentUser;
}

export async function fetchWorkspaces() {
  // エラーをスローするバージョン
  try {
    const data = await affineGqlClient.queryOrThrow({
      query: getWorkspacesQuery,
    });
    return data.workspaces;
  } catch (err) {
    // GqlClientError がスローされる
    throw err;
  }
}
