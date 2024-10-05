import { useCallback } from "react";
import { liskSepoliaNetwork } from "../connection";
import { useState } from "react";
import useContract from "./useContract";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { toast } from "react-toastify";
import { ErrorDecoder } from "ethers-decode-error";
import abi from "../ABI/proposal.json";

const errorDecoder = ErrorDecoder.create([abi]);

const useVoteProposals = () => {
  const contract = useContract(true);
  const { address } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const [isVoting, setIsVoting] = useState(false);

  return {
    vote: useCallback(
      async (proposalId) => {
        if (!proposalId) {
          toast.error("Missing proposal Id Field!");
          return;
        }

        setIsVoting(true);
        if (!address) {
          toast.error("Connect your wallet!");
          setIsVoting(false);
          return;
        }
        if (Number(chainId) !== liskSepoliaNetwork.chainId) {
          toast.error(
            "You are not connected to the right network, Please connect to liskSepolia"
          );
          setIsVoting(false);
          return;
        }

        if (!contract) {
          toast.error("Cannot get contract!");
          setIsVoting(false);
          return;
        }

        try {
          const estimatedGas = await contract.vote.estimateGas(proposalId);

          const tx = await contract.vote(proposalId, {
            gasLimit: (estimatedGas * BigInt(120)) / BigInt(100),
          });

          const reciept = await tx.wait();

          if (reciept.status === 1) {
            toast.success("Proposal vote successful");
            setIsVoting(false);
            return;
          }
          toast.error("Proposal vote failed");
          setIsVoting(false);
          return;
        } catch (error) {
          const decodedError = await errorDecoder.decode(error);

          // Prints "Invalid swap with token contract address 0xabcd."
          console.log("Decoded error:", decodedError);
          // // Prints "true"
          // console.log(type === ErrorType.CustomError);
          toast.error(decodedError.reason);
          console.error(
            "error while executing proposal: ",
            decodedError.reason
          );
          setIsVoting(false);
        }
        return;
      },
      [address, chainId, contract]
    ),
    isVoting,
  };
};

export default useVoteProposals;
