const { ethers, upgrades } = require('hardhat');

async function main() {
  const AthenaTokenMerkle = await ethers.getContractFactory('AthenaTokenMerkle');
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contract with account:', deployer.address);

  const contract = await upgrades.deployProxy(
    AthenaTokenMerkle,
    ['Athena Token', 'ATH', deployer.address],
    { initializer: 'initialize' }
  );

  await contract.deployed();

  console.log('Contract deployed at:', contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
