interface IEncryptRequest {
  prKey: string;
  password: string;
}

interface IDecryptRequest {
  cipherText: string;
  password: string;
  saltB64: string;
  ivB64: string;
}

interface IEncryptResponse {
  cipherText: string;
  salt: string;
  iv: string;
}

interface IDecryptResponse {
  prKey: string;
}

export { IEncryptRequest, IDecryptRequest, IEncryptResponse, IDecryptResponse };
