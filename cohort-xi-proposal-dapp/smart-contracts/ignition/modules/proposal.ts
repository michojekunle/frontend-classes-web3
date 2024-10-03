// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ProposalContractModule = buildModule("ProposalContractModule", (m) => {

  const ProposalContract = m.contract("ProposalContract");

  return { ProposalContract };
});

export default ProposalContractModule;
