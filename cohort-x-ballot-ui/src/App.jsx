import { Container, Flex, Text } from "@radix-ui/themes";
import { configureWeb3Modal } from "./connection";
import "@radix-ui/themes/styles.css";
import Header from "./component/Header";
import Proposal from "./component/Proposal";
import DelegateVote from "./component/DelegateVote";
import useProposals from "./hooks/useProposals";
import useHandleVote from "./hooks/useHandleVote";
import useDelegateVote from "./hooks/useDelegateVote";
import { useState } from "react";
import useNumberOfVoters from "./hooks/useNumberOfVoters";

configureWeb3Modal();

function App() {
    const { loading, data: proposals } = useProposals();
    const [delegateAddress, setDelegateAddress] = useState("");

    const handleVote = useHandleVote();
    const handleDelegateVote = useDelegateVote(delegateAddress);
    const numberOfEligibleVoters = useNumberOfVoters();

    return (
        <Container>
            <Header />
            <main className="mt-6">
                <Flex mb="4" justify="between">
                    <DelegateVote
                        delegateAddress={delegateAddress}
                        setDelegateAddress={setDelegateAddress}
                        handleDelegate={handleDelegateVote}
                    />
                    <span>Eligible Voters: {numberOfEligibleVoters}</span>
                </Flex>

                <Flex wrap={"wrap"} gap={"6"}>
                    {loading ? (
                        <Text>Loading...</Text>
                    ) : proposals.length !== 0 ? (
                        proposals.map((item, index) => (
                            <Proposal
                                key={index}
                                name={item.name}
                                handleVote={handleVote}
                                id={index}
                                voteCount={Number(item.voteCount)}
                            />
                        ))
                    ) : (
                        <Text>Could not get proposals!!</Text>
                    )}
                </Flex>
            </main>
        </Container>
    );
}

export default App;
