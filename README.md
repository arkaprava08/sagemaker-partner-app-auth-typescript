# SageMaker Partner App Auth TypeScript SDK

This SDK provides TypeScript bindings for authenticating requests to SageMaker Partner Applications.

## Installation

```bash
npm install sagemaker-partner-app-auth-typescript
```

## Usage

```typescript
import { PartnerAppAuthProvider } from 'sagemaker-partner-app-auth-typescript';
import axios from 'axios';

// Create an auth provider
const authProvider = new PartnerAppAuthProvider();

// Create an axios instance with the auth interceptor
const axiosInstance = axios.create();
axiosInstance.interceptors.request.use(authProvider.getAuth());

// Make requests
const response = await axiosInstance.post('https://your-sagemaker-endpoint.amazonaws.com', {
  // your request body
});
```

## Environment Variables

The SDK requires the following environment variable to be set:

- `AWS_PARTNER_APP_ARN`: The ARN of your SageMaker Partner Application

## API Reference

### PartnerAppAuthProvider

The main class for authenticating requests to SageMaker Partner Applications.

#### Constructor

```typescript
constructor(credentials?: AwsCredentialIdentity)
```

- `credentials`: Optional AWS credentials. If not provided, the SDK will use the default credential provider chain.

#### Methods

##### getSignedRequest

```typescript
async getSignedRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: Buffer | string | null
): Promise<SignedRequest>
```

Generates a signed request with the appropriate headers for authentication.

- `url`: The request URL
- `method`: The HTTP method
- `headers`: Request headers
- `body`: Request body

Returns a promise that resolves to a `SignedRequest` object containing the signed URL and headers.

##### getAuth

```typescript
getAuth(): (config: any) => Promise<any>
```

Returns an interceptor function that can be used with axios to automatically sign requests.

## License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details. 