/**
 * AFFiNE GraphQL クライアント
 *
 * `@affine/graphql` の `gqlFetcherFactory` をラップして、React コンポーネントから
 * 簡単に GraphQL API を呼び出せるようにするクライアントモジュールです。
 *
 * エンドポイント: http://localhost:8080/graphql
 *
 * ## 主な機能
 * - 型安全なクエリ / ミューテーション実行
 * - セッション Cookie による認証
 * - カスタマイズ可能なタイムアウト
 * - エラーの自動分類 (ネットワーク / GraphQL / 認証)
 *
 * ## 使い方
 * ```ts
 * import { affineGqlClient } from './graphql-client';
 * import { getCurrentUserQuery } from '@affine/graphql';
 *
 * const data = await affineGqlClient.query({ query: getCurrentUserQuery });
 * ```
 */

import {
  gqlFetcherFactory,
  type GraphQLQuery,
  type QueryOptions,
  type QueryResponse,
} from '@affine/graphql';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/** クライアント生成オプション */
export interface AffineGqlClientOptions {
  /** GraphQL エンドポイント (デフォルト: /graphql) */
  endpoint?: string;
  /** デフォルトタイムアウト (ms, デフォルト: 15000) */
  defaultTimeout?: number;
  /** 追加ヘッダー */
  headers?: Record<string, string>;
}

/** クエリ結果の共通型 */
export type GqlResult<Q extends GraphQLQuery> =
  | { data: QueryResponse<Q>; error: null }
  | { data: null; error: GqlClientError };

/** クライアントエラー種別 */
export type GqlErrorKind = 'network' | 'graphql' | 'unauthorized' | 'timeout' | 'unknown';

/** GraphQL クライアントエラー */
export class GqlClientError extends Error {
  constructor(
    message: string,
    public readonly kind: GqlErrorKind,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'GqlClientError';
  }
}

// ---------------------------------------------------------------------------
// エラー分類
// ---------------------------------------------------------------------------

function classifyError(error: unknown): GqlClientError {
  if (error instanceof GqlClientError) return error;

  const message = error instanceof Error ? error.message : String(error);

  // タイムアウト
  if (
    message.includes('timeout') ||
    message.includes('AbortError') ||
    (error instanceof DOMException && error.name === 'AbortError')
  ) {
    return new GqlClientError('リクエストがタイムアウトしました', 'timeout', error);
  }

  // 認証エラー
  if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
    return new GqlClientError('認証が必要です。再ログインしてください。', 'unauthorized', error);
  }

  // GraphQL エラー (サーバーが返したエラー)
  if (message.includes('GraphQL')) {
    return new GqlClientError(message, 'graphql', error);
  }

  // ネットワークエラー
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('ERR_') ||
    message.includes('504') ||
    message.includes('503') ||
    message.includes('502')
  ) {
    return new GqlClientError(
      'サーバーに接続できません。バックエンドが起動しているか確認してください。',
      'network',
      error
    );
  }

  return new GqlClientError(message, 'unknown', error);
}

// ---------------------------------------------------------------------------
// クライアント本体
// ---------------------------------------------------------------------------

/**
 * AFFiNE GraphQL クライアントクラス
 *
 * シングルトンとして使うか、オプションを変えてインスタンス化して使います。
 */
export class AffineGqlClient {
  private readonly gqlFetch: ReturnType<typeof gqlFetcherFactory>;
  private readonly defaultTimeout: number;

  constructor(options: AffineGqlClientOptions = {}) {
    const {
      endpoint = '/graphql',
      defaultTimeout = 15_000,
      headers = {},
    } = options;

    this.defaultTimeout = defaultTimeout;

    // @affine/graphql の低レベルフェッチャーをラップ
    // カスタムヘッダーを注入するために fetch をオーバーライド
    const customFetch = (input: string, init?: RequestInit & { timeout?: number }) => {
      const mergedHeaders = new Headers(init?.headers);
      Object.entries(headers).forEach(([k, v]) => mergedHeaders.set(k, v));
      // Cookie を自動送信 (セッション認証)
      return fetch(input, {
        ...init,
        headers: mergedHeaders,
        credentials: 'include',
      });
    };

    this.gqlFetch = gqlFetcherFactory(endpoint, customFetch);
  }

  /**
   * GraphQL クエリを実行します。
   *
   * @example
   * const { data, error } = await client.query({ query: getCurrentUserQuery });
   */
  async query<Q extends GraphQLQuery>(
    options: QueryOptions<Q>
  ): Promise<GqlResult<Q>> {
    try {
      const data = await this.gqlFetch({
        timeout: this.defaultTimeout,
        ...options,
      });
      return { data, error: null };
    } catch (err) {
      return { data: null, error: classifyError(err) };
    }
  }

  /**
   * GraphQL ミューテーションを実行します。
   * query() と同一の実装ですが、意図を明確にするためにエイリアスとして提供します。
   */
  async mutate<Q extends GraphQLQuery>(
    options: QueryOptions<Q>
  ): Promise<GqlResult<Q>> {
    return this.query(options);
  }

  /**
   * エラーをスローする形式のクエリ実行。
   * try/catch でエラーを処理したい場合に使います。
   *
   * @throws {GqlClientError}
   */
  async queryOrThrow<Q extends GraphQLQuery>(
    options: QueryOptions<Q>
  ): Promise<QueryResponse<Q>> {
    const result = await this.query(options);
    if (result.error) throw result.error;
    return result.data;
  }
}

// ---------------------------------------------------------------------------
// デフォルトシングルトン
// ---------------------------------------------------------------------------

/**
 * アプリ全体で共有するデフォルトクライアントインスタンス。
 *
 * 別のエンドポイントや設定が必要な場合は `new AffineGqlClient({ endpoint: '...' })` で
 * 新しいインスタンスを作成してください。
 */
export const affineGqlClient = new AffineGqlClient({
  endpoint: '/graphql',
  defaultTimeout: 15_000,
});
