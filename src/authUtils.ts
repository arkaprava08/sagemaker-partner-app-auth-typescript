import { Sha256 } from "@aws-crypto/sha256-js";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { Readable } from "stream";

const HEADER_CONNECTION = 'Connection';
const HEADER_X_AMZ_TARGET = 'X-Amz-Target';
const HEADER_AUTHORIZATION = 'Authorization';
const HEADER_PARTNER_APP_SERVER_ARN = 'X-SageMaker-Partner-App-Server-Arn';
const HEADER_PARTNER_APP_AUTHORIZATION = 'X-Amz-Partner-App-Authorization';
const HEADER_X_AMZ_CONTENT_SHA_256 = 'X-Amz-Content-SHA256';
const CALL_PARTNER_APP_API_ACTION = 'SageMaker.CallPartnerAppApi';

const PAYLOAD_BUFFER = 1024 * 1024;
const EMPTY_SHA256_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD';

export interface SignedRequest {
  url: string;
  headers: Record<string, string>;
}

export class PartnerAppAuthUtils {
  static async getSignedRequest(
    sigv4: SignatureV4,
    appArn: string,
    url: string,
    method: string,
    headers: Record<string, string>,
    body?: Buffer | string | null
  ): Promise<SignedRequest> {
    const updatedHeaders = { ...headers };

    if (HEADER_AUTHORIZATION in updatedHeaders) {
      updatedHeaders[HEADER_PARTNER_APP_AUTHORIZATION] = updatedHeaders[HEADER_AUTHORIZATION];
    }

    updatedHeaders[HEADER_PARTNER_APP_SERVER_ARN] = appArn;
    updatedHeaders[HEADER_X_AMZ_TARGET] = CALL_PARTNER_APP_API_ACTION;
    updatedHeaders[HEADER_X_AMZ_CONTENT_SHA_256] = await this.getBodyHeader(body);

    const connectionHeader = updatedHeaders[HEADER_CONNECTION];
    delete updatedHeaders[HEADER_CONNECTION];
    url=url.replace(/ /g,'%20')
    const urlObj = new URL(url)
    const request = new HttpRequest({
      method,
      protocol: urlObj.protocol,
      headers: updatedHeaders,
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      body,
    });

    const signedRequest = await sigv4.sign(request);

    if (connectionHeader) {
      signedRequest.headers[HEADER_CONNECTION] = connectionHeader;
    }

    return {
      url,
      headers: signedRequest.headers as Record<string, string>,
    };
  }

  static async getBodyHeader(body?: any): Promise<string> {
    if (!body) {
      return EMPTY_SHA256_HASH;
    }

    if (body instanceof Readable) {
      // For stream handling (optional)
      throw new Error("Streaming bodies not supported yet");
    }

    if (typeof body === "string" || Buffer.isBuffer(body)) {
      const hash = new Sha256();
      hash.update(body);
      const digest = await hash.digest();
      return Buffer.from(digest).toString("hex");
    }

    // Fallback for unknown body type
    return UNSIGNED_PAYLOAD;
  }
}