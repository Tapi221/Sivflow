import pg from "pg";
const { Pool } = pg;
let pool = null;
const getDatabaseUrl = () => {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not set.");
    }
    return databaseUrl;
};
const getPostgresPool = () => {
    pool ??= new Pool({
        connectionString: getDatabaseUrl(),
    });
    return pool;
};
const postgresQuery = async (text, values = []) => await getPostgresPool().query(text, values);
const closePostgresPool = async () => {
    if (!pool)
        return;
    await pool.end();
    pool = null;
};
export { closePostgresPool, getPostgresPool, postgresQuery };
