import { useMemo } from "react";
import useRunners from "./useRunners";
import { Contract } from "ethers";
import ABI from "../ABI/proposal.json";

const useContract = (withSigner = false) => {
    const { readOnlyProvider, signer } = useRunners();

    return useMemo(() => {
        if (withSigner) {
            if (!signer) return null;
            return new Contract(
                "0xd5E4484326EB3Dd5FBbd5Def6d02aFE817fD4684",
                ABI,
                signer
            );
        }
        return new Contract(
            "0xd5E4484326EB3Dd5FBbd5Def6d02aFE817fD4684",
            ABI,
            readOnlyProvider
        );
    }, [readOnlyProvider, signer, withSigner]);
};

export default useContract;
