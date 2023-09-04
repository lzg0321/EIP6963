import { chainIDtoName, isDataURI, truncateAddress } from "../utils/functions";
import { EIP1193Provider, EVMProviderDetected } from "../utils/types";
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { useToast } from "./ui/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import React, { ChangeEventHandler, useCallback } from "react";
import defaultIcon from "../assets/default.svg";
import { ethers } from "ethers";

type Props = {
  clickHandler: () => Promise<void>;
  provider: EVMProviderDetected;
  modifyProviders: (provider: EVMProviderDetected) => void;
};

const wrapperVariants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
};

const connectVariants = {
  initial: {
    opacity: 0,
    x: 10,
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: 10,
  },
};

const accountVariants = {
  initial: {
    y: "-100%",
    opacity: 0,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -1,
  },
};

async function getBalance(provider: ethers.BrowserProvider, address: string) {

  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

type AccountProps = {
  index: number,
  account: string,
  provider: EIP1193Provider,
  chainId: string
}


const Account: React.FC<AccountProps> = ({ index, account, provider, chainId }) => {
  const { toast } = useToast();
  const [ethersProvider, setEthersProvider] = React.useState<ethers.BrowserProvider | null>(null);

  const [balance, setBalance] = React.useState<string>("");
  const [receiver, setReceiver] = React.useState<string>("");
  const [amount, setAmount] = React.useState<string>("");

  React.useEffect(() => {
    setEthersProvider(new ethers.BrowserProvider(provider));
  }, [provider]);

  React.useEffect(() => {
    if (!ethersProvider) {
      return;
    }
    (async () => {
      const bal = await getBalance(ethersProvider!, account);
      console.log('bal', bal);
      setBalance(bal);
    })();
  }, [ethersProvider, chainId]);

  const onAmount: ChangeEventHandler<HTMLInputElement> = useCallback((e)=>{
    setAmount(e.target.value);
  }, []);

  const onReceiver: ChangeEventHandler<HTMLInputElement> = useCallback((e)=>{
    setReceiver(e.target.value);
  }, []);


  const doTransfer = useCallback(async ()=>{
    if (!amount || !receiver) {
      console.log('Transaction invalid');
      return;
    }
    const signer = await ethersProvider!.getSigner();
    const tx = await signer.sendTransaction({
      to: receiver,
      value: ethers.parseEther(amount)
    });

    toast({
      description: "Transaction Submited: " + tx.hash,
    });
    await tx.wait();
    console.log('Transaction hash:', tx.hash);
    toast({
      description: "Transaction Succeed: " + tx.hash,
    });
  }, [ethersProvider, toast]);

  return <>

    <motion.div
      variants={accountVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`z-10 flex items-center justify-between px-4 py-2 ${index !== 0 ? `border-t border-zinc-800/60` : ``
        }`}
    >
      <p className="select-none">{truncateAddress(account)}</p>
      <div className="flex items-center justify-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              onClick={() => {
                navigator.clipboard.writeText(account);
                toast({
                  description: "Copied address to clipboard",
                });
              }}
            >
              <div className="p-1 transition-colors rounded-md bg-zinc-800 text-inherit hover:text-zinc-200">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M6.5 15.25V15.25C5.5335 15.25 4.75 14.4665 4.75 13.5V6.75C4.75 5.64543 5.64543 4.75 6.75 4.75H13.5C14.4665 4.75 15.25 5.5335 15.25 6.5V6.5"
                  ></path>
                  <rect
                    width="10.5"
                    height="10.5"
                    x="8.75"
                    y="8.75"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    rx="2"
                  ></rect>
                </svg>
              </div>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent side="left">
                <p>Copy to Clipboard</p>
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </TooltipProvider>
      </div>
    </motion.div>


    <div className="p-4">
      <label htmlFor="receiver" className="block text-white font-semibold">Balance:{balance}</label>
      <div className="flex items-center gap-2 mt-2">
        <input id="receiver" type="text" placeholder="Receiver" value={receiver} onChange={onReceiver} className="basis-2/3 text-white px-4 py-2 border rounded-md focus:outline-none focus:border-blue-500" />
        <input id="amount" type="text" placeholder="Amount" value={amount} onChange={onAmount} className="basis-1/3 text-white px-4 py-2 w-full border rounded-md focus:outline-none focus:border-blue-500" />
        <button className="flex-none px-4 py-2 border rounded-md bg-indigo-500 text-white" onClick={doTransfer}>Transfer</button>
      </div>
    </div>
  </>
}

