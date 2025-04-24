import postgres from 'postgres';

import { config } from '@/lib/config';

const connectionString = config.databaseUrl;
if (!connectionString) {
	console.error('DATABASE_URL is not defined');
	throw new Error('DATABASE_URL is not defined');
}
const sql = postgres(connectionString);

export default sql;

/**
 * SELECT rows from a table with optional where-clause object
 * Example: await SELECT('config', { guildId: '123', userId: '456' })
 */
export async function SELECT<T>(
	table: string,
	where?: Record<string, any>
): Promise<T[]> {
	let query = `SELECT * FROM ${table}`;
	const values: any[] = [];
	if (where && Object.keys(where).length > 0) {
		const clauses = Object.keys(where).map((key, i) => {
			values.push(where[key]);
			return `${key} = $${i + 1}`;
		});
		query += ' WHERE ' + clauses.join(' AND ');
	}
	return sql.unsafe(query, values);
}

/**
 * INSERT a row into a table
 * Example: await INSERT('config', { guildId: '123', userId: '456', channelId: '789' })
 */
export async function INSERT(
	table: string,
	values: Record<string, any>
): Promise<void> {
	const keys = Object.keys(values);
	const vals = Object.values(values);
	const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
	const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
	await sql.unsafe(query, vals);
}

/**
 * DELETE rows from a table with where-clause object
 * Example: await DELETE('config', { guildId: '123', userId: '456' })
 */
export async function DELETE(
	table: string,
	where: Record<string, any>
): Promise<number> {
	if (!where || Object.keys(where).length === 0)
		throw new Error('WHERE clause required');
	const clauses = Object.keys(where).map((key, i) => `${key} = $${i + 1}`);
	const query = `DELETE FROM ${table} WHERE ${clauses.join(' AND ')}`;
	const res = await sql.unsafe(query, Object.values(where));
	return (res as any).count || 0;
}
