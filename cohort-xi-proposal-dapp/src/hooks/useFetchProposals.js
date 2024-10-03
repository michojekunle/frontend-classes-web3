import multicallAbi from "../ABI/multicall2.json";
import proposalAbi from "../ABI/proposal.json";
import { Contract, Interface } from "ethers";
import { multicall2Address, proposalsContractAddress } from "../constants";
import { useCallback, useEffect } from "react";
import { useMemo } from "react";
import { useState } from "react";
import useContract from "./useContract";
import useRunners from "./useRunners";

const useFetchProposals = () => {
  const [proposals, setProposals] = useState([]);
  const [isFetchingProposals, setIsFetchingProposals] = useState(false);

  const intfce = useMemo(() => new Interface(proposalAbi), []);

  const readOnlyProposalContract = useContract(true);
  const { readOnlyProvider } = useRunners();

  const fetchProposals = useCallback(async () => {
    if (!readOnlyProposalContract) return;
    try {
      setIsFetchingProposals(true);

      const proposalCount = Number(
        await readOnlyProposalContract.proposalCount()
      );

      const ids = Array.from({ length: proposalCount }, (_, i) => i + 1);

      ids.pop();

      const calls = ids.map((id) => ({
        target: proposalsContractAddress,
        callData: intfce.encodeFunctionData("proposals", [id]),
      }));

      const multicall = new Contract(
        multicall2Address,
        multicallAbi,
        readOnlyProvider
      );

      // eslint-disable-next-line no-unused-vars
      const [_, proposalsResult] = await multicall.aggregate.staticCall(calls);

      const decodedProposals = proposalsResult.map((result) =>
        intfce.decodeFunctionResult("proposals", result)
      );

      setProposals(
        decodedProposals.map((proxy, idx) => ({
          id: idx + 1,
          deadline: proxy.votingDeadline,
          minRequiredVote: Number(proxy.minVotesToPass),
          amount: proxy.amount,
          description: proxy.description,
          executed: proxy.executed,
          votecount: Number(proxy.voteCount),
        }))
      );
      setIsFetchingProposals(false);
    } catch (error) {
      console.log("An error occured: ", error);
      setIsFetchingProposals(false);
    }
  }, [readOnlyProposalContract, readOnlyProvider, intfce]);

  const updateProposal = useCallback((proposalId) => {
    console.log("updating proposals");

    setProposals((prevProposals) =>
      prevProposals.map((proposal, index) => {
        if (proposal.id === proposalId) {
          console.log(
            "updated voteCount of proposal with index:::",
            proposalId
          );
          return {
            ...proposal,
            votecount: proposal.votecount + 1,
          };
        }
        return proposal;
      })
    );
  }, []);

  const handleVoted = (updatedValue) => {
    console.log("updatedValue", updatedValue);
    updateProposal(Number(updatedValue));
    console.log(proposals);
  };

  const handleProposalCreated = (updatedValue) => {
    console.log("Proposal Creation Value:::", updatedValue);

    fetchProposals();
  };

  useEffect(() => {
    fetchProposals();

    if (!readOnlyProposalContract) return;

    readOnlyProposalContract.on("ProposalCreated", handleProposalCreated);

    readOnlyProposalContract.on("Voted", handleVoted);

    return () => {
      readOnlyProposalContract.off("ProposalCreated", handleProposalCreated);
      readOnlyProposalContract.off("Voted", handleVoted);
    };
  }, [intfce, readOnlyProposalContract]);

  return { proposals, isFetchingProposals };
};

export default useFetchProposals;
