import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('claims', (table) => {
    table.increments('id').primary();
    table.string('user_address').references('address').inTable('users');
    table.integer('period');
    table.bigInteger('amount');
    table.timestamp('claimed_at').defaultTo(knex.fn.now());
    table.unique(['user_address', 'period']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('claims');
}
