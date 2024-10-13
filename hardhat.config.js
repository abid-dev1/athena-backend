require('@nomicfoundation/hardhat-ethers');
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config();

module.exports = {
  defaultNetwork: 'localhost',
  networks: {
    hardhat: {},
    goerli: {
      url: process.env.ALCHEMY_API_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    // Add other networks if needed
  },
  solidity: '0.8.20',
};
