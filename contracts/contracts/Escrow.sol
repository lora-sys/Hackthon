// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Escrow {
    enum EscrowStatus {
        PENDING,
        RELEASED,
        REFUNDED
    }

    struct EscrowRecord {
        bytes32 dealId;
        address payer;
        address[] payees;
        uint256[] shares;
        uint256 balance;
        EscrowStatus status;
    }

    uint256 private nextEscrowId = 1;
    mapping(uint256 => EscrowRecord) private escrows;

    event EscrowCreated(uint256 indexed escrowId, bytes32 indexed dealId, uint256 balance);
    event FundsReleased(uint256 indexed escrowId, uint256 balance);
    event Refunded(uint256 indexed escrowId, uint256 balance);

    function createEscrow(bytes32 dealId, address[] calldata payees, uint256[] calldata shares) external payable returns (uint256) {
        require(dealId != bytes32(0), "deal required");
        require(msg.value > 0, "funds required");
        require(payees.length > 0, "payees required");
        require(payees.length == shares.length, "length mismatch");

        uint256 totalShares = 0;
        for (uint256 i = 0; i < shares.length; i += 1) {
            require(payees[i] != address(0), "payee required");
            require(shares[i] > 0, "share required");
            totalShares += shares[i];
        }
        require(totalShares == 100, "shares must equal 100");

        uint256 escrowId = nextEscrowId;
        nextEscrowId += 1;
        escrows[escrowId] = EscrowRecord({
            dealId: dealId,
            payer: msg.sender,
            payees: payees,
            shares: shares,
            balance: msg.value,
            status: EscrowStatus.PENDING
        });

        emit EscrowCreated(escrowId, dealId, msg.value);
        return escrowId;
    }

    function releaseFunds(uint256 escrowId, bytes calldata signature) external {
        EscrowRecord storage record = escrows[escrowId];
        require(record.payer != address(0), "escrow not found");
        require(record.status == EscrowStatus.PENDING, "not pending");
        require(signature.length > 0, "confirmation required");

        uint256 balance = record.balance;
        record.balance = 0;
        record.status = EscrowStatus.RELEASED;

        uint256 sent = 0;
        for (uint256 i = 0; i < record.payees.length; i += 1) {
            uint256 amount = i == record.payees.length - 1
                ? balance - sent
                : (balance * record.shares[i]) / 100;
            sent += amount;
            (bool ok, ) = payable(record.payees[i]).call{value: amount}("");
            require(ok, "transfer failed");
        }

        emit FundsReleased(escrowId, balance);
    }

    function refund(uint256 escrowId) external {
        EscrowRecord storage record = escrows[escrowId];
        require(record.payer != address(0), "escrow not found");
        require(record.status == EscrowStatus.PENDING, "not pending");
        require(msg.sender == record.payer, "only payer");

        uint256 balance = record.balance;
        record.balance = 0;
        record.status = EscrowStatus.REFUNDED;
        (bool ok, ) = payable(record.payer).call{value: balance}("");
        require(ok, "refund failed");

        emit Refunded(escrowId, balance);
    }

    function getEscrow(uint256 escrowId) external view returns (address[] memory payees, uint256 balance, EscrowStatus status) {
        EscrowRecord storage record = escrows[escrowId];
        require(record.payer != address(0), "escrow not found");
        return (record.payees, record.balance, record.status);
    }
}
