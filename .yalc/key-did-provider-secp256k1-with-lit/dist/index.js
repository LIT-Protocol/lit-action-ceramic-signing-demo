import { createJWS } from "did-jwt";
import { RPCError, createHandler } from "rpc-utils";
import * as u8a from "uint8arrays";
import elliptic from "elliptic";
import LitJsSdk from "lit-js-sdk";
import { toGeneralJWS, toJose, toStableObject, sha256, log } from "./util.js";
const ec = new elliptic.ec("secp256k1");
export const litActionSignAndGetSignature = async (sha256Payload, context) => {
    log("[litActionSignAndGetSignature] sha256Payload: ", sha256Payload);
    const authSig = await LitJsSdk.checkAndSignAuthMessage({ chain: "ethereum" });
    log("[litActionSignAndGetSignature] authSig:", authSig);
    const litNodeClient = new LitJsSdk.LitNodeClient({ litNetwork: "serrano" });
    await litNodeClient.connect();
    log("[litActionSignAndGetSignature] ipfsId:", context.ipfsId);
    const jsParams = {
        toSign: Array.from(sha256Payload),
        publicKey: decodeDIDWithLit(context.did),
        sigName: "sig1",
    };
    const executeOptions = {
        ...((context.ipfsId === undefined || !context.ipfsId) && {
            code: context.litCode,
        }),
        ...((context.litCode === undefined || !context.litCode) && {
            ipfsId: context.ipfsId,
        }),
        authSig,
        jsParams,
    };
    const response = await litNodeClient.executeJs(executeOptions);
    log("[litActionSignAndGetSignature] response:", response);
    return {
        r: response.signatures.sig1.r,
        s: response.signatures.sig1.s,
        recoveryParam: response.signatures.sig1.recid,
    };
};
export async function encodeDIDWithLit(param) {
    const PKP_PUBLIC_KEY = param.pkpPublicKey;
    log("[encodeDIDWithLit] PKP_PUBLIC_KEY:", PKP_PUBLIC_KEY);
    const pubBytes = ec
        .keyFromPublic(PKP_PUBLIC_KEY, "hex")
        .getPublic(true, "array");
    log("[encodeDIDWithLit] pubBytes:", pubBytes);
    const bytes = new Uint8Array(pubBytes.length + 2);
    bytes[0] = 0xe7;
    bytes[1] = 0x01;
    bytes.set(pubBytes, 2);
    log("[encodeDIDWithLit] bytes:", bytes);
    const did = `did:key:z${u8a.toString(bytes, "base58btc")}`;
    log(`[encodeDIDWithLit] did:`, did);
    return did;
}
export function decodeDIDWithLit(encodedDID) {
    const arr = encodedDID?.split(":");
    if (arr[0] != "did")
        throw Error("string should start with did:");
    if (arr[1] != "key")
        throw Error("string should start with did:key");
    if (arr[2].charAt(0) !== "z")
        throw Error("string should start with did:key:z");
    const str = arr[2].substring(1);
    log("[decodeDIDWithLit] str:", str);
    const bytes = u8a.fromString(str, "base58btc");
    const originalBytes = new Uint8Array(bytes.length - 2);
    bytes.forEach((_, i) => {
        originalBytes[i] = bytes[i + 2];
    });
    log("[decodeDIDWithLit] originalBytes:", originalBytes);
    const pubPoint = ec.keyFromPublic(originalBytes).getPublic();
    let pubKey = pubPoint.encode("hex", true);
    pubKey = pubKey.charAt(0) == "0" ? pubKey.substring(1) : pubKey;
    log("[decodeDIDWithLit] pubKey:", pubKey);
    return pubKey;
}
export function ES256KSignerWithLit(context) {
    log("[ES256KSignerWithLit]");
    const recoverable = false;
    return async (payload) => {
        const encryptedPayload = sha256(payload);
        log("[ES256KSignerWithLit] encryptedPayload:", encryptedPayload);
        const signature = await litActionSignAndGetSignature(encryptedPayload, context);
        log("[ES256KSignerWithLit] signature:", signature);
        return toJose(signature, recoverable);
    };
}
const signWithLit = async (payload, context) => {
    const did = context.did;
    log("[signWithLit] did:", did);
    const kid = `${did}#${did.split(":")[2]}`;
    log("[signWithLit] kid:", kid);
    const protectedHeader = {};
    const header = toStableObject(Object.assign(protectedHeader, { kid, alg: "ES256K" }));
    log("[signWithLit] header:", header);
    log("[signWithLit] payload:", payload);
    return createJWS(typeof payload === "string" ? payload : toStableObject(payload), ES256KSignerWithLit(context), header);
};
const didMethodsWithLit = {
    did_authenticate: async (contextParam, params) => {
        const payload = {
            did: contextParam.did,
            aud: params.aud,
            nonce: params.nonce,
            paths: params.paths,
            exp: Math.floor(Date.now() / 1000) + 600,
        };
        log("[didMethodsWithLit] payload:", payload);
        const response = await signWithLit(payload, contextParam);
        log("[didMethodsWithLit] response:", response);
        const general = toGeneralJWS(response);
        log("[didMethodsWithLit] general:", general);
        return general;
    },
    did_createJWS: async (contextParam, params) => {
        const requestDid = params.did.split("#")[0];
        if (requestDid !== contextParam.did)
            throw new RPCError(4100, `Unknown DID: ${contextParam.did}`);
        const jws = await signWithLit(params.payload, contextParam);
        log("[did_createJWS] jws:", jws);
        return { jws: toGeneralJWS(jws) };
    },
    did_decryptJWE: async () => {
        return { cleartext: "" };
    },
};
export class Secp256k1ProviderWithLit {
    constructor(context) {
        const handler = createHandler(didMethodsWithLit);
        this._handle = async (msg) => {
            log("[Secp256k1ProviderWithLit] this._handle(msg):", msg);
            const _handler = await handler(context, msg);
            return _handler;
        };
    }
    get isDidProvider() {
        return true;
    }
    async send(msg) {
        return await this._handle(msg);
    }
}
//# sourceMappingURL=index.js.map