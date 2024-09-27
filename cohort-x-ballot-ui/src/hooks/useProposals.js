import { useCallback, useEffect, useState } from "react";
import { getProposalsContract } from "../constants/contracts";
import { readOnlyProvider } from "../constants/providers";
import { decodeBytes32String, ethers } from "ethers";

const useProposals = () => {
    const [proposals, setProposal] = useState({
        loading: true,
        data: [],
    });

    // const handleVoteEvent = (log) => {
    //     console.log("vote: ", log);
    //     const encodedProposalIndex = log.topics[2];
    //     const encodedVoteWeight = log.data;

    //     const decodedProposalIndex = abicoder.decode(
    //         ["uint256"],
    //         encodedProposalIndex
    //     );

    //     const decodedVoteWeight = abicoder.decode(
    //         ["uint256"],
    //         encodedVoteWeight
    //     );

    //     console.log("got hrer");

    //     const index = Number(decodedProposalIndex[0]);
    //     const voteWeight = Number(decodedVoteWeight[0]);

    //     console.log(index, voteWeight);

    //     setProposal((prev) => ({
    //         ...prev,
    //         data: prev.data.map((item, id) =>
    //             index === id
    //                 ? { ...item, voteCount: item.voteCount + voteWeight }
    //                 : item
    //         ),
    //     }));

    //     console.log("worked!");
    // };

    const handleVoteEventCallback = useCallback(
        (log) => {
            console.log("vote: ", log);
            const encodedProposalIndex = log.topics[2];
            const encodedVoteWeight = log.data;

            const decodedProposalIndex =
                ethers.AbiCoder.defaultAbiCoder().decode(
                    ["uint256"],
                    encodedProposalIndex
                );

            const decodedVoteWeight = ethers.AbiCoder.defaultAbiCoder().decode(
                ["uint256"],
                encodedVoteWeight
            );

            console.log("got hrer");

            const index = Number(decodedProposalIndex[0]);
            const voteWeight = Number(decodedVoteWeight[0]);

            console.log(index, voteWeight);

            const newData = [...proposals.data];

            newData[index].voteCount += voteWeight;

            setProposal((prev) => ({ ...prev, data: newData }));

            console.log("worked!");
        },
        [proposals.data]
    );

    useEffect(() => {
        const contract = getProposalsContract(readOnlyProvider);
        contract
            .getAllProposals()
            .then((res) => {
                const converted = res.map((item) => ({
                    name: decodeBytes32String(item.name),
                    voteCount: Number(item.voteCount),
                }));
                setProposal({
                    loading: false,
                    data: converted,
                });
            })
            .catch((err) => {
                console.error("error fetching proposals: ", err);
                setProposal((prev) => ({ ...prev, loading: false }));
            });

        const filter = {
            address: import.meta.env.VITE_ballot_contract_address,
            topics: [
                "0xafd3f234c1f8e944129b26b206d98e5752ad3336a4059938b4a3e990e9588530",
            ],
        };

        const wssProvider = new ethers.WebSocketProvider(
            import.meta.env.VITE_wss_rpc_url
        );

        wssProvider.on(filter, handleVoteEventCallback);

        return () => wssProvider.off(filter, handleVoteEventCallback);
    }, [handleVoteEventCallback]);

    return proposals;
};

export default useProposals;
