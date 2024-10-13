import { Model } from 'objection';

class Claim extends Model {
  static get tableName() {
    return 'claims';
  }

  id!: number;
  user_address!: string;
  period!: number;
  amount!: number;
  claimed_at!: string;
}

export default Claim;
