import { useCallback } from "react";
import { liskSepoliaNetwork } from "../connection";
import { useState } from "react";
import useContract from "./useContract";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { toast } from "react-toastify";
import { ErrorDecoder } from "ethers-decode-error";
import abi from '../ABI/proposal.json';

const errorDecoder = ErrorDecoder.create([abi]);

const customReasonMapper = ({ name, args, reason }) => {
  switch (name) {
    case "InvalidSwapToken":
      // You can access the error parameters using their index:
      return `Invalid swap with token contract address ${args[0]}.`;
      // Or, you could also access the error parameters using their names:
      return `Invalid swap with token contract address ${args["token"]}.`;
    // You can map any other custom errors here
    default:
      // This handles the non-custom errors
      return reason ?? "An error has occurred";
  }
};

const useExecuteProposal = () => {
  const contract = useContract(true);
  const { address } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const [isExecuting, setIsExecuting] = useState(false);

  return {
    execute: useCallback(
      async (proposalId) => {
        if (!proposalId) {
          toast.error("Missing proposal Id Field!");
          return;
        }

        setIsExecuting(true);
        if (!address) {
          toast.error("Connect your wallet!");
          setIsExecuting(false);
          return;
        }
        if (Number(chainId) !== liskSepoliaNetwork.chainId) {
          toast.error(
            "You are not connected to the right network, Please connect to liskSepolia"
          );
          setIsExecuting(false);
          return;
        }

        if (!contract) {
          toast.error("Cannot get contract!");
          setIsExecuting(false);
          return;
        }

        try {
          console.log(proposalId);
          const estimateGas = await contract.executeProposal(proposalId);
          const tx = await contract.executeProposal(proposalId);

          const reciept = await tx.wait();

          if (reciept.status === 1) {
            toast.success("Proposal execution successful");
            setIsExecuting(false);
            return;
          }
          toast.error("Proposal execution failed");
          setIsExecuting(false);
          return;
        } catch (error) {
          const decodedError = await errorDecoder.decode(error);
          const reason = customReasonMapper(decodedError);

          // Prints "Invalid swap with token contract address 0xabcd."
          console.log("Custom error reason:", reason);
          console.log("Decoded error:", decodedError);
          // // Prints "true"
          // console.log(type === ErrorType.CustomError);
          toast.error(decodedError.reason);
          console.error("error while executing proposal: ", decodedError.reason);
          setIsExecuting(false);
        }
        return;
      },
      [address, chainId, contract]
    ),
    loading: isExecuting,
  };
};

export default useExecuteProposal;
