import { useWeb3ModalAccount } from "@web3modal/ethers/react";

const useIsChairPerson = () => {
    const { address } = useWeb3ModalAccount();

    return address === import.meta.env.VITE_ballot_chair_person;
};

export default useIsChairPerson;
