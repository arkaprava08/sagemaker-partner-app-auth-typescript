import { AwsCredentialIdentity } from '@aws-sdk/types';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { PartnerAppAuthProvider } from '../authProvider';
import { PartnerAppAuthUtils } from '../authUtils';

jest.mock('@aws-sdk/signature-v4');
jest.mock('@aws-sdk/credential-providers');
jest.mock('../authUtils');

describe('PartnerAppAuthProvider', () => {
  const mockAppArn = 'arn:aws:sagemaker:us-west-2:123456789012:partner-app/test';
  const mockCredentials: AwsCredentialIdentity = {
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
  };

  beforeEach(() => {
    process.env.AWS_PARTNER_APP_ARN = mockAppArn;
    (fromNodeProviderChain as jest.Mock).mockReturnValue(() => Promise.resolve(mockCredentials));
    (SignatureV4 as jest.Mock).mockImplementation(() => ({
      sign: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.AWS_PARTNER_APP_ARN;
  });

  describe('constructor', () => {
    it('should initialize with default credentials when none provided', () => {
      const provider = new PartnerAppAuthProvider();
      expect(fromNodeProviderChain).toHaveBeenCalled();
      expect(SignatureV4).toHaveBeenCalledWith(expect.objectContaining({
        credentials: expect.any(Function),
        region: 'us-west-2',
        service: 'sagemaker',
        sha256: expect.any(Function),
      }));
    });

    it('should initialize with provided credentials', () => {
      const customCredentials: AwsCredentialIdentity = {
        accessKeyId: 'custom-access-key',
        secretAccessKey: 'custom-secret-key',
      };
      const provider = new PartnerAppAuthProvider(customCredentials);
      expect(fromNodeProviderChain).not.toHaveBeenCalled();
      expect(SignatureV4).toHaveBeenCalledWith(expect.objectContaining({
        credentials: expect.any(Function),
        region: 'us-west-2',
        service: 'sagemaker',
        sha256: expect.any(Function),
      }));
    });

    it('should throw error when AWS_PARTNER_APP_ARN is not set', () => {
      delete process.env.AWS_PARTNER_APP_ARN;
      expect(() => new PartnerAppAuthProvider()).toThrow(
        'Must specify the AWS_PARTNER_APP_ARN environment variable'
      );
    });

    it('should throw error when AWS_PARTNER_APP_ARN is invalid', () => {
      process.env.AWS_PARTNER_APP_ARN = 'invalid-arn';
      expect(() => new PartnerAppAuthProvider()).toThrow(
        'Must specify a valid AWS_PARTNER_APP_ARN environment variable'
      );
    });
  });

  describe('getSignedRequest', () => {
    it('should call PartnerAppAuthUtils.getSignedRequest with correct parameters', async () => {
      const provider = new PartnerAppAuthProvider();
      const mockUrl = 'https://test.amazonaws.com';
      const mockMethod = 'POST';
      const mockHeaders = { 'Content-Type': 'application/json' };
      const mockBody = '{"test": "data"}';
      const mockResult = {
        url: mockUrl,
        headers: { ...mockHeaders, 'X-Amz-Signature': 'test-signature' },
      };

      (PartnerAppAuthUtils.getSignedRequest as jest.Mock).mockResolvedValue(mockResult);

      const result = await provider.getSignedRequest(mockUrl, mockMethod, mockHeaders, mockBody);

      expect(PartnerAppAuthUtils.getSignedRequest).toHaveBeenCalledWith(
        expect.objectContaining({ sign: expect.any(Function) }),
        mockAppArn,
        mockUrl,
        mockMethod,
        mockHeaders,
        mockBody
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getAuth', () => {
    it('should return an interceptor function that signs requests', async () => {
      const provider = new PartnerAppAuthProvider();
      const mockConfig = {
        url: 'https://test.amazonaws.com',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: '{"test": "data"}',
      };

      const mockSignedRequest = {
        url: mockConfig.url,
        headers: { ...mockConfig.headers, 'X-Amz-Signature': 'test-signature' },
      };

      (PartnerAppAuthUtils.getSignedRequest as jest.Mock).mockResolvedValue(mockSignedRequest);

      const interceptor = provider.getAuth();
      const result = await interceptor(mockConfig);

      expect(PartnerAppAuthUtils.getSignedRequest).toHaveBeenCalledWith(
        expect.objectContaining({ sign: expect.any(Function) }),
        mockAppArn,
        mockConfig.url,
        mockConfig.method,
        expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        mockConfig.data
      );
      expect(result).toEqual({
        ...mockConfig,
        headers: mockSignedRequest.headers,
      });
    });
  });
}); 