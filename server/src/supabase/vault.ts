import { Logger } from '@nestjs/common';
import { SupabaseClient } from './client';
import {
  IInsertVaultRequest,
  IReadVaultRequest,
} from '../wallet/entities/vault.entities';

interface IInsertVaultResponse {
  id: string;
}

interface IReadVaultResponse {
  id: string;
  secret_name: string;
  secret_value: string;
}

export class VaultSupabase {
  private readonly supabaseClient: SupabaseClient;

  constructor() {
    this.supabaseClient = new SupabaseClient();
  }

  public async insertVault(
    params: IInsertVaultRequest,
  ): Promise<IInsertVaultResponse | null> {
    try {
      const client = this.supabaseClient.checkClient();
      const response = await client.rpc('insert_secret', {
        secret_name: params.secret_name,
        secret_value: params.secret_value,
      });

      return response.data as IInsertVaultResponse;
    } catch (error) {
      Logger.error(error);
      return null;
    }
  }

  public async getVault(
    params: IReadVaultRequest,
  ): Promise<IReadVaultResponse | null> {
    try {
      const client = this.supabaseClient.checkClient();
      const response = await client.rpc('read_secret', {
        secret_name: params.secret_name,
      });

      return response.data as IReadVaultResponse;
    } catch (error) {
      Logger.error(error);
      return null;
    }
  }
}
