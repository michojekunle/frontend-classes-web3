import { Avatar, Box, Card, Flex, Text } from "@radix-ui/themes";

const Proposal = ({ id, name, voteCount, handleVote }) => {
    return (
        <Card size="2" style={{ width: 425 }}>
            <Flex gap="" align="center">
                <Avatar size="4" radius="full" fallback={id} color="indigo" />
                <Box width={"100%"}>
                    <Flex justify={"between"} align={"center"}>
                        <Text as="div" weight="bold">
                            {name}
                        </Text>
                        <button
                            className="text-white bg-blue-600 py-1 px-4 rounded-md"
                            onClick={() => handleVote(id)}
                        >
                            Vote
                        </button>
                    </Flex>
                    <Text as="div" color="gray">
                        Number of Vote: {voteCount}
                    </Text>
                </Box>
            </Flex>
        </Card>
    );
};

export default Proposal;
