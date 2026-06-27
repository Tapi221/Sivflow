import { gqlFetcherFactory, type GraphQLQuery } from '@affine/graphql';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const query: GraphQLQuery = {
  id: 'query',
  query: 'query { field }',
  op: 'query',
};

let fetch: Mock;
let gql: ReturnType<typeof gqlFetcherFactory>;
describe('GraphQL fetcher', () => {
  beforeEach(() => {
    fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: { field: 1 } }), {
          headers: {
            'content-type': 'application/json',
          },
        })
      )
    );
    gql = gqlFetcherFactory('https://example.com/graphql', fetch);
  });

  afterEach(() => {
    fetch.mockReset();
  });

  it('should send POST request to given endpoint', async () => {
    await gql(
      // @ts-expect-error variables is actually optional
      { query }
    );

    expect(fetch).toBeCalledTimes(1);
    expect(fetch.mock.lastCall?.[0]).toBe('https://example.com/graphql');
    const ctx = fetch.mock.lastCall?.[1] as RequestInit;
    expect(ctx.method).toBe('POST');
  });

  it('should send with correct graphql JSON body', async () => {
    await gql({
      query,
      // @ts-expect-error forgive the fake variables
      variables: { a: 1, b: '2', c: { d: false } },
    });

    expect(fetch.mock.lastCall?.[1]).toEqual(
      expect.objectContaining({
        body: '{"query":"query { field }","variables":{"a":1,"b":"2","c":{"d":false}},"operationName":"query"}',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'x-operation-name': 'query',
        }),
        method: 'POST',
      })
    );
  });

  it('should not mutate request context', async () => {
    const context = {
      headers: {
        authorization: 'Bearer token',
      },
    } satisfies RequestInit;

    await gql({
      query,
      variables: void 0,
      context,
    });

    expect(context).toEqual({
      headers: {
        authorization: 'Bearer token',
      },
    });
    expect(fetch.mock.lastCall?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer token',
          'content-type': 'application/json',
          'x-operation-name': 'query',
        }),
      })
    );
  });

  it('should send multipart upload with normalized operations body', async () => {
    const uploadQuery: GraphQLQuery = {
      id: 'uploadMutation',
      query: 'mutation upload($file: Upload!, $items: [Upload!]!) { upload(file: $file, items: $items) }',
      op: 'upload',
      file: true,
    };
    const file = new File(['hello'], 'hello.txt');
    const nestedFile = new File(['nested'], 'nested.txt');

    await gql({
      query: uploadQuery,
      // @ts-expect-error forgive the fake variables
      variables: { file, items: [nestedFile] },
    });

    const ctx = fetch.mock.lastCall?.[1] as RequestInit;
    const body = ctx.body as FormData;

    expect(ctx.headers).toEqual(
      expect.objectContaining({
        'x-operation-name': 'upload',
      })
    );
    expect(JSON.parse(body.get('operations') as string)).toEqual({
      query:
        'mutation upload($file: Upload!, $items: [Upload!]!) { upload(file: $file, items: $items) }',
      variables: { file: null, items: [null] },
      operationName: 'upload',
    });
    expect(JSON.parse(body.get('map') as string)).toEqual({
      '0': ['variables.file'],
      '1': ['variables.items.0'],
    });
    expect(body.get('0')).toBe(file);
    expect(body.get('1')).toBe(nestedFile);
  });

  it('should correctly ignore nil variables', async () => {
    await gql({
      query,
      // @ts-expect-error forgive the fake variables
      variables: { a: false, b: null, c: undefined },
    });

    expect(fetch.mock.lastCall?.[1].body).toMatchInlineSnapshot(
      `"{\"query\":\"query { field }\",\"variables\":{\"a\":false,\"b\":null},\"operationName\":\"query\"}"`
    );

    await gql({
      query,
      // @ts-expect-error forgive the fake variables
      variables: { a: false, b: null, c: undefined },
      keepNilVariables: false,
    });

    expect(fetch.mock.lastCall?.[1].body).toMatchInlineSnapshot(
      `"{\"query\":\"query { field }\",\"variables\":{\"a\":false},\"operationName\":\"query\"}"`
    );
  });

  it('should correct handle graphql error', async () => {
    fetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          errors: [{ message: 'error', path: ['field'] }],
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 400,
        }
      )
    );

    await expect(
      gql({ query, variables: void 0 })
    ).rejects.toMatchInlineSnapshot(`[GraphQLError: error]`);
  });

  it('should preserve all graphql errors', async () => {
    fetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          errors: [
            { message: 'first error', path: ['field'] },
            { message: 'second error', path: ['otherField'] },
          ],
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 400,
        }
      )
    );

    await expect(gql({ query, variables: void 0 })).rejects.toMatchObject({
      message: '1. first error\n2. second error',
      extensions: {
        graphQLErrors: [
          { message: 'first error', path: ['field'] },
          { message: 'second error', path: ['otherField'] },
        ],
      },
    });
  });

  it('should include response status when graphql error body is empty', async () => {
    fetch.mockResolvedValue(
      new Response(JSON.stringify({ data: null }), {
        headers: {
          'content-type': 'application/json',
        },
        status: 500,
        statusText: 'Internal Server Error',
      })
    );

    await expect(gql({ query, variables: void 0 })).rejects.toMatchObject({
      message: 'GraphQL request failed with status 500 Internal Server Error',
      extensions: {
        status: 500,
        code: 'INTERNAL_SERVER_ERROR',
        operationName: 'query',
        statusText: 'Internal Server Error',
        responseBody: { data: null },
      },
    });
  });
});