export function databaseError(error) {
  const connectionCodes = new Set(["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EHOSTUNREACH", "ECONNRESET", "PROTOCOL_CONNECTION_LOST", "ER_ACCESS_DENIED_ERROR", "ER_BAD_DB_ERROR", "ER_CON_COUNT_ERROR"]);
  return connectionCodes.has(error.code)
    ? { code: "DATABASE_UNAVAILABLE", error: "The server cannot connect to the database. Generator status cannot be verified." }
    : { code: "TELEMETRY_QUERY_FAILED", error: "The server could not read the generator data. A database query or server configuration needs attention." };
}
