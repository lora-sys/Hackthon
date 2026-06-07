import { createHash } from "node:crypto";
import { getRegistryService, RedisEventBus, createEventEnvelope } from "@wishlive/backend";
import { AgentCardSchema } from "@wishlive/shared";
import { createPublicClient, createWalletClient, http, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat, sepolia } from "viem/chains";
import { errorResponse, json } from "../../_lib/respond";
import { loadContractEnv } from "../env";

const agentProfileAbi = [
  {
    type: "function",
    name: "registerAgent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "wallet", type: "address" },
      { name: "agentCardHash", type: "bytes32" },
      { name: "did", type: "string" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

export async function POST(request: Request) {
  const eventBus = new RedisEventBus();
  try {
    loadContractEnv();
    const card = AgentCardSchema.parse(await request.json());
    await getRegistryService().register(card);
    const agentCardHash = `0x${createHash("sha256").update(JSON.stringify(card)).digest("hex")}` as `0x${string}`;
    const address = process.env.AGENT_PROFILE_ADDRESS;
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? process.env.HARDHAT_CHAIN_ID ?? 31337);
    const rpcUrl =
      chainId === sepolia.id
        ? process.env.SEPOLIA_RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL
        : process.env.HARDHAT_RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL;

    if (!address || !privateKey || !rpcUrl || !isAddress(address)) {
      await eventBus.publish(
        "settlement.events",
        createEventEnvelope({
          type: "contract.agent_profile.pending",
          source: "agent:business:007",
          data: {
            agentId: card.agent_id,
            wallet: card.wallet,
            chainId,
            reason: "missing contract address, rpc, or deployer key"
          }
        })
      );
      return json({
        status: "PENDING_CONTRACT_CONFIG",
        agentId: card.agent_id,
        agentCardHash,
        chainId,
        registry: "REGISTERED"
      });
    }

    const account = privateKeyToAccount(normalizePrivateKey(privateKey));
    const chain = chainId === sepolia.id ? sepolia : hardhat;
    const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
    const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
    const txHash = await walletClient.writeContract({
      address: address as `0x${string}`,
      abi: agentProfileAbi,
      functionName: "registerAgent",
      args: [card.wallet as `0x${string}`, agentCardHash, card.did]
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    await eventBus.publish(
      "settlement.events",
      createEventEnvelope({
        type: "contract.agent_profile.registered",
        source: "agent:business:007",
        data: {
          agentId: card.agent_id,
          wallet: card.wallet,
          txHash,
          chainId
        }
      })
    );

    return json({
      status: "REGISTERED_ONCHAIN",
      agentId: card.agent_id,
      agentCardHash,
      chainId,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
      registry: "REGISTERED"
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await eventBus.close();
  }
}

function normalizePrivateKey(value: string) {
  return (value.startsWith("0x") ? value : `0x${value}`) as `0x${string}`;
}
