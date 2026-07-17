import { extractEntities } from './src/modules/verify/verifier.js';

console.log("solar-powered:", extractEntities("The rover was solar-powered"));
console.log("solar-powered batteries:", extractEntities("The Pragyan rover operated using solar-powered batteries"));
