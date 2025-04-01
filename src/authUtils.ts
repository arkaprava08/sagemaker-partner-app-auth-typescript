import { createHash } from 'crypto';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HttpRequest } from '@aws-sdk/types';

export const HEADER_CONNECTION = 'Connection';
export const HEADER_X_AMZ_TARGET = 'X-Amz-Target';
export const HEADER_AUTHORIZATION = 'Authorization';
export const HEADER_PARTNER_APP_SERVER_ARN = 'X-SageMaker-Partner-App-Server-Arn';
export const HEADER_PARTNER_APP_AUTHORIZATION = 'X-Amz-Partner-App-Authorization';
export const HEADER_X_AMZ_CONTENT_SHA_256 = 'X-Amz-Content-SHA256';
export const CALL_PARTNER_APP_API_ACTION = 'SageMaker.CallPartnerAppApi';

const PAYLOAD_BUFFER = 1024 * 1024;
const EMPTY_SHA256_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD';

export interface SignedRequest {
  url: string;
  headers: Record<string, string>;
}

export class PartnerAppAuthUtils {
  static async getBodyHeader(body: Buffer | string | null): Promise<string> {
    if (!body) {
      return EMPTY_SHA256_HASH;
    }

    if (Buffer.isBuffer(body)) {
      return createHash('sha256').update(body).digest('hex');
    }

    if (typeof body === 'string') {
      return createHash('sha256').update(body).digest('hex');
    }

    return UNSIGNED_PAYLOAD;
  }

  static async getSignedRequest(
    sigv4: SignatureV4,
    appArn: string,
    url: string,
    method: string,
    headers: Record<string, string>,
    body: Buffer | string | null
  ): Promise<SignedRequest> {
    // Move API key to X-Amz-Partner-App-Authorization
    if (headers[HEADER_AUTHORIZATION]) {
      headers[HEADER_PARTNER_APP_AUTHORIZATION] = headers[HEADER_AUTHORIZATION];
    }

    // App Arn
    headers[HEADER_PARTNER_APP_SERVER_ARN] = appArn;

    // IAM Action
    headers[HEADER_X_AMZ_TARGET] = CALL_PARTNER_APP_API_ACTION;

    // Body
    headers[HEADER_X_AMZ_CONTENT_SHA_256] = await PartnerAppAuthUtils.getBodyHeader(body);

    // Connection header is excluded from server-side signature calculation
    const connectionHeader = headers[HEADER_CONNECTION];
    if (HEADER_CONNECTION in headers) {
      delete headers[HEADER_CONNECTION];
    }

    // Spaces are encoded as %20
    const encodedUrl = url.replace(/ /g, '%20');
    const parsedUrl = new URL(encodedUrl);

    // Create request for signing
    const request: HttpRequest = {
      method,
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers,
      body,
    };

    // Sign request
    const signedRequest = await sigv4.sign(request);

    // Reassemble headers
    const finalHeaders = { ...signedRequest.headers };
    if (connectionHeader) {
      finalHeaders[HEADER_CONNECTION] = connectionHeader;
    }

    return {
      url: encodedUrl,
      headers: finalHeaders,
    };
  }
} 