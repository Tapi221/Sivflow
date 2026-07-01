import { DebugLogger } from '@affine/debug';
import { GraphQLError } from '@affine/error';
import type { ExecutionResult } from 'graphql';
import { isNil, isObject, merge } from 'lodash-es';

import type { GraphQLQuery } from './graphql';
import type { Mutations, Queries } from './schema';

export type NotArray<T> = T extends Array<unknown> ? never : T;

type UnknownRecord = Record<string, unknown>;
type GraphQLResponseError = NonNullable<ExecutionResult['errors']>[number];

type GraphQLErrorContext = {
  operationName?: string;
  status?: number;
  statusText?: string;
  responseBody?: unknown;
};

export type FetchInit = RequestInit & { timeout?: number };

export type _QueryVariables<Q extends GraphQLQuery> =
  Q['id'] extends Queries['name']
    ? Extract<Queries, { name: Q['id'] }>['variables']
    : Q['id'] extends Mutations['name']
      ? Extract<Mutations, { name: Q['id'] }>['variables']
      : undefined;

export type QueryVariables<Q extends GraphQLQuery> =
  _QueryVariables<Q> extends never | Record<string, never>
    ? never
    : _QueryVariables<Q>;

export type QueryResponse<Q extends GraphQLQuery> = Extract<
  Queries | Mutations,
  { name: Q['id'] }
>['response'];

type NullableKeys<T> = {
  [K in keyof T]: null extends T[K] ? K : never;
}[keyof T];

type NonNullableKeys<T> = {
  [K in keyof T]: null extends T[K] ? never : K;
}[keyof T];

export type RecursiveMaybeFields<T> = T extends
  | number
  | boolean
  | string
  | null
  | undefined
  ? T
  : {
      [K in NullableKeys<T>]?: RecursiveMaybeFields<T[K]>;
    } & {
      [K in NonNullableKeys<T>]: RecursiveMaybeFields<T[K]>;
    };

type AllowedRequestContext = Omit<RequestInit, 'method' | 'body'>;

export interface RequestBody {
  operationName?: string;
  variables: unknown;
  query: string;
  form?: FormData;
}

type QueryVariablesOption<Q extends GraphQLQuery> =
  QueryVariables<Q> extends never
    ? {
        variables?: undefined;
      }
    : { variables: RecursiveMaybeFields<QueryVariables<Q>> };

export type RequestOptions<Q extends GraphQLQuery> = QueryVariablesOption<Q> & {
  /**
   * parameter passed to `fetch` function
   */
  context?: AllowedRequestContext;
  /**
   * Whether keep null or undefined value in variables.
   *
   * if `false` given, `{ a: 0, b: undefined, c: null }` will be converted to `{ a: 0 }`
   *
   * @default true
   */
  keepNilVariables?: boolean;
  /**
   * Request timeout in milliseconds
   * @default 15000
   */
  timeout?: number;
  /**
   * Abort signal
   */
  signal?: AbortSignal;
};

export type QueryOptions<Q extends GraphQLQuery> = RequestOptions<Q> & {
  query: Q;
};
export type MutationOptions<M extends GraphQLQuery> = RequestOptions<M> & {
  mutation: M;
};

function isFileValue(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

function isRecordValue(value: unknown): value is UnknownRecord {
  return isObject(value) && !Array.isArray(value) && !isFileValue(value);
}

function filterEmptyValue(vars: unknown): unknown {
  if (Array.isArray(vars)) {
    return vars.map(value => filterEmptyValue(value));
  }

  if (!isRecordValue(vars)) {
    return vars;
  }

  const newVars: UnknownRecord = {};
  Object.entries(vars).forEach(([key, value]) => {
    if (isNil(value)) {
      return;
    }
    newVars[key] = filterEmptyValue(value);
  });

  return newVars;
}

export function transformToForm(body: RequestBody) {
  const form = new FormData();
  const map: Record<string, string[]> = {};
  const files: File[] = [];
  let i = 0;

  const normalizeVariables = (key: string, value: unknown): unknown => {
    if (isFileValue(value)) {
      map['' + i] = [key];
      files[i] = value;
      i++;
      return null;
    }

    if (Array.isArray(value)) {
      return value.map((v, index) => normalizeVariables(`${key}.${index}`, v));
    }

    if (isRecordValue(value)) {
      const normalized: UnknownRecord = {};
      Object.entries(value).forEach(([k, v]) => {
        normalized[k] = normalizeVariables(`${key}.${k}`, v);
      });
      return normalized;
    }

    return value;
  };

  const gqlBody: {
    operationName?: string;
    query: string;
    variables: unknown;
  } = {
    query: body.query,
    variables: normalizeVariables('variables', body.variables),
  };

  if (body.operationName) {
    gqlBody.operationName = body.operationName;
  }

  form.set('operations', JSON.stringify(gqlBody));
  form.set('map', JSON.stringify(map));
  for (const [i, file] of files.entries()) {
    form.set(`${i}`, file);
  }
  return form;
}

function formatRequestBody<Q extends GraphQLQuery>({
  query,
  variables,
  keepNilVariables,
}: QueryOptions<Q>): RequestBody | FormData {
  const body: RequestBody = {
    query: query.query,
    variables:
      (keepNilVariables ?? true) ? variables : filterEmptyValue(variables),
  };

  if (query.op) {
    body.operationName = query.op;
  }

  if (query.file) {
    return transformToForm(body);
  }
  return body;
}

function serializeGraphQLError(error: GraphQLResponseError) {
  return {
    message: error.message,
    locations: error.locations,
    path: error.path,
    extensions: error.extensions,
  };
}

function pickString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.length ? value : fallback;
}

