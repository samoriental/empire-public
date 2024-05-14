import * as dotenv from 'dotenv';
dotenv.config({ override: true });

interface ENVars {
  REDIS_URL: string;
  CUSTOM_ORACLE_STATUS: boolean;
  CUSTOM_ORACLE_API: string;
  PRICEMPIRE_STATUS: boolean;
  PRICEMPIRE_API_KEY: string;
  EMPIRE_API_KEY: string;
  EMPIRE_URL: string;
}

interface FilterENVVars {
  FILTER_MIN_PRICEMPIRE_LIQUIDITY_SCORE: number;
  FILTER_STAT_TRACK: boolean;
  FILTER_MAX_PRICE: number;
  FILTER_MIN_PRICE: number;
  FILTER_COMMODITY: boolean;
  PROFIT_MARGIN: number;
}

const checkENVVariables = (): ENVars => {
  if (!process.env.EMPIRE_API_KEY) {
    throw new Error('EMPIRE_API_KEY is not defined');
  }
  const default_redis_uri = 'redis://redis:6379';
  const env_vars = {
    REDIS_URL: process.env.REDIS_URL || default_redis_uri, // Docker container
    CUSTOM_ORACLE_STATUS: Boolean(process.env.CUSTOM_ORACLE_API),
    CUSTOM_ORACLE_API: process.env.CUSTOM_ORACLE_API || '',
    PRICEMPIRE_STATUS: Boolean(process.env.PRICEMPIRE_API_KEY),
    PRICEMPIRE_API_KEY: process.env.PRICEMPIRE_API_KEY || '',
    EMPIRE_API_KEY: process.env.EMPIRE_API_KEY,
    EMPIRE_URL: process.env.EMPIRE_URL || 'csgoempire.com',
  };
  if (env_vars.CUSTOM_ORACLE_STATUS && env_vars.PRICEMPIRE_STATUS) {
    throw new Error('Multiple oracles are set... Only one is allowed.');
  }
  console.info('Current settings:');
  console.info(
    `REDIS_URL: ${env_vars.REDIS_URL}, DEFAULT: ${env_vars.REDIS_URL === default_redis_uri}`,
  );
  console.info(`CUSTOM_ORACLE_STATUS: ${env_vars.CUSTOM_ORACLE_STATUS}`);
  console.info(`PRICEMPIRE_STATUS: ${env_vars.PRICEMPIRE_STATUS}`);
  return env_vars;
};
const checkFilterENVVariables = (): FilterENVVars => {
  const filter_env_vars = {
    FILTER_MIN_PRICEMPIRE_LIQUIDITY_SCORE:
      !Number.isNaN(Number(process.env.FILTER_MIN_PRICEMPIRE_LIQUIDITY_SCORE)) ? Number(process.env.FILTER_MIN_PRICEMPIRE_LIQUIDITY_SCORE) : 50,
    FILTER_STAT_TRACK: process.env.FILTER_STAT_TRACK === 'true' || false,
    FILTER_COMMODITY: process.env.FILTER_COMMODITY === 'true' || false,
    FILTER_MAX_PRICE:
      !Number.isNaN(Number(process.env.FILTER_MAX_PRICE)) ? Number(process.env.FILTER_MAX_PRICE) : 100,
    FILTER_MIN_PRICE:
      !Number.isNaN(Number(process.env.FILTER_MIN_PRICE)) ? Number(process.env.FILTER_MIN_PRICE) : 5,
    PROFIT_MARGIN:
      !Number.isNaN(Number(process.env.PROFIT_MARGIN)) ? Number(process.env.PROFIT_MARGIN) : 0.08,
  };
  console.info('Current filter settings:');
  console.info(
    `FILTER_MIN_PRICEMPIRE_LIQUIDITY_SCORE: ${filter_env_vars.FILTER_MIN_PRICEMPIRE_LIQUIDITY_SCORE}`,
  );
  console.info(`FILTER_STAT_TRACK: ${filter_env_vars.FILTER_STAT_TRACK}`);
  console.info(`FILTER_COMMODITY: ${filter_env_vars.FILTER_COMMODITY}`);
  console.info(`FILTER_MAX_PRICE: ${filter_env_vars.FILTER_MAX_PRICE}`);
  console.info(`FILTER_MIN_PRICE: ${filter_env_vars.FILTER_MIN_PRICE}`);
  console.info(`PROFIT_MARGIN: ${filter_env_vars.PROFIT_MARGIN}`);
  return filter_env_vars;
};
export const env_variables = checkENVVariables();
export const filter_env_variables = checkFilterENVVariables();
