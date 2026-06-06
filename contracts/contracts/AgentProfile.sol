// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgentProfile {
    struct Agent {
        address wallet;
        bytes32 agentCardHash;
        string did;
        uint256 registeredAt;
    }

    uint256 private nextAgentId = 1;
    mapping(uint256 => Agent) private agents;
    mapping(address => uint256[]) private walletAgentIds;
    mapping(address => mapping(bytes32 => bool)) private walletCardHashes;

    event AgentRegistered(uint256 indexed agentId, address indexed wallet, bytes32 agentCardHash, string did);
    event AgentMetadataUpdated(uint256 indexed agentId, bytes32 newCardHash);

    function registerAgent(address wallet, bytes32 agentCardHash, string calldata did) external returns (uint256) {
        require(wallet != address(0), "wallet required");
        require(agentCardHash != bytes32(0), "card hash required");
        require(bytes(did).length > 0, "did required");

        uint256 agentId = nextAgentId;
        nextAgentId += 1;
        agents[agentId] = Agent({
            wallet: wallet,
            agentCardHash: agentCardHash,
            did: did,
            registeredAt: block.timestamp
        });
        walletAgentIds[wallet].push(agentId);
        walletCardHashes[wallet][agentCardHash] = true;

        emit AgentRegistered(agentId, wallet, agentCardHash, did);
        return agentId;
    }

    function getAgent(uint256 agentId) external view returns (address wallet, bytes32 agentCardHash, string memory did, uint256 registeredAt) {
        Agent storage agent = agents[agentId];
        require(agent.wallet != address(0), "agent not found");
        return (agent.wallet, agent.agentCardHash, agent.did, agent.registeredAt);
    }

    function updateMetadata(uint256 agentId, bytes32 newCardHash) external {
        Agent storage agent = agents[agentId];
        require(agent.wallet != address(0), "agent not found");
        require(msg.sender == agent.wallet, "only agent wallet");
        require(newCardHash != bytes32(0), "card hash required");

        agent.agentCardHash = newCardHash;
        walletCardHashes[agent.wallet][newCardHash] = true;
        emit AgentMetadataUpdated(agentId, newCardHash);
    }

    function verifyCard(address wallet, bytes32 agentCardHash) external view returns (bool) {
        return walletCardHashes[wallet][agentCardHash];
    }
}
