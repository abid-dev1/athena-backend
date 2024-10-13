import express from 'express';
import { pauseContract, unpauseContract } from './../controllers/claimController';
import { claimReward } from '../controllers/claimController';

import { updateMerkleRoot } from '../controllers/claimController';
const router = express.Router();

router.post('/', claimReward);

router.post('/update-merkle-root', updateMerkleRoot);

router.post('/pause', pauseContract);
router.post('/unpause', unpauseContract);
router.post('/grant-admin', grantAdminRole);
router.post('/revoke-admin', revokeAdminRole);

export default router;
