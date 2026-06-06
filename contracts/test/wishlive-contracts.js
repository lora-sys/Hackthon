const assert = require("node:assert/strict");
const hre = require("hardhat");
const {
  createPublicClient,
  createWalletClient,
  custom,
  getContract,
  keccak256,
  parseEther,
  stringToHex
} = require("viem");
const { hardhat } = require("viem/chains");

describe("WishLive frozen contracts", () => {
  it("registers and verifies an AgentProfile", async () => {
    const { accounts, walletClient, publicClient } = await clients();
    const agentProfile = await deploy("AgentProfile", walletClient, publicClient);
    const cardHash = keccak256(stringToHex("agent:musician:001"));

    await agentProfile.write.registerAgent([accounts[1].address, cardHash, "did:wishlive:musician:001"]);

    const agent = await agentProfile.read.getAgent([1n]);
    assert.equal(agent[0].toLowerCase(), accounts[1].address.toLowerCase());
    assert.equal(agent[1], cardHash);
    assert.equal(await agentProfile.read.verifyCard([accounts[1].address, cardHash]), true);
  });

  it("creates escrow and releases funds by shares", async () => {
    const { accounts, walletClient, publicClient } = await clients();
    const escrow = await deploy("Escrow", walletClient, publicClient);
    const dealId = keccak256(stringToHex("deal:001"));
    const beforeMusician = await publicClient.getBalance({ address: accounts[1].address });
    const beforeVenue = await publicClient.getBalance({ address: accounts[2].address });

    await escrow.write.createEscrow([dealId, [accounts[1].address, accounts[2].address], [78n, 22n]], {
      value: parseEther("1")
    });
    const pending = await escrow.read.getEscrow([1n]);
    assert.equal(pending[1], parseEther("1"));
    assert.equal(pending[2], 0);

    await escrow.write.releaseFunds([1n, "0x1234"]);
    const released = await escrow.read.getEscrow([1n]);
    assert.equal(released[1], 0n);
    assert.equal(released[2], 1);
    assert.equal((await publicClient.getBalance({ address: accounts[1].address })) - beforeMusician, parseEther("0.78"));
    assert.equal((await publicClient.getBalance({ address: accounts[2].address })) - beforeVenue, parseEther("0.22"));

    assert.ok(dealId);
  });

  it("refunds pending escrow to payer", async () => {
    const { accounts, walletClient, publicClient } = await clients();
    const escrow = await deploy("Escrow", walletClient, publicClient);
    const payer = accounts[0].address;

    await escrow.write.createEscrow([keccak256(stringToHex("deal:refund")), [accounts[1].address], [100n]], {
      value: parseEther("0.5")
    });
    await escrow.write.refund([1n]);

    const refunded = await escrow.read.getEscrow([1n]);
    assert.equal(refunded[1], 0n);
    assert.equal(refunded[2], 2);
    assert.ok(await publicClient.getBalance({ address: payer }));
  });

  it("mints, reads, and burns TicketNFT", async () => {
    const { accounts, walletClient, publicClient } = await clients();
    const ticket = await deploy("TicketNFT", walletClient, publicClient);
    const dealId = keccak256(stringToHex("deal:ticket"));

    await ticket.write.mint([accounts[1].address, dealId, "ipfs://wishlive/ticket/1"]);

    assert.equal((await ticket.read.ownerOf([1n])).toLowerCase(), accounts[1].address.toLowerCase());
    assert.equal(await ticket.read.tokenURI([1n]), "ipfs://wishlive/ticket/1");
    assert.equal(await ticket.read.getTicketDeal([1n]), dealId);
    assert.equal(await ticket.read.supportsInterface(["0x80ac58cd"]), true);

    const holder = createWalletClient({
      account: accounts[1].address,
      chain: hardhat,
      transport: custom(hre.network.provider)
    });
    const holderTicket = getContract({
      address: ticket.address,
      abi: ticket.abi,
      client: { public: publicClient, wallet: holder }
    });
    await holderTicket.write.burn([1n]);
    assert.equal(await ticket.read.balanceOf([accounts[1].address]), 0n);
  });

  it("runs register escrow release and mint as one flow", async () => {
    const { accounts, walletClient, publicClient } = await clients();
    const agentProfile = await deploy("AgentProfile", walletClient, publicClient);
    const escrow = await deploy("Escrow", walletClient, publicClient);
    const ticket = await deploy("TicketNFT", walletClient, publicClient);
    const cardHash = keccak256(stringToHex("agent:venue:007"));
    const dealId = keccak256(stringToHex("deal:full"));

    await agentProfile.write.registerAgent([accounts[2].address, cardHash, "did:wishlive:venue:007"]);
    await escrow.write.createEscrow([dealId, [accounts[1].address, accounts[2].address], [78n, 22n]], {
      value: parseEther("1")
    });
    await escrow.write.releaseFunds([1n, "0x1234"]);
    await ticket.write.mint([accounts[3].address, dealId, "ipfs://wishlive/full/1"]);

    assert.equal(await agentProfile.read.verifyCard([accounts[2].address, cardHash]), true);
    assert.equal((await escrow.read.getEscrow([1n]))[2], 1);
    assert.equal(await ticket.read.getTicketDeal([1n]), dealId);
  });
});

async function clients() {
  const accounts = await hre.network.provider.send("eth_accounts");
  const walletClient = createWalletClient({
    account: accounts[0],
    chain: hardhat,
    transport: custom(hre.network.provider)
  });
  const publicClient = createPublicClient({
    chain: hardhat,
    transport: custom(hre.network.provider)
  });
  return {
    accounts: accounts.map((address) => ({ address })),
    walletClient,
    publicClient
  };
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
