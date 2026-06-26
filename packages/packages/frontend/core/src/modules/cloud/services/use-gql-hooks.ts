/**
 * AFFiNE GraphQL React フック
 *
 * `affineGqlClient` を使った React カスタムフック群。
 * Apollo Client や urql を使わずに、ネイティブな React パターンで
 * GraphQL クエリ / ミューテーションを実行できます。
 *
 * ## 使い方
 *
 * ### クエリ (データ取得)
 * ```tsx
 * import { useGqlQuery } from './use-gql-hooks';
 * import { getCurrentUserQuery, getWorkspacesQuery } from '@affine/graphql';
 *
 * function Profile() {
 *   const { data, loading, error, refetch } = useGqlQuery(getCurrentUserQuery);
 *
 *   if (loading) return <p>Loading...</p>;
 *   if (error) return <p>エラー: {error.message}</p>;
 *
 *   return <div>こんにちは、{data.currentUser?.name}さん</div>;
 * }
 * ```
 *
 * ### ミューテーション
 * ```tsx
 * import { useGqlMutation } from './use-gql-hooks';
 * import { updateUserProfileMutation } from '@affine/graphql';
 *
 * function EditName() {
 *   const [updateProfile, { loading, error }] = useGqlMutation(updateUserProfileMutation);
 *
 *   const handleSave = async () => {
 *     const result = await updateProfile({ variables: { input: { name: '新しい名前' } } });
 *     if (result.data) console.log('更新成功', result.data);
 *   };
 *
 *   return <button onClick={handleSave} disabled={loading}>保存</button>;
 * }
 * ```
 *
 * ### 遅延クエリ (useLazyGqlQuery)
 * ```tsx
 * const [fetchUser, { data, loading }] = useLazyGqlQuery(getCurrentUserQuery);
 *
 * // ボタン押下時などに手動で実行
 * <button onClick={() => fetchUser()}>ユーザー情報を取得</button>
 * ```
 */

import {
  type GraphQLQuery,
  type QueryOptions,
  type QueryResponse,
} from '@affine/graphql';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import { type GqlClientError, affineGqlClient, type AffineGqlClient } from './graphql-client';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/** クエリフックが返す状態 */
export interface UseGqlQueryResult<Q extends GraphQLQuery> {
  /** 取得したデータ (ロード中 / エラー時は null) */
  data: QueryResponse<Q> | null;
  /** ロード中フラグ */
  loading: boolean;
  /** エラー情報 */
  error: GqlClientError | null;
  /** クエリを再実行する関数 */
  refetch: () => Promise<void>;
}

/** ミューテーション実行関数のオプション */
export type MutationExecuteOptions<Q extends GraphQLQuery> = Omit<QueryOptions<Q>, 'query' | 'mutation'>;

/** ミューテーションフックが返すタプル */
export type UseGqlMutationResult<Q extends GraphQLQuery> = [
  /** ミューテーション実行関数 */
  execute: (options?: MutationExecuteOptions<Q>) => Promise<{
    data: QueryResponse<Q> | null;
    error: GqlClientError | null;
  }>,
  /** 状態 */
  state: {
    data: QueryResponse<Q> | null;
    loading: boolean;
    error: GqlClientError | null;
    /** 実行済みかどうか */
    called: boolean;
  },
];

/** 遅延クエリフックが返すタプル */
export type UseLazyGqlQueryResult<Q extends GraphQLQuery> = [
  /** クエリ実行関数 */
  execute: (options?: MutationExecuteOptions<Q>) => Promise<void>,
  /** 状態 */
  state: UseGqlQueryResult<Q>,
];

// ---------------------------------------------------------------------------
// 内部ユーティリティ
// ---------------------------------------------------------------------------

interface QueryState<Q extends GraphQLQuery> {
  data: QueryResponse<Q> | null;
  loading: boolean;
  error: GqlClientError | null;
}

type QueryAction<Q extends GraphQLQuery> =
  | { type: 'START' }
  | { type: 'SUCCESS'; payload: QueryResponse<Q> }
  | { type: 'ERROR'; payload: GqlClientError };

