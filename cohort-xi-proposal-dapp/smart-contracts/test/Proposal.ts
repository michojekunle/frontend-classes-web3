import { expect } from "chai";
import { ethers } from "hardhat";
import { ProposalContract, ProposalContract__factory } from "../typechain-types";


describe("ProposalContract", function () {
  let proposalContract: ProposalContract;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;

  beforeEach(async function () {
    // Get the ContractFactory and Signers
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Deploy the contract using ethers v6 syntax
    const ProposalContractFactory: ProposalContract__factory = await ethers.getContractFactory("ProposalContract");
    proposalContract = (await ProposalContractFactory.deploy()) as ProposalContract;
    await proposalContract.waitForDeployment();

    // Fund the contract with some Ether
    await owner.sendTransaction({
      to: await proposalContract.getAddress(),
      value: ethers.parseEther("10"), // 10 ETH
    });
  });

  describe("Creating proposals", function () {
    it("Should create a new proposal correctly", async function () {
      const description = "Fund development project";
      const recipient = addr1.address;
      const amount = ethers.parseEther("1");
      const votingPeriod = 100; // seconds
      const minVotesToPass = 2;

      await expect(proposalContract.createProposal(description, recipient, amount, votingPeriod, minVotesToPass))
        .to.emit(proposalContract, "ProposalCreated")
        .withArgs(
          1,
          description,
          recipient,
          amount,
          await getDeadline(votingPeriod),
          minVotesToPass
        );

      const proposal = await proposalContract.proposals(1);
      expect(proposal.description).to.equal(description);
      expect(proposal.recipient).to.equal(recipient);
      expect(proposal.amount).to.equal(amount);
      expect(proposal.voteCount).to.equal(0n);
      expect(proposal.executed).to.equal(false);
    });

    it("Should revert when creating a proposal with invalid data", async function () {
      const recipient = addr1.address;
      const amount = ethers.parseEther("0"); // Invalid amount
      const votingPeriod = 0; // Invalid period
      const minVotesToPass = 0; // Invalid votes to pass

      await expect(
        proposalContract.createProposal("Invalid proposal", recipient, amount, votingPeriod, minVotesToPass)
      ).to.be.revertedWithCustomError(proposalContract, "AmountMustBeGreaterThanZero");
    });
  });

  describe("Voting on proposals", function () {
    beforeEach(async function () {
      const description = "Fund development project";
      const recipient = addr1.address;
      const amount = ethers.parseEther("1");
      const votingPeriod = 100; // seconds
      const minVotesToPass = 2;

      await proposalContract.createProposal(description, recipient, amount, votingPeriod, minVotesToPass);
    });

    it("Should allow voting on a proposal", async function () {
      await expect(proposalContract.connect(addr1).vote(1))
        .to.emit(proposalContract, "Voted")
        .withArgs(1, addr1.address);

      const proposal = await proposalContract.proposals(1);
      expect(proposal.voteCount).to.equal(1n);
      expect(await proposalContract.hasVoted(addr1.address, 1)).to.equal(true);
    });

    it("Should revert if voting more than once", async function () {
      await proposalContract.connect(addr1).vote(1);
      await expect(proposalContract.connect(addr1).vote(1)).to.be.revertedWithCustomError(
        proposalContract,
        "AlreadyVoted"
      );
    });

    it("Should revert if voting after the deadline", async function () {
      // Move time forward
      await ethers.provider.send("evm_increaseTime", [200]);
      await ethers.provider.send("evm_mine");

      await expect(proposalContract.connect(addr1).vote(1)).to.be.revertedWithCustomError(
        proposalContract,
        "VotingPeriodHasEnded"
      );
    });
  });

  describe("Executing proposals", function () {
    beforeEach(async function () {
      const description = "Fund development project";
      const recipient = addr1.address;
      const amount = ethers.parseEther("1");
      const votingPeriod = 100; // seconds
      const minVotesToPass = 2;

      await proposalContract.createProposal(description, recipient, amount, votingPeriod, minVotesToPass);
    });

    it("Should execute proposal with enough votes and after the deadline", async function () {
      await proposalContract.connect(addr1).vote(1);
      await proposalContract.connect(addr2).vote(1);

      // Move time forward
      await ethers.provider.send("evm_increaseTime", [200]);
      await ethers.provider.send("evm_mine");

      await expect(proposalContract.executeProposal(1))
        .to.emit(proposalContract, "ProposalExecuted")
        .withArgs(1);

      const proposal = await proposalContract.proposals(1);
      expect(proposal.executed).to.equal(true);
    });

    it("Should revert if not enough votes to pass", async function () {
      await proposalContract.connect(addr1).vote(1);

      // Move time forward
      await ethers.provider.send("evm_increaseTime", [200]);
      await ethers.provider.send("evm_mine");

      await expect(proposalContract.executeProposal(1)).to.be.revertedWithCustomError(
        proposalContract,
        "NotEnoughVotesToPass"
      );
    });
  });
});

// Utility function to get the deadline timestamp
async function getDeadline(votingPeriod: number): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp + votingPeriod + 1;
}
