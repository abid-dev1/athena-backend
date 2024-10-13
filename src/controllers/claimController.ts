
import { Request, Response } from 'express';
import { ethers } from 'ethers';
import Claim from '../models/Claim';
import User from '../models/User';
import * as dotenv from 'dotenv';
import AthenaTokenMerkle from '../artifacts/AthenaTokenMerkle.json';
import { generateMerkleRoot, getMerkleProof } from '../utils/merkleTree';
dotenv.config();

const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_API_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const contractAddress = 'YOUR_CONTRACT_ADDRESS';
const contractABI = AthenaTokenMerkle.abi;
const contract = new ethers.Contract(contractAddress, contractABI, wallet);
interface UserData {
  address: string;
  allowedAmount: number;
  dailyLimit: number;
}

export const claimReward = async (req: Request, res: Response) => {
  try {
    const { period, amount, allowedAmount, dailyLimit, merkleProof } = req.body;
    const userAddress = req.body.address || req.headers['x-user-address'];

    if (!userAddress) {
      return res.status(400).json({ error: 'User address is required.' });
    }

    // Verify if user exists; if not, create
    let user = await User.query().findById(userAddress);
    if (!user) {
      user = await User.query().insert({ address: userAddress });
    }

    // Check if the user has already claimed for the period
    const existingClaim = await Claim.query()
      .where({ user_address: userAddress, period })
      .first();

    if (existingClaim) {
      return res.status(400).json({ error: 'Reward already claimed for this period.' });
    }

    // Interact with the contract to claim reward
    const tx = await contract.claimReward(
      period,
      amount,
      allowedAmount,
      dailyLimit,
      merkleProof
    );
    await tx.wait();

    // Record the claim in the database
    await Claim.query().insert({
      user_address: userAddress,
      period,
      amount,
    });

    res.json({ message: 'Reward claimed successfully.', transactionHash: tx.hash });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
export const updateMerkleRoot = async (req: Request, res: Response) => {
  try {
    const { merkleRoot } = req.body;

    if (!merkleRoot) {
      return res.status(400).json({ error: 'Merkle root is required.' });
    }

    // Call the contract function
    const tx = await contract.updateMerkleRoot(merkleRoot);
    await tx.wait();

    res.json({ message: 'Merkle root updated successfully.', transactionHash: tx.hash });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
export const pauseContract = async (req: Request, res: Response) => {
  try {
    const tx = await contract.pause();
    await tx.wait();
    res.json({ message: 'Contract paused.', transactionHash: tx.hash });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const unpauseContract = async (req: Request, res: Response) => {
  try {
    const tx = await contract.unpause();
    await tx.wait();
    res.json({ message: 'Contract unpaused.', transactionHash: tx.hash });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const grantAdminRole = async (req: Request, res: Response) => {
  try {
    const { account } = req.body;

    if (!account) {
      return res.status(400).json({ error: 'Account address is required.' });
    }

    const ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('ADMIN_ROLE'));
    const tx = await contract.grantRole(ADMIN_ROLE, account);
    await tx.wait();

    res.json({ message: 'Admin role granted.', transactionHash: tx.hash });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const revokeAdminRole = async (req: Request, res: Response) => {
  try {
    const { account } = req.body;

    if (!account) {
      return res.status(400).json({ error: 'Account address is required.' });
    }

    const ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('ADMIN_ROLE'));
    const tx = await contract.revokeRole(ADMIN_ROLE, account);
    await tx.wait();

    res.json({ message: 'Admin role revoked.', transactionHash: tx.hash });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};



// This function would be used internally to prepare data
export const prepareMerkleData = async (req: Request, res: Response) => {
  try {
    const users: UserData[] = []; // Fetch or define user data
    const { merkleRoot, tree } = generateMerkleRoot(users);

    // Update the merkle root on the contract
    const tx = await contract.updateMerkleRoot(merkleRoot);
    await tx.wait();

    // Optionally, store the tree or proofs for users
    res.json({ message: 'Merkle root updated.', merkleRoot });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};


