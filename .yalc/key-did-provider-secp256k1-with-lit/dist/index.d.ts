import { Signer } from "did-jwt";
import type { RPCRequest, RPCResponse, SendRequestFunc } from "rpc-utils";
import { ContextWithLit, DIDMethodNameWithLit, DIDProviderMethodsWithLit, DIDProviderWithLit, encodeDIDWithLitParam, EcdsaSignature } from "./interfaces.js";
export declare const litActionSignAndGetSignature: (sha256Payload: Uint8Array, context: ContextWithLit) => Promise<EcdsaSignature>;
export declare function encodeDIDWithLit(param: encodeDIDWithLitParam): Promise<string>;
export declare function decodeDIDWithLit(encodedDID: string): string;
export declare function ES256KSignerWithLit(context: ContextWithLit): Signer;
export declare class Secp256k1ProviderWithLit implements DIDProviderWithLit {
    _handle: SendRequestFunc<DIDProviderMethodsWithLit>;
    constructor(context: ContextWithLit);
    get isDidProvider(): boolean;
    send<Name extends DIDMethodNameWithLit>(msg: RPCRequest<DIDProviderMethodsWithLit, Name>): Promise<RPCResponse<DIDProviderMethodsWithLit, Name> | null>;
}
