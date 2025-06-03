import axios from "axios";
import { PartnerAppAuthProvider } from "./authProvider";

// The URL you're calling (replace with actual SageMaker partner app endpoint)
const url = "https://app-ABCDEFGHIJKL.partner-app.us-west-2.sagemaker.aws/clientlib/isAlive/ver";

const run = async () => {
  const authProvider = new PartnerAppAuthProvider({appARN: "add your APP ARN here"});
  const signedRequest = await authProvider.getSignedRequest(
    url,
    "GET",
    { "Content-Type": "application/json" }, // add more headers if needed
    undefined // no body for GET request
  );
  const response = await axios({
    url: signedRequest.url,
    method: "GET",
    headers: signedRequest.headers,
  });

  console.log("Response:", response.data);
};

run().catch((err) => {
  if (err.response) {
    console.error("Status:", err.response.status);
    console.error("Data:", err.response.data);
  } else {
    console.error("Error:", err.message);
  }
});