const Wallet = (props: Props) => {
  const { clickHandler, provider, modifyProviders } = props;

  const [chain, setChain] = React.useState<string>("");
  const [chainId, setChainId] = React.useState<string>("");
  const [isConnecting, setIsConnecting] = React.useState<boolean>(false);

  const isConnected = !!provider.accounts.length;

  React.useEffect(() => {
    if (!provider.provider) return;
    const currentProvider = provider.provider;
    currentProvider.on("accountsChanged", (accounts: string[]) => {
      console.log("accountsChanged", accounts);
      provider.accounts = accounts;
      modifyProviders(provider);
    });
    currentProvider.on("chainChanged", async (chainID: any) => {
      console.log("chainChanged", chainID);
      const chainName = await chainIDtoName(chainID);
      setChain(chainName);
    });
    currentProvider.on("disconnect", (error: Error) => {
      console.log("disconnect", error);
    });
  }, [provider.provider, provider, modifyProviders]);

  React.useEffect(() => {
    async function getCurrentChainName() {
      if (!provider.provider) return;
      const currentProvider = provider.provider;
      const chainID = (await currentProvider.request({
        method: "eth_chainId",
      })) as string;
      setChainId(chainID);
      console.log('chainID', chainID);
      const chainName = await chainIDtoName(chainID);
      setChain(chainName);
    }
    getCurrentChainName();
    console.log("Connected: ", isConnected);
  }, [provider.provider]);

  const switch2Polygon = useCallback(async () => {
    try {
      await provider.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x89' }] // Polygon 网络的 chainId
      });
      console.log('Switched to Polygon Network');
    } catch (error) {
      console.error('Error switching to Polygon Network:', error);
      return;
    }
  }, [provider.provider])

  return (
    <motion.div
      variants={wrapperVariants}
      initial="initial"
      animate="animate"
      key={provider.info.uuid}
      className="overflow-hidden text-base"
    >
      <div className="relative z-10 flex items-center justify-between px-3 py-2 rounded-md shadow-lg bg-zinc-800 text-zinc-100">
        <div>
          <div className="flex items-center gap-2">
            <img
              className="w-5 h-5 rounded"
              src={
                isDataURI(provider.info.icon) ? provider.info.icon : defaultIcon
              }
              alt={provider.info.name}
            />
            <h1>{provider.info.name}</h1>
            <AnimatePresence mode="wait">
              {chain && isConnected && (
                <>
                  <motion.p
                    variants={accountVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    key={chain}
                    className="flex items-center gap-1 pr-1.5 px-2 py-1 text-xs leading-tight text-green-200 border border-green-600 rounded-md bg-green-900/25"
                  >
                    <span className="max-w-[15ch] truncate">{chain}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-2.5 h-2.5"
                    >
                      <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
                      <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
                    </svg>
                  </motion.p>
                  {
                    chainId && chainId !== '0x89' && (<button className="flex items-center text-xs pr-1.5 px-2 py-1 leading-tight rounded-md bg-indigo-500" onClick={switch2Polygon}>switch 2 ploygon</button>)
                  }
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <AnimatePresence mode="wait" initial={false}>
            {!provider.provider ? (
              <motion.div
                key="Connected"
                variants={connectVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="rounded-md select-none py-1.5 px-2 pl-2.5 bg-red-900/25 border border-red-500/75 text-red-200 text-xs leading-none flex items-center gap-1 cursor-not-allowed"
              >
                <span>No Provider</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-3 h-3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                {isConnecting ? (
                  <motion.button
                    key="Connecting"
                    variants={connectVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="rounded-full py-1.5 px-3 bg-indigo-900/50 border border-indigo-700 text-sm leading-none flex items-center gap-2 cursor-not-allowed pointer-events-none text-indigo-100/80"
                  >
                    <span>Connecting</span>
                    <span className="loader"></span>
                  </motion.button>
                ) : isConnected ? (
                  <motion.div
                    key="Connected"
                    variants={connectVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="rounded-full select-none py-1.5 px-3 bg-indigo-900 border border-indigo-500 text-indigo-100 text-xs leading-none flex items-center gap-2"
                  >
                    <span>Connected</span>
                    <div className="relative block w-2 h-2 bg-green-300 rounded-full shadow-inner shadow-green-500">
                      <span className="absolute inline-flex w-full h-full bg-green-400 rounded-full opacity-75 animate-halo"></span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    key="Connect"
                    onClick={() => {
                      setIsConnecting(true);
                      clickHandler().finally(() => {
                        // Wait for the animation to finish for framer motion to dismount the component
                        setTimeout(() => {
                          setIsConnecting(false);
                        }, 500);
                      });
                    }}
                    variants={connectVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="rounded-full py-1.5 px-3 bg-indigo-500 text-sm leading-none flex items-center gap-1 hover:bg-indigo-600 transition-colors hover:shadow-lg"
                  >
                    <span>Connect</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.25}
                      stroke="currentColor"
                      className="w-3 h-3"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                      />
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="relative w-full h-fit">
        {isConnected && (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                variants={accountVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="relative flex flex-col text-sm bg-zinc-900/75 text-zinc-400 rounded-b-md"
              >
                <div className="absolute bottom-full w-full h-4 bg-zinc-900/75 z-[0]" />
                <AnimatePresence mode="wait">
                  {provider.accounts.map((account, index) => (
                    <Account key={account} account={account} index={index} provider={provider.provider} chainId={chainId} />
                  ))}

                </AnimatePresence>

              </motion.div>

            </AnimatePresence>

          </>
        )}
      </div>
    </motion.div>
  );
};

export default Wallet;
