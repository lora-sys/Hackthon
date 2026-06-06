// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TicketNFT {
    string public constant name = "WishLive Ticket";
    string public constant symbol = "WLTIX";

    uint256 private nextTokenId = 1;
    mapping(uint256 => address) private owners;
    mapping(address => uint256) private balances;
    mapping(uint256 => string) private tokenUris;
    mapping(uint256 => bytes32) private ticketDeals;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    function mint(address to, bytes32 dealId, string calldata metadataUri) external returns (uint256) {
        require(to != address(0), "to required");
        require(dealId != bytes32(0), "deal required");
        require(bytes(metadataUri).length > 0, "metadata required");

        uint256 tokenId = nextTokenId;
        nextTokenId += 1;
        owners[tokenId] = to;
        balances[to] += 1;
        tokenUris[tokenId] = metadataUri;
        ticketDeals[tokenId] = dealId;

        emit Transfer(address(0), to, tokenId);
        return tokenId;
    }

    function burn(uint256 tokenId) external {
        address owner = owners[tokenId];
        require(owner != address(0), "token not found");
        require(msg.sender == owner, "only owner");

        balances[owner] -= 1;
        delete owners[tokenId];
        delete tokenUris[tokenId];
        delete ticketDeals[tokenId];

        emit Transfer(owner, address(0), tokenId);
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner = owners[tokenId];
        require(owner != address(0), "token not found");
        return owner;
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "owner required");
        return balances[owner];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(owners[tokenId] != address(0), "token not found");
        return tokenUris[tokenId];
    }

    function getTicketDeal(uint256 tokenId) external view returns (bytes32) {
        require(owners[tokenId] != address(0), "token not found");
        return ticketDeals[tokenId];
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x80ac58cd || interfaceId == 0x5b5e139f || interfaceId == 0x01ffc9a7;
    }
}
