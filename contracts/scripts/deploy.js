const hre = require("hardhat");
const { createPublicClient, createWalletClient, custom, getContract } = require("viem");
const { hardhat, sepolia } = require("viem/chains");

async function main() {
  const [deployer] = await hre.network.provider.send("eth_accounts");
  if (!deployer) {
    throw new Error(
      `No deployer account for ${hre.network.name}. Set DEPLOYER_PRIVATE_KEY and SEPOLIA_RPC_URL in .env for Sepolia.`
    );
  }
  const chain = hre.network.name === "sepolia" ? sepolia : hardhat;
  const walletClient = createWalletClient({
    account: deployer,
    chain,
    transport: custom(hre.network.provider)
  });
  const publicClient = createPublicClient({
    chain,
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
        chainId: chain.id,
        deployer,
        contracts,
        env: {
          NEXT_PUBLIC_CHAIN_ID: String(chain.id),
          NEXT_PUBLIC_RPC_URL: hre.network.name === "sepolia" ? "${SEPOLIA_RPC_URL}" : "${HARDHAT_RPC_URL}",
          AGENT_PROFILE_ADDRESS: contracts.AgentProfile,
          ESCROW_ADDRESS: contracts.Escrow,
          TICKET_NFT_ADDRESS: contracts.TicketNFT
        }
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
  console.error(`${name} deployed: ${receipt.contractAddress} (${hash})`);
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
