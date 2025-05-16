import { createHash } from 'crypto';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { PartnerAppAuthUtils } from '../authUtils';
import { HttpRequest } from '@aws-sdk/protocol-http';

describe('PartnerAppAuthUtils', () => {
  let mockSigV4: jest.Mocked<SignatureV4>;

  beforeEach(() => {
    mockSigV4 = {
      sign: jest.fn(),
    } as any;
  });

  describe('getBodyHeader', () => {
    it('should return empty SHA256 hash for null body', async () => {
      const result = await PartnerAppAuthUtils.getBodyHeader(null);
      expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should return SHA256 hash for Buffer body', async () => {
      const body = Buffer.from('test');
      const result = await PartnerAppAuthUtils.getBodyHeader(body);
      expect(result).toBe(createHash('sha256').update(body).digest('hex'));
    });

    it('should return SHA256 hash for string body', async () => {
      const body = 'test';
      const result = await PartnerAppAuthUtils.getBodyHeader(body);
      expect(result).toBe(createHash('sha256').update(body).digest('hex'));
    });

    it('should return UNSIGNED_PAYLOAD for unknown body type', async () => {
      const body = { test: 'data' } as any;
      const result = await PartnerAppAuthUtils.getBodyHeader(body);
      expect(result).toBe('UNSIGNED-PAYLOAD');
    });
  });

  describe('getSignedRequest', () => {
    const mockUrl = 'https://test.amazonaws.com';
    const mockMethod = 'POST';
    const mockHeaders = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
      'Connection': 'keep-alive',
    };
    const mockBody = '{"test": "data"}';
    const mockAppArn = 'arn:aws:sagemaker:us-west-2:123456789012:partner-app/test';

    it('should properly transform headers and call sigv4.sign', async () => {
      const mockSignedRequest = new HttpRequest({
        method: mockMethod,
        protocol: 'https:',
        hostname: 'test.amazonaws.com',
        path: '/',
        headers: {
          ...mockHeaders,
          'X-Amz-Signature': 'test-signature',
        }
      });

      mockSigV4.sign.mockResolvedValue(mockSignedRequest);

      const result = await PartnerAppAuthUtils.getSignedRequest(
        mockSigV4,
        mockAppArn,
        mockUrl,
        mockMethod,
        mockHeaders,
        mockBody
      );

      // Verify sign was called
      expect(mockSigV4.sign).toHaveBeenCalled();
      
      // Check result
      expect(result).toEqual({
        url: mockUrl,
        headers: expect.objectContaining({
          'X-Amz-Signature': 'test-signature',
          'Connection': 'keep-alive',
        }),
      });
    });

    it('should handle URL with spaces correctly', async () => {
      const urlWithSpaces = 'https://test.amazonaws.com/path with spaces';
      const expectedUrl = urlWithSpaces.replace(/ /g, '%20');

      const mockSignedRequest = new HttpRequest({
        method: mockMethod,
        protocol: 'https:',
        hostname: 'test.amazonaws.com',
        path: '/path%20with%20spaces',
        headers: {}
      });

      mockSigV4.sign.mockResolvedValue(mockSignedRequest);

      const result = await PartnerAppAuthUtils.getSignedRequest(
        mockSigV4,
        mockAppArn,
        urlWithSpaces,
        mockMethod,
        mockHeaders,
        mockBody
      );

      expect(result.url).toBe(expectedUrl);
    });
  });
});