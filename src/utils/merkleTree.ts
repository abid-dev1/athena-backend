import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';

interface UserData {
  address: string;
  allowedAmount: number;
  dailyLimit: number;
}

export const generateMerkleRoot = (users: UserData[]) => {
  const leaves = users.map((user) =>
    keccak256(
      ethers.utils.solidityPack(
        ['address', 'uint256', 'uint256'],
        [user.address, user.allowedAmount, user.dailyLimit]
      )
    )
  );

  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

  const merkleRoot = tree.getHexRoot();
  return { merkleRoot, tree };
};

export const getMerkleProof = (tree: MerkleTree, user: UserData) => {
  const leaf = keccak256(
    ethers.utils.solidityPack(
      ['address', 'uint256', 'uint256'],
      [user.address, user.allowedAmount, user.dailyLimit]
    )
  );

  const proof = tree.getHexProof(leaf);
  return proof;
};
