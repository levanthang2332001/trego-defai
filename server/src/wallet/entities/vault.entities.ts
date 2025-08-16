interface IInsertVaultRequest {
  secret_name: string;
  secret_value: string;
}

interface IReadVaultRequest {
  secret_name: string;
}

export { IInsertVaultRequest, IReadVaultRequest };
