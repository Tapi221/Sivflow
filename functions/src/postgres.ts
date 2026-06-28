import pg from "pg";

const { Pool } = pg;
let pool: pg.Pool | null = null;

const getDatabaseUrl = (): string => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  return databaseUrl;
};
const getPostgresPool = (): pg.Pool => {
  pool ??= new Pool({
    connectionString: getDatabaseUrl(),
  });

  return pool;
};
const postgresQuery = async <T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<pg.QueryResult<T>> => await getPostgresPool().query<T>(text, values);
const closePostgresPool = async (): Promise<void> => {
  if (!pool) return;

  await pool.end();
  pool = null;
};

export { closePostgresPool, getPostgresPool, postgresQuery };
