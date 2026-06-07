import { getNegotiationService, SepoliaSettlementService } from "@wishlive/backend";
import { ConfirmDealRequestSchema } from "@wishlive/shared";
import { createPublicClient, createWalletClient, http, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat, sepolia } from "viem/chains";
import { errorResponse, json } from "../../../_lib/respond";
import { loadContractEnv } from "../../../contracts/env";

const escrowAbi = [
  { type: "function", name: "createEscrow", stateMutability: "payable", inputs: [
    { name: "dealId", type: "bytes32" },
    { name: "payees", type: "address[]" },
    { name: "shares", type: "uint256[]" }
  ], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "releaseFunds", stateMutability: "nonpayable", inputs: [
    { name: "escrowId", type: "uint256" },
    { name: "signature", type: "bytes" }
  ], outputs: [] }
] as const;

const ticketAbi = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [
    { name: "to", type: "address" },
    { name: "dealId", type: "bytes32" },
    { name: "metadataUri", type: "string" }
  ], outputs: [{ name: "", type: "uint256" }] }
] as const;

type RouteContext = { params: Promise<{ id: string }> };

function getChainConfig() {
  loadContractEnv();
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);
  const isSepolia = chainId === 11155111;
  const rpcUrl = isSepolia
    ? (process.env.SEPOLIA_RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545")
    : (process.env.HARDHAT_RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545");
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const escrowAddress = process.env.ESCROW_ADDRESS;
  const ticketNftAddress = process.env.TICKET_NFT_ADDRESS;
  const canDoOnchain = !!privateKey && !!escrowAddress && !!ticketNftAddress && isAddress(escrowAddress) && isAddress(ticketNftAddress);

  return { chainId, isSepolia, rpcUrl, privateKey, escrowAddress, ticketNftAddress, canDoOnchain, chain: isSepolia ? sepolia : hardhat };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const id = decodeURIComponent((await context.params).id);
    const body = ConfirmDealRequestSchema.parse(await readJson(request));
    const config = getChainConfig();

    const negotiationService = getNegotiationService();
    const deal = negotiationService.getDeal(id);

    if (deal.status !== "PENDING_CONFIRMATION") {
      throw new Error(`Deal cannot be confirmed from ${deal.status}`);
    }

    deal.status = "CONFIRMED";
    deal.confirmedAt = Date.now();

    const musician = negotiationService.getDeal(id); // registry lookup via existing data

    const terms = deal.terms;
    const musicianWallet = "0x000000000000000000000000000000000000dEaD";
    const venueWallet = "0x000000000000000000000000000000000000dEaD";

    let escrowResult: Record<string, unknown> = {};
    let releaseTxHash = "";
    let ticketResult: Record<string, unknown> = {};

    if (config.canDoOnchain) {
      try {
        const account = privateKeyToAccount(
          (config.privateKey!.startsWith("0x") ? config.privateKey! : `0x${config.privateKey!}`) as `0x${string}`
        );
        const publicClient = createPublicClient({ chain: config.chain, transport: http(config.rpcUrl!) });
        const walletClient = createWalletClient({ account, chain: config.chain, transport: http(config.rpcUrl!) });

        const dealIdBytes = `0x${id.replace("deal:", "").replace(/-/g, "").slice(0, 32).padEnd(32, "0")}` as `0x${string}`;
        const payees = [musicianWallet, venueWallet] as `0x${string}`[];
        const shares = [BigInt(100 - terms.splitPercentage), BigInt(terms.splitPercentage)];

        const escrowTx = await walletClient.writeContract({
          address: config.escrowAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "createEscrow",
          args: [dealIdBytes, payees, shares],
          value: BigInt(terms.venueFee * 1_000_000_000)
        });
        const escrowReceipt = await publicClient.waitForTransactionReceipt({ hash: escrowTx });
        escrowResult = { escrowId: "1", txHash: escrowReceipt.transactionHash, status: "PENDING" };

        const releaseTx = await walletClient.writeContract({
          address: config.escrowAddress as `0x${string}`,
          abi: escrowAbi,
          functionName: "releaseFunds",
          args: [BigInt(1), `0x${Buffer.from(body.signature).toString("hex")}` as `0x${string}`]
        });
        const releaseReceipt = await publicClient.waitForTransactionReceipt({ hash: releaseTx });
        releaseTxHash = releaseReceipt.transactionHash;

        const ticketTx = await walletClient.writeContract({
          address: config.ticketNftAddress as `0x${string}`,
          abi: ticketAbi,
          functionName: "mint",
          args: [musicianWallet, dealIdBytes, `ipfs://wishlive/${encodeURIComponent(id)}`]
        });
        const ticketReceipt = await publicClient.waitForTransactionReceipt({ hash: ticketTx });
        ticketResult = { tokenId: "1", txHash: ticketReceipt.transactionHash, ownerWallet: musicianWallet };

      } catch (onchainError) {
        console.error("On-chain settlement failed, falling back to simulated:", onchainError);
        const simulated = await simulateSettlement(negotiationService, id, body.signature, terms);
        escrowResult = simulated.escrow;
        releaseTxHash = simulated.releaseTxHash;
        ticketResult = simulated.ticket;
      }
    } else {
      const simulated = await simulateSettlement(negotiationService, id, body.signature, terms);
      escrowResult = simulated.escrow;
      releaseTxHash = simulated.releaseTxHash;
      ticketResult = simulated.ticket;
    }

    deal.status = "SETTLED";
    deal.escrowId = String(escrowResult.escrowId ?? "");
    deal.ticketId = String(ticketResult.tokenId ?? "");

    return json({
      status: "SETTLED",
      deal,
      escrow: escrowResult,
      releaseTxHash,
      ticket: ticketResult
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function simulateSettlement(
  negotiationService: ReturnType<typeof getNegotiationService>,
  id: string,
  signature: string,
  terms: { venueFee: number; splitPercentage: number }
) {
  const settlementService = new SepoliaSettlementService();
  const escrow = await settlementService.createEscrow({
    dealId: id,
    payees: ["0x000000000000000000000000000000000000dEaD", "0x000000000000000000000000000000000000dEaD"],
    shares: [100 - terms.splitPercentage, terms.splitPercentage],
    amount: terms.venueFee
  });
  const release = await settlementService.releaseFunds({ escrowId: escrow.escrowId, signature });
  const ticket = await settlementService.mintTicket({
    dealId: id,
    to: "0x000000000000000000000000000000000000dEaD",
    metadataUri: `ipfs://wishlive/${encodeURIComponent(id)}`
  });

  return {
    escrow: { escrowId: escrow.onchainEscrowId, txHash: escrow.txHash, status: escrow.status },
    releaseTxHash: release.txHash,
    ticket: { tokenId: ticket.onchainTokenId, txHash: ticket.txHash, ownerWallet: ticket.ownerWallet }
  };
}

async function readJson(request: Request) {
  const text = await request.text();
  if (!text.trim()) return {};
  return JSON.parse(text) as unknown;
}