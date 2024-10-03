import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import useContract from "./useContract";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKitNetwork } from "@reown/appkit/react";
import { liskSepoliaNetwork } from "../connection";
import { parseEther } from "ethers";

const useCreateProposal = () => {
  const contract = useContract(true);
  const { address } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const [isLoading, setIsLoading] = useState(false);

  return {
    create: useCallback(
      async (description, recipient, amount, duration, minVote) => {
        if (!description || !recipient || !amount || !duration || !minVote) {
          toast.error("Missing field(s)");
          return;
        }

        setIsLoading(true);
        if (!address) {
          toast.error("Connect your wallet!");
          setIsLoading(false);
          return;
        }
        if (Number(chainId) !== liskSepoliaNetwork.chainId) {
          toast.error("You are not connected to the right network");
          setIsLoading(false);
          return;
        }

        if (!contract) {
          toast.error("Cannot get contract!");
          setIsLoading(false);
          return;
        }

        try {
          const estimatedGas = await contract.createProposal.estimateGas(
            description,
            recipient,
            parseEther(amount),
            duration,
            minVote
          );
          const tx = await contract.createProposal(
            description,
            recipient,
            parseEther(amount),
            duration,
            minVote,
            {
              gasLimit: (estimatedGas * BigInt(120)) / BigInt(100),
            }
          );
          const reciept = await tx.wait();

          if (reciept.status === 1) {
            toast.success("Proposal Creation successful");
            setIsLoading(false);
            return;
          }
          toast.error("Proposal Creation failed");
          setIsLoading(false);
          return;
        } catch (error) {
          console.error("error while creating proposal: ", error);
          toast.error("Proposal Creation errored");
          setIsLoading(false);
        }
        return;
      },
      [address, chainId, contract]
    ),
    isLoading,
  };
};

export default useCreateProposal;
