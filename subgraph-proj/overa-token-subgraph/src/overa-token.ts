import { BigInt } from "@graphprotocol/graph-ts";
import {
  TokensBurned,
  TokensMinted,
  OwnershipTransferred as OwnershipTransferredEvent,
  Transfer as TransferEvent,
  Approval as ApprovalEvent,
} from "../generated/OveraToken/OveraToken";
import { Burn, Approval, Transfer, User, Token, Mint, OwnershipTransferred } from "../generated/schema";

export function handleApproval(event: ApprovalEvent): void {
  let approval = new Approval(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  approval.owner = event.params.owner;
  approval.spender = event.params.spender;
  approval.value = event.params.value;
  approval.timestamp = event.block.timestamp;

  approval.save();
}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {
  // create a new ownership transferred entity
  let ownershipTransferred  = new OwnershipTransferred(event.transaction.hash.toHex() + '-' + event.logIndex.toString());

  ownershipTransferred.newOwner = event.params.newOwner;
  ownershipTransferred.previousOwner = event.params.previousOwner;
  ownershipTransferred.timestamp = event.block.timestamp;

  // save
  ownershipTransferred.save();
}

export function handleTokensBurned(event: TokensBurned): void {
  // create a new Entity
  let burn = new Burn(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );

  burn.from = event.params.from;
  burn.value = event.params.amount;
  burn.timestamp = event.block.timestamp;
  burn.save();

  // update Sender balances
  let fromUser = User.load(event.params.from.toHex());
  if(fromUser == null) {
    fromUser = new User(event.params.from.toHex());
    fromUser.balance = BigInt.fromI32(0);
  }

  fromUser.balance = fromUser.balance.minus(event.params.amount);
  fromUser.save();

  // update the total supply and total burned in tokens entity
  let token = Token.load("Token Stats");
  if(token === null){
    token = new Token("Token Stats");
    token.totalSupply = BigInt.fromI32(0);
    token.totalBurned = BigInt.fromI32(0);
    token.totalMinted = BigInt.fromI32(0);
    token.totalTranferred = BigInt.fromI32(0);
  }

  token.totalSupply = token.totalSupply.minus(event.params.amount);
  token.totalBurned = token.totalBurned.plus(event.params.amount);
  token.save();
}

export function handleTokensMinted(event: TokensMinted): void {
    // create a new Entity
    let mint = new Mint(
      event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    );
  
    mint.to = event.params.to;
    mint.value = event.params.amount;
    mint.timestamp = event.block.timestamp;
    mint.save();
  
    // update reciever balances
    let toUser = User.load(event.params.to.toHex());
    if(toUser == null) {
      toUser = new User(event.params.to.toHex());
      toUser.balance = BigInt.fromI32(0);
    }
  
    toUser.balance = toUser.balance.plus(event.params.amount);
    toUser.save();
  
    // update the total supply and total minted in tokens entity
    let token = Token.load("Token Stats");
    if(token === null){
      token = new Token("Token Stats");
      token.totalSupply = BigInt.fromI32(0);
      token.totalBurned = BigInt.fromI32(0);
      token.totalMinted = BigInt.fromI32(0);
      token.totalTranferred = BigInt.fromI32(0);
    }
  
    token.totalSupply = token.totalSupply.plus(event.params.amount);
    token.totalMinted = token.totalMinted.plus(event.params.amount);
    token.save();
}

export function handleTransfer(event: TransferEvent): void {
    // create a new Entity
    let transfer = new Transfer(
      event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    );
  
    transfer.from = event.params.from;
    transfer.to = event.params.to;
    transfer.value = event.params.value;
    transfer.timestamp = event.block.timestamp;
    transfer.save();
  
    // update sender balances
    let fromUser = User.load(event.params.from.toHex());
    if(fromUser == null) {
      fromUser = new User(event.params.from.toHex());
      fromUser.balance = BigInt.fromI32(0);
    }
  
    fromUser.balance = fromUser.balance.minus(event.params.value);
    fromUser.save();

    // update receiver balances
    let toUser = User.load(event.params.to.toHex());
    if(toUser == null) {
      toUser = new User(event.params.to.toHex());
      toUser.balance = BigInt.fromI32(0);
    }
  
    toUser.balance = toUser.balance.plus(event.params.value);
    toUser.save();
  
    // update the total transferred in tokens entity
    let token = Token.load("Token Stats");
    if(token === null){
      token = new Token("Token Stats");
      token.totalSupply = BigInt.fromI32(0);
      token.totalBurned = BigInt.fromI32(0);
      token.totalMinted = BigInt.fromI32(0);
      token.totalTranferred = BigInt.fromI32(0);
    }
    
    token.totalTranferred = token.totalTranferred.plus(event.params.value);
    token.save();
}
