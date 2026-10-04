import next from 'eslint-config-next';

const config = [{ ignores: ['design/**', '.next/**', 'node_modules/**'] }, ...next];

export default config;
