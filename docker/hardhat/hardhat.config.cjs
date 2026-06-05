/** @type import("hardhat/config").HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      chainId: Number(process.env.HARDHAT_CHAIN_ID || 31337),
    },
  },
  paths: {
    cache: "./cache",
  },
};