function pickNumber(value: unknown, fallback: number) {
  return typeof value === 'number' ? value : fallback;
}

function createErrorExtensions(
  message: string,
  errors: readonly GraphQLResponseError[],
  context: GraphQLErrorContext,
  extensions: GraphQLResponseError['extensions'] = {}
) {
  const baseExtensions = isRecordValue(extensions) ? extensions : {};
  const status = pickNumber(baseExtensions.status, context.status ?? 500);
  const code = pickString(
    baseExtensions.code,
    status >= 400 && status < 500 ? 'GRAPHQL_BAD_REQUEST' : 'INTERNAL_SERVER_ERROR'
  );

  return {
    ...baseExtensions,
    status,
    code,
    type: pickString(baseExtensions.type, code),
    name: pickString(baseExtensions.name, code),
    message: pickString(baseExtensions.message, message),
    graphQLErrors: errors.map(serializeGraphQLError),
    operationName: context.operationName,
    statusText: context.statusText,
    responseBody: context.responseBody,
  };
}

function createGraphQLError(
  errors: readonly GraphQLResponseError[],
  context: GraphQLErrorContext = {}
) {
  const firstError = errors[0];
  const fallbackMessage = context.status
    ? `GraphQL request failed with status ${context.status}${
        context.statusText ? ` ${context.statusText}` : ''
      }`
    : 'Empty GraphQL error body';

  if (!firstError) {
    return new GraphQLError(fallbackMessage, {
      extensions: createErrorExtensions(fallbackMessage, errors, context),
    });
  }

  const message =
    errors.length === 1
      ? firstError.message
      : errors.map((error, index) => `${index + 1}. ${error.message}`).join('\n');

  return new GraphQLError(message, {
    nodes: firstError.nodes,
    source: firstError.source,
    positions: firstError.positions,
    path: firstError.path,
    originalError: firstError.originalError,
    extensions: createErrorExtensions(
      message,
      errors,
      context,
      firstError.extensions
    ),
  });
}

export const gqlFetcherFactory = (
  endpoint: string,
  fetcher: (input: string, init?: FetchInit) => Promise<Response> = fetch
) => {
  const logger = new DebugLogger('GraphQL');
  const gqlFetch = async <Query extends GraphQLQuery>(
    options: QueryOptions<Query>
  ): Promise<QueryResponse<Query>> => {
    if (
      BUILD_CONFIG.appBuildType === 'internal' &&
      options.query.deprecations?.length
    ) {
      options.query.deprecations.forEach(deprecation => {
        logger.warn(deprecation);
      });
    }

    const body = formatRequestBody(options);

    const isFormData = body instanceof FormData;
    const headers: Record<string, string> = {
      'x-operation-name': options.query.op,
    };
    if (!isFormData) {
      headers['content-type'] = 'application/json';
    }

    const requestInit = merge({}, options.context, {
      method: 'POST',
      headers,
      body: isFormData ? body : JSON.stringify(body),
      timeout: options.timeout,
      signal: options.signal,
    }) as FetchInit;

    const ret = fetcher(endpoint, requestInit).then(async res => {
      const errorContext: GraphQLErrorContext = {
        operationName: options.query.op,
        status: res.status,
        statusText: res.statusText,
      };

      if (res.headers.get('content-type')?.startsWith('application/json')) {
        const result = (await res.json()) as ExecutionResult;
        errorContext.responseBody = result;
        if (res.status >= 400 || result.errors) {
          throw createGraphQLError(result.errors ?? [], errorContext);
        } else if (result.data) {
          // we have to cast here because the type of result.data is a union type
          return result.data as QueryResponse<Query>;
        }
      } else if (res.status >= 400) {
        errorContext.responseBody = await res.text().catch(() => undefined);
        throw createGraphQLError([], errorContext);
      }

      throw new GraphQLError(
        'GraphQL query responds unexpected result, query ' + options.query.op,
        {
          extensions: createErrorExtensions(
            'GraphQL query responds unexpected result, query ' + options.query.op,
            [],
            errorContext
          ),
        }
      );
    });

    return ret;
  };

  return gqlFetch;
};
