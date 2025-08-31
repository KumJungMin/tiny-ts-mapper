import { Result, ok, err } from '../schema/core/result';
import { ValidationError } from '../schema/core/error';

const ve = (msg: string) => err(new ValidationError([{ path: [], code: 'custom', message: msg }]));

export const Base64Codec = {
  encode(input: string): Result<string, ValidationError> {
    try {
      if (typeof Buffer !== 'undefined') {
        return ok(Buffer.from(input, 'utf-8').toString('base64'));
      }
      if (typeof globalThis.btoa === 'function') {
        // UTF-8 안전 처리
        const bytes = new TextEncoder().encode(input);
        let bin = '';
        for (const b of bytes) bin += String.fromCharCode(b);
        return ok(btoa(bin));
      }
      return ve('No base64 encoder available');
    } catch (e) {
      return ve(String(e));
    }
  },

  decode(output: string): Result<string, ValidationError> {
    try {
      if (typeof Buffer !== 'undefined') {
        return ok(Buffer.from(output, 'base64').toString('utf-8'));
      }
      if (typeof globalThis.atob === 'function') {
        const bin = atob(output);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return ok(new TextDecoder().decode(bytes));
      }
      return ve('No base64 decoder available');
    } catch (e) {
      return ve(String(e));
    }
  },
};
