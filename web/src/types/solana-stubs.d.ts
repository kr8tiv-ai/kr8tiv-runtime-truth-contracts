// ============================================================================
// Solana Dependency Type Stubs
// These modules will be installed when NFT minting goes live.
// For now, stub them to prevent TypeScript compilation errors.
// ============================================================================

declare module '@solana/wallet-adapter-react' {
  export interface WalletContextState {
    publicKey: { toBase58(): string } | null;
    signTransaction: ((tx: unknown) => Promise<unknown>) | null;
    signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | null;
    connected: boolean;
  }
  export function useWallet(): WalletContextState;
}

declare module '@metaplex-foundation/umi' {
  export type Umi = any;
  export type PublicKey = any;
  export type Signer = any;
  export type TransactionBuilder = any;
  export function publicKey(key: string): PublicKey;
  export function generateSigner(umi: Umi): Signer;
  export function transactionBuilder(): TransactionBuilder;
  export function some<T>(value: T): { __option: 'Some'; value: T };
  export function none(): { __option: 'None' };
}

declare module '@metaplex-foundation/umi-bundle-defaults' {
  export function createUmi(endpoint: string): import('@metaplex-foundation/umi').Umi;
}

declare module '@metaplex-foundation/umi-signer-wallet-adapters' {
  export function walletAdapterIdentity(wallet: unknown): any;
}

declare module '@metaplex-foundation/mpl-candy-machine' {
  export function mplCandyMachine(): any;
  export function fetchCandyMachine(umi: any, publicKey: any): Promise<any>;
  export function safeFetchCandyMachine(umi: any, publicKey: any): Promise<any>;
  export function fetchCandyGuard(umi: any, key: any): Promise<any>;
  export function mintV2(umi: any, input: any): any;
  export function safeFetchCandyGuard(umi: any, key: any): Promise<any>;
}

declare module '@metaplex-foundation/mpl-toolbox' {
  export function setComputeUnitLimit(umi: any, input: any): any;
}

declare module '@irys/web-upload' {
  export function WebUploader(adapter: any): any;
}

declare module '@irys/web-upload-solana' {
  export const WebSolana: any;
}

declare module 'bignumber.js' {
  export default class BigNumber {
    static ROUND_CEIL: number;
    constructor(value: string | number);
    toFixed(): string;
    toString(): string;
    multipliedBy(n: number | BigNumber): BigNumber;
    dividedBy(n: number | BigNumber): BigNumber;
    integerValue(rm?: number): BigNumber;
  }
}
