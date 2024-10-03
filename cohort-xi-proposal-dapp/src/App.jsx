import { Box } from "@radix-ui/themes";
import Layout from "./components/Layout";
import CreateProposalModal from "./components/CreateProposalModal";
import Proposals from "./components/Proposals";
import useContract from "./hooks/useContract";
import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import useFetchProposals from "./hooks/useFetchProposals";

function App() {
  const { proposals, isFetchingProposals } = useFetchProposals();

  return (
    <Layout>
      <Box className="flex justify-end p-4">
        <CreateProposalModal />
      </Box>
      <Proposals proposals={proposals} isFetchingProposals={isFetchingProposals}/>
    </Layout>
  );
}

export default App;
