import { AwsCredentialIdentity, Checksum, ChecksumConstructor } from '@aws-sdk/types';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { createHash } from 'crypto';
import { PartnerAppAuthUtils, SignedRequest } from './authUtils';

const SERVICE_NAME = 'sagemaker';
const AWS_PARTNER_APP_ARN_REGEX = /arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:partner-app\/.*/;

class Sha256Hash implements Checksum {
  private hash;

  constructor() {
    this.hash = createHash('sha256');
  }

  update(data: Uint8Array): this {
    this.hash.update(data);
    return this;
  }

  async digest(): Promise<Uint8Array> {
    return Promise.resolve(this.hash.digest());
  }

  reset(): this {
    this.hash = createHash('sha256');
    return this;
  }
}

const Sha256Constructor = class {
  constructor() {
    return new Sha256Hash();
  }
} as ChecksumConstructor;

export class PartnerAppAuthProvider {
  private appArn: string;
  private region: string;
  private credentialProvider: () => Promise<AwsCredentialIdentity>;
  private sigv4: SignatureV4;

  constructor(credentials?: AwsCredentialIdentity) {
    this.appArn = process.env.AWS_PARTNER_APP_ARN || '';
    if (!this.appArn) {
      throw new Error('Must specify the AWS_PARTNER_APP_ARN environment variable');
    }

    const appArnRegexMatch = this.appArn.match(AWS_PARTNER_APP_ARN_REGEX);
    if (!appArnRegexMatch) {
      throw new Error('Must specify a valid AWS_PARTNER_APP_ARN environment variable');
    }

    const splitArn = this.appArn.split(':');
    this.region = splitArn[3];

    this.credentialProvider = credentials
      ? () => Promise.resolve(credentials)
      : fromNodeProviderChain();

    this.sigv4 = new SignatureV4({
      credentials: this.credentialProvider,
      region: this.region,
      service: SERVICE_NAME,
      sha256: Sha256Constructor,
    });
  }

  async getSignedRequest(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: Buffer | string | null
  ): Promise<SignedRequest> {
    return PartnerAppAuthUtils.getSignedRequest(
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
        config.headers,
        config.data
      );
      config.url = url;
      config.headers = headers;
      return config;
    };
  }
} 