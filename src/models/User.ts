import { Model } from 'objection';

class User extends Model {
  static get tableName() {
    return 'users';
  }

  address!: string;
  created_at!: string;
  updated_at!: string;
}

export default User;
