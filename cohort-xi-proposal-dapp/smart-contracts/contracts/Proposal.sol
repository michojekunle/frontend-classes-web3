// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Proposal Contract
/// @notice This contract allows for the creation of proposals, voting, and execution of proposals.
/// @dev Each proposal can be executed if it has enough votes and the voting period has ended.
contract ProposalContract {
    /// @dev Proposal struct defines the structure for each proposal
    struct Proposal {
        string description;
        address payable recipient;
        uint256 amount;
        uint256 voteCount;
        uint256 votingDeadline;
        uint256 minVotesToPass;
        bool executed;
    }

    // State variables
    mapping(uint256 => Proposal) public proposals;
    mapping(address => mapping(uint256 => bool)) public hasVoted;
    uint256 public proposalCount;

    // Custom errors for better gas efficiency
    error AmountMustBeGreaterThanZero();
    error VotingPeriodMustBeGreaterThanZero();
    error MinVotesToPassMustBeGreaterThanZero();
    error InvalidProposalID();
    error AlreadyVoted();
    error VotingPeriodHasEnded();
    error NotEnoughVotesToPass();
    error InsufficientBalance();
    error ProposalAlreadyExecuted();
    error VotingPeriodNotEnded();

    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        string description,
        address recipient,
        uint256 amount,
        uint256 votingDeadline,
        uint256 minVotesToPass
    );
    event Voted(uint256 indexed proposalId, address voter);
    event ProposalExecuted(uint256 indexed proposalId);

    /// @notice Constructor initializes the proposal count to 1
    /// @dev This is done to avoid confusion with the default ID of 0
    constructor() {
        proposalCount = 1;
    }

    /// @notice Create a new proposal
    /// @dev Requires a valid amount, voting period, and minimum votes to pass
    /// @param _description Description of the proposal
    /// @param _recipient The address to receive the funds if the proposal passes
    /// @param _amount The amount to transfer if the proposal is executed
    /// @param _votingPeriod The duration (in seconds) for the voting period
    /// @param _minVotesToPass The minimum number of votes required for the proposal to pass
    function createProposal(
        string memory _description,
        address payable _recipient,
        uint256 _amount,
        uint256 _votingPeriod,
        uint256 _minVotesToPass
    ) public {
        if (_amount == 0) revert AmountMustBeGreaterThanZero();
        if (_votingPeriod == 0) revert VotingPeriodMustBeGreaterThanZero();
        if (_minVotesToPass == 0) revert MinVotesToPassMustBeGreaterThanZero();

        _createProposal(_description, _recipient, _amount, _votingPeriod, _minVotesToPass);
    }

    /// @notice Vote on a specific proposal
    /// @dev A user can only vote once per proposal, and only if the voting period is still active
    /// @param _proposalId The ID of the proposal to vote on
    function vote(uint256 _proposalId) public {
        if (_proposalId == 0 || _proposalId >= proposalCount) revert InvalidProposalID();
        if (hasVoted[msg.sender][_proposalId]) revert AlreadyVoted();
        if (block.timestamp > proposals[_proposalId].votingDeadline) revert VotingPeriodHasEnded();

        _vote(_proposalId);
    }

    /// @notice Execute a proposal if the conditions are met
    /// @dev Can only be executed if the proposal has enough votes and the voting period has ended
    /// @param _proposalId The ID of the proposal to execute
    function executeProposal(uint256 _proposalId) public {
        if (_proposalId == 0 || _proposalId >= proposalCount) revert InvalidProposalID();

        Proposal storage proposal = proposals[_proposalId];

        if (block.timestamp <= proposal.votingDeadline) revert VotingPeriodNotEnded();
        if (proposal.executed) revert ProposalAlreadyExecuted();
        if (proposal.voteCount < proposal.minVotesToPass) revert NotEnoughVotesToPass();
        if (address(this).balance < proposal.amount) revert InsufficientBalance();

        _executeProposal(_proposalId);
    }

    /// @notice Internal function to handle proposal creation
    /// @dev Increments the proposal count after creation
    /// @param _description The proposal description
    /// @param _recipient The recipient address
    /// @param _amount The amount to be transferred if executed
    /// @param _votingPeriod The period for voting (in seconds)
    /// @param _minVotesToPass Minimum votes to pass the proposal
    function _createProposal(
        string memory _description,
        address payable _recipient,
        uint256 _amount,
        uint256 _votingPeriod,
        uint256 _minVotesToPass
    ) internal {
        uint256 proposalId = proposalCount;
        proposals[proposalId] = Proposal({
            description: _description,
            recipient: _recipient,
            amount: _amount,
            voteCount: 0,
            votingDeadline: block.timestamp + _votingPeriod,
            minVotesToPass: _minVotesToPass,
            executed: false
        });

        emit ProposalCreated(proposalId, _description, _recipient, _amount, block.timestamp + _votingPeriod, _minVotesToPass);
        proposalCount++;
    }

    /// @notice Internal function to handle voting logic
    /// @dev Updates the proposal's vote count and marks the voter as having voted
    /// @param _proposalId The ID of the proposal to vote on
    function _vote(uint256 _proposalId) internal {
        proposals[_proposalId].voteCount++;
        hasVoted[msg.sender][_proposalId] = true;

        emit Voted(_proposalId, msg.sender);
    }

    /// @notice Internal function to handle proposal execution
    /// @dev Transfers the amount to the recipient if conditions are met
    /// @param _proposalId The ID of the proposal to execute
    function _executeProposal(uint256 _proposalId) internal {
        Proposal storage proposal = proposals[_proposalId];
        proposal.executed = true;

        // Using call instead of transfer to handle potential reentrancy
        (bool success, ) = proposal.recipient.call{value: proposal.amount}("");
        require(success, "Transfer failed");

        emit ProposalExecuted(_proposalId);
    }

    /// @notice Allows the contract to receive Ether
    receive() external payable {}
}
