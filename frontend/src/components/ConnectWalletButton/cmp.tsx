import React from "react";
import {
  ConnectWallet,
  ConnectWalletText,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletDropdownLink,
} from "@coinbase/onchainkit/wallet";

import {
  Address,
  Avatar,
  EthBalance,
  Identity,
  Name,
} from "@coinbase/onchainkit/identity";

export default function ConnectWalletButton() {
  return (
    <Wallet>
      <ConnectWallet>
        <ConnectWalletText>Connect Wallet</ConnectWalletText>
        <Avatar className="h-6 w-6" />
        <Name />
      </ConnectWallet>
      <WalletDropdown>
        <Identity className="px-4 pt-3 pb-2">
          <Avatar />
          <Name />
          <Address />
          <EthBalance />
        </Identity>
        <WalletDropdownLink
          icon="wallet"
          href="https://keys.coinbase.com"
          target="_blank"
        >
          Wallet
        </WalletDropdownLink>
        <WalletDropdownDisconnect />
      </WalletDropdown>
    </Wallet>
  );
}
