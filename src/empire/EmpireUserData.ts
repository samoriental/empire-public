import axios, { AxiosHeaders } from 'axios';
import { env_variables } from '../env';

interface IUser {
  id: number;
}

export interface IEmpireMetadata {
  user: IUser;
  socket_token: string;
  socket_signature: string;
}

export async function fetchEmpireMetaData(): Promise<IEmpireMetadata> {
  const response = await axios.get(
    'https://csgoempire.com/api/v2/metadata/socket/',
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env_variables.EMPIRE_API_KEY}`,
      },
    },
  );
  return response.data;
}

