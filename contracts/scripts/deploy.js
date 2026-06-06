const hre = require("hardhat");
const { createPublicClient, createWalletClient, custom, getContract } = require("viem");
const { hardhat } = require("viem/chains");

async function main() {
  const [deployer] = await hre.network.provider.send("eth_accounts");
  const walletClient = createWalletClient({
    account: deployer,
    chain: hardhat,
    transport: custom(hre.network.provider)
  });
  const publicClient = createPublicClient({
    chain: hardhat,
    transport: custom(hre.network.provider)
  });

  const contracts = {};
  for (const name of ["AgentProfile", "Escrow", "TicketNFT"]) {
    const contract = await deploy(name, walletClient, publicClient);
    contracts[name] = contract.address;
  }

  console.log(
    JSON.stringify(
      {
        network: hre.network.name,
        chainId: 31337,
        deployer,
        contracts
      },
      null,
      2
    )
  );
}

async function deploy(name, walletClient, publicClient) {
  const artifact = await hre.artifacts.readArtifact(name);
  const hash = await walletClient.sendTransaction({
    data: artifact.bytecode
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return getContract({
    address: receipt.contractAddress,
    abi: artifact.abi,
    client: { public: publicClient, wallet: walletClient }
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
