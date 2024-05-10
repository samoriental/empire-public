import * as dotenv from 'dotenv';
dotenv.config({ override: true });

interface ENVars {
  REDIS_URL: string;
  CUSTOM_ORACLE_STATUS: boolean;
  CUSTOM_ORACLE_API: string;
  PRICEMPIRE_STATUS: boolean;
  PRICEMPIRE_API_KEY: string;
  EMPIRE_API_KEY: string;
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

export const env_variables = checkENVVariables();
