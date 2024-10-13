// src/db.ts
import knex from 'knex';
import { Model } from 'objection';
import knexConfig from '../knexfile';
import * as dotenv from 'dotenv';

dotenv.config();

const environment = 'development';
const config = knexConfig[environment];

const connection = knex(config);

Model.knex(connection);

export default connection;
