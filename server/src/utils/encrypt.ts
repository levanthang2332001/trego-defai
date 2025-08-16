import * as forge from 'node-forge';
import {
  IEncryptRequest,
  IEncryptResponse,
} from '../wallet/entities/crypto.entities';

export const Encrypt = (params: IEncryptRequest): IEncryptResponse => {
  const { prKey, password } = params;

  const salt = forge.random.getBytesSync(16);
  const iv = forge.random.getBytesSync(16);

  const key = forge.pkcs5.pbkdf2(password, salt, 10000, 32);

  const cipher = forge.cipher.createCipher('AES-CBC', key);
  cipher.start({ iv: iv });
  cipher.update(forge.util.createBuffer(prKey, 'utf8'));
  cipher.finish();

  return {
    cipherText: forge.util.encode64(cipher.output.getBytes()),
    salt: forge.util.encode64(salt),
    iv: forge.util.encode64(iv),
  };
};
