interface IUser {
  id: number;
}

export interface UserEmpireMetadata {
  user: IUser;
  socket_token: string;
  socket_signature: string;
}
