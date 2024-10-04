import { Box, Button, Flex, Text } from "@radix-ui/themes";
import { formatEther } from "ethers";
import useVoteProposals from "../hooks/useVoteProposal";
import useExecuteProposal from "../hooks/useExecuteProposal";

const Proposal = ({
  id,
  description,
  amount,
  minRequiredVote,
  votecount,
  deadline,
  executed,
}) => {
  const { vote, isVoting } = useVoteProposals();
  const { execute, loading: executing } = useExecuteProposal();

  return (
    <Box className="bg-slate-400 rounded-md shadow-sm p-4 w-96">
      <Text className="text-2xl mb-4">Proposals</Text>
      <Box className="w-full">
        <Flex className="flex gap-4">
          <Text>Description:</Text>
          <Text className="font-bold">{description}</Text>
        </Flex>
        <Flex className="flex gap-4">
          <Text>Amount:</Text>
          <Text className="font-bold">{formatEther(amount)} ETH</Text>
        </Flex>
        <Flex className="flex gap-4">
          <Text>Required Vote:</Text>
          <Text className="font-bold">{Number(minRequiredVote)}</Text>
        </Flex>
        <Flex className="flex gap-4">
          <Text>Vote Count:</Text>
          <Text className="font-bold">{Number(votecount)}</Text>
        </Flex>
        <Flex className="flex gap-4">
          <Text>Deadline:</Text>
          <Text className="font-bold">
            {new Date(Number(deadline) * 1000).toLocaleDateString()}
          </Text>
        </Flex>
        <Flex className="flex gap-4">
          <Text>Executed:</Text>
          <Text className="font-bold">{String(executed)}</Text>
        </Flex>
      </Box>
      {votecount >= minRequiredVote ? (
        <Button
          className={`bg-green-500 ${
            ((Number(deadline) > new Date().getTime()/1000) || executing) && "bg-opacity-60"
          } text-white font-bold w-full mt-4 p-4 rounded-md shadow-sm`}
          onClick={() => execute(id)}
          disabled={(Number(deadline) > new Date().getTime()/1000) || executing || !!executed}
        >
          {executing ? "Executing..." : !!executed ? "Executed" : "Execute"}
        </Button>
      ) : (
        <Button
          className={`bg-blue-500 ${
            isVoting && "bg-opacity-60"
          } text-white font-bold w-full mt-4 p-4 rounded-md shadow-sm`}
          onClick={() => vote(id)}
          disabled={isVoting}
        >
          {isVoting ? "Voting..." : "Vote"}
        </Button>
      )}
    </Box>
  );
};

export default Proposal;
