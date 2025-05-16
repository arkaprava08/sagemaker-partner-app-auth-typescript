import { SignatureV4 } from "@aws-sdk/signature-v4";
import { AwsCredentialIdentity, Credentials } from "@aws-sdk/types";
import { PartnerAppAuthUtils, SignedRequest } from "./authUtils";
import * as dotenv from 'dotenv';
import { Sha256 } from "@aws-crypto/sha256-js";
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

dotenv.config();

const SERVICE_NAME = "sagemaker";
const AWS_PARTNER_APP_ARN_REGEX = /^arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:partner-app\/.*/;

export class PartnerAppAuthProvider {
  private appArn: string;
  private region: string;
  private sigv4: SignatureV4;
  private credentialProvider: () => Promise<AwsCredentialIdentity>;

  constructor(credentials?: AwsCredentialIdentity) {
    const appArn = process.env["AWS_PARTNER_APP_ARN"];
    if (!appArn) throw new Error(`Environment variable PARTNER_APP_ARN is required`);
    if (!AWS_PARTNER_APP_ARN_REGEX.test(appArn)) throw new Error("Invalid ARN format");

    this.appArn = appArn;
    const region = appArn.split(":")[3];
    this.region = region;
    this.credentialProvider = credentials
      ? () => Promise.resolve(credentials)
      : fromNodeProviderChain();
    this.sigv4 = new SignatureV4({
        credentials: this.credentialProvider,
        region: this.region,
        service: SERVICE_NAME,
        sha256: Sha256,
    });
  }

  async getSignedRequest(
    url: string,
    method: string,
    headers: Record<string, string>,
    body?: Buffer | string | null
  ) : Promise<SignedRequest> {
    return await PartnerAppAuthUtils.getSignedRequest(
      this.sigv4,
      this.appArn,
      url,
      method,
      headers,
      body
    );
  }

  getAuth(): (config: any) => Promise<any> {
    return async (config: any) => {
      const { url, headers } = await this.getSignedRequest(
        config.url,
        config.method,
        config.headers || {},
        config.data
      );
      config.url = url;
      config.headers = { ...config.headers, ...headers };
      return config;
    };
  }
}