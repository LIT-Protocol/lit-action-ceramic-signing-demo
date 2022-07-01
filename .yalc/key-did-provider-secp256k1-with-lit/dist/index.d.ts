import { Signer } from "did-jwt";
import type { AuthParams, CreateJWSParams, DIDMethodName, DIDProviderMethods, DIDProvider, GeneralJWS, DecryptJWEParams } from "dids";
import type { RPCRequest, RPCResponse, SendRequestFunc, RPCConnection } from "rpc-utils";
export declare function encodeDID(publicKey: Uint8Array): string;
export declare class Secp256k1Provider implements DIDProvider {
    _handle: SendRequestFunc<DIDProviderMethods>;
    constructor(seed: Uint8Array);
    get isDidProvider(): boolean;
    send<Name extends DIDMethodName>(msg: RPCRequest<DIDProviderMethods, Name>): Promise<RPCResponse<DIDProviderMethods, Name> | null>;
}
export declare function encodeDIDWithLit(): Promise<string>;
export declare function ES256KSignerWithLit(): Signer;
export declare type DIDProviderMethodsWithLit = {
    did_authenticate: {
        params: AuthParams;
        result: GeneralJWS;
    };
    did_createJWS: {
        params: CreateJWSParams;
        result: {
            jws: GeneralJWS;
        };
    };
    did_decryptJWE: {
        params: DecryptJWEParams;
        result: {
            cleartext: string;
        };
    };
};
export declare type DIDMethodNameWithLit = keyof DIDProviderMethodsWithLit;
export declare type DIDProviderWithLit = RPCConnection<DIDProviderMethodsWithLit>;
export declare class Secp256k1ProviderWithLit implements DIDProviderWithLit {
    _handle: SendRequestFunc<DIDProviderMethodsWithLit>;
    constructor(did: string);
    get isDidProvider(): boolean;
    send<Name extends DIDMethodNameWithLit>(msg: RPCRequest<DIDProviderMethodsWithLit, Name>): Promise<RPCResponse<DIDProviderMethodsWithLit, Name> | null>;
}