function queryReducer<Q extends GraphQLQuery>(
  state: QueryState<Q>,
  action: QueryAction<Q>
): QueryState<Q> {
  switch (action.type) {
    case 'START':
      return { ...state, loading: true, error: null };
    case 'SUCCESS':
      return { data: action.payload, loading: false, error: null };
    case 'ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// useGqlQuery - 自動実行クエリフック
// ---------------------------------------------------------------------------

/**
 * GraphQL クエリを自動実行するフック。
 *
 * コンポーネントのマウント時にクエリを実行し、`refetch` で再実行できます。
 * `skip` を true にすると初回実行をスキップします。
 *
 * @param query - `@affine/graphql` のクエリオブジェクト
 * @param options - クエリオプション (variables, skip, etc.)
 * @param client - 使用するクライアント (省略時はデフォルト)
 */
export function useGqlQuery<Q extends GraphQLQuery>(
  query: Q,
  options?: MutationExecuteOptions<Q> & { skip?: boolean },
  client: AffineGqlClient = affineGqlClient
): UseGqlQueryResult<Q> {
  const [state, dispatch] = useReducer(queryReducer<Q>, {
    data: null,
    loading: !options?.skip,
    error: null,
  });

  // options を ref で保持することで、変化しても再レンダリングを最小化
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const execute = useCallback(async () => {
    dispatch({ type: 'START' });
    const result = await client.query({
      query,
      ...(optionsRef.current ?? {}),
    } as QueryOptions<Q>);

    if (result.error) {
      dispatch({ type: 'ERROR', payload: result.error });
    } else {
      dispatch({ type: 'SUCCESS', payload: result.data });
    }
  }, [client, query]);

  useEffect(() => {
    if (options?.skip) return;
    void execute();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, options?.skip]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch: execute,
  };
}

// ---------------------------------------------------------------------------
// useLazyGqlQuery - 手動実行クエリフック
// ---------------------------------------------------------------------------

/**
 * 手動でトリガーするクエリフック。
 *
 * ボタン押下や特定のイベントでクエリを実行したい場合に使います。
 */
export function useLazyGqlQuery<Q extends GraphQLQuery>(
  query: Q,
  client: AffineGqlClient = affineGqlClient
): UseLazyGqlQueryResult<Q> {
  const [state, dispatch] = useReducer(queryReducer<Q>, {
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (options?: MutationExecuteOptions<Q>) => {
      dispatch({ type: 'START' });
      const result = await client.query({
        query,
        ...(options ?? {}),
      } as QueryOptions<Q>);

      if (result.error) {
        dispatch({ type: 'ERROR', payload: result.error });
      } else {
        dispatch({ type: 'SUCCESS', payload: result.data });
      }
    },
    [client, query]
  );

  return [
    execute,
    {
      data: state.data,
      loading: state.loading,
      error: state.error,
      refetch: () => execute(),
    },
  ];
}

// ---------------------------------------------------------------------------
// useGqlMutation - ミューテーションフック
// ---------------------------------------------------------------------------

/**
 * GraphQL ミューテーションフック。
 *
 * [execute, { data, loading, error, called }] のタプルを返します。
 * `execute` を呼ぶと同時に loading が true になり、完了後に状態が更新されます。
 */
export function useGqlMutation<Q extends GraphQLQuery>(
  query: Q,
  client: AffineGqlClient = affineGqlClient
): UseGqlMutationResult<Q> {
  const [state, setState] = useState<{
    data: QueryResponse<Q> | null;
    loading: boolean;
    error: GqlClientError | null;
    called: boolean;
  }>({
    data: null,
    loading: false,
    error: null,
    called: false,
  });

  const execute = useCallback(
    async (options?: MutationExecuteOptions<Q>) => {
      setState(prev => ({ ...prev, loading: true, error: null, called: true }));

      const result = await client.mutate({
        query,
        ...(options ?? {}),
      } as QueryOptions<Q>);

      if (result.error) {
        setState({ data: null, loading: false, error: result.error, called: true });
      } else {
        setState({ data: result.data, loading: false, error: null, called: true });
      }

      return result;
    },
    [client, query]
  );

  return [execute, state];
}
