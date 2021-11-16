export class Exchange {
  constructor(_satokinExchange?: SatokinExchange, _dbioToUsd?: number) {
    this.dbioToWNear  = _satokinExchange.dbioToWNear;
    this.wNearToDai   = _satokinExchange.wNearToDai;
    this.dbioToDai    = _satokinExchange.dbioToDai;
    this.dbioToUsd    = _dbioToUsd;
  }
  dbioToWNear?: number;
  wNearToDai?: number;
  dbioToDai?: number;
  dbioToUsd?: number;
}

export class SatokinExchange {
  constructor(_dbioToWNear?: number, _wNearToDai?: number, _dbioToDai?: number) {
    this.dbioToWNear  = _dbioToWNear;
    this.wNearToDai   = _wNearToDai;
    this.dbioToDai  = _dbioToDai;
  }
  dbioToWNear?: number;
  wNearToDai?: number;
  dbioToDai?: number;
}