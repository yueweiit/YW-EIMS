import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  generateKeyPairSync,
  sign,
  verify,
  createPublicKey,
} from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type {
  OpenIdConfiguration,
  JwksKey,
  JwksResponse,
} from './interfaces/oauth2.interface';

@Injectable()
export class OpenIdService implements OnModuleInit {
  private readonly logger = new Logger(OpenIdService.name);
  private privateKey!: string;
  private publicKey!: string;
  private kid!: string;
  private issuer!: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.issuer =
      this.configService.get<string>('OAUTH2_ISSUER') ||
      'http://localhost:3006';
    this.loadOrGenerateKeys();
  }

  private loadOrGenerateKeys() {
    const privateKeyPath =
      this.configService.get<string>('OAUTH2_RSA_PRIVATE_KEY_PATH') ||
      './keys/oauth2.pem';
    const publicKeyPath =
      this.configService.get<string>('OAUTH2_RSA_PUBLIC_KEY_PATH') ||
      './keys/oauth2.pub.pem';

    const absPrivatePath = join(process.cwd(), privateKeyPath);
    const absPublicPath = join(process.cwd(), publicKeyPath);

    if (existsSync(absPrivatePath) && existsSync(absPublicPath)) {
      this.privateKey = readFileSync(absPrivatePath, 'utf-8');
      this.publicKey = readFileSync(absPublicPath, 'utf-8');
      this.logger.log('Loaded existing RSA keys for OAuth2 ID Token signing');
    } else {
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      mkdirSync(dirname(absPrivatePath), { recursive: true });
      writeFileSync(absPrivatePath, privateKey);
      writeFileSync(absPublicPath, publicKey);
      this.privateKey = privateKey;
      this.publicKey = publicKey;
      this.logger.log('Generated new RSA keys for OAuth2 ID Token signing');
    }

    // Generate a stable kid from the public key
    const keyObject = createPublicKey(this.publicKey);
    const exported = keyObject.export({ type: 'spki', format: 'der' });
    this.kid = createHash('sha256')
      .update(exported)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Generate a signed JWT ID Token (RS256).
   */
  signIdToken(payload: Record<string, unknown>, expiresInSec: number): string {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT', kid: this.kid };
    const claims = {
      ...payload,
      iss: this.issuer,
      iat: now,
      exp: now + expiresInSec,
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const claimsB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signingInput = `${headerB64}.${claimsB64}`;
    const signature = sign(
      'RSA-SHA256',
      Buffer.from(signingInput),
      this.privateKey,
    ).toString('base64url');

    return `${signingInput}.${signature}`;
  }

  verifyToken<T extends Record<string, unknown>>(
    token: string,
    audience?: string,
  ): T {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('invalid JWT');

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = JSON.parse(
      Buffer.from(encodedHeader, 'base64url').toString(),
    ) as {
      alg?: string;
      kid?: string;
    };
    if (header.alg !== 'RS256' || header.kid !== this.kid)
      throw new Error('invalid JWT header');

    const valid = verify(
      'RSA-SHA256',
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      this.publicKey,
      Buffer.from(encodedSignature, 'base64url'),
    );
    if (!valid) throw new Error('invalid JWT signature');

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString(),
    ) as T & {
      iss?: string;
      exp?: number;
      aud?: string;
    };
    const now = Math.floor(Date.now() / 1000);
    if (
      payload.iss !== this.issuer ||
      typeof payload.exp !== 'number' ||
      payload.exp <= now
    ) {
      throw new Error('expired or invalid JWT claims');
    }
    if (audience && payload.aud !== audience)
      throw new Error('invalid JWT audience');
    return payload;
  }

  /**
   * OIDC Discovery document.
   */
  getConfiguration(): OpenIdConfiguration {
    return {
      issuer: this.issuer,
      authorization_endpoint: `${this.issuer}/oauth/authorize`,
      token_endpoint: `${this.issuer}/oauth/token`,
      userinfo_endpoint: `${this.issuer}/oauth/userinfo`,
      jwks_uri: `${this.issuer}/oauth/jwks`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: ['openid', 'profile', 'email'],
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
      ],
      claims_supported: [
        'sub',
        'name',
        'email',
        'given_name',
        'family_name',
        'preferred_username',
        'picture',
      ],
    };
  }

  /**
   * JWKS endpoint response.
   */
  getJwks(): JwksResponse {
    const keyObject = createPublicKey(this.publicKey);
    const exported = keyObject.export({ type: 'spki', format: 'der' });

    // Extract modulus and exponent from DER-encoded SPKI
    // SPKI structure: SEQUENCE { SEQUENCE { OID, NULL }, BIT STRING { SEQUENCE { INTEGER, INTEGER } } }
    const b64 = exported.toString('base64');
    const modulus = this.extractModulus(exported);
    const exponent = this.extractExponent(exported);

    return {
      keys: [
        {
          kty: 'RSA',
          use: 'sig',
          kid: this.kid,
          alg: 'RS256',
          n: modulus,
          e: exponent,
        },
      ],
    };
  }

  private extractModulus(derBuffer: Buffer): string {
    // Find the first INTEGER (modulus) in the DER SEQUENCE
    const seq = this.findSubSequence(derBuffer);
    return this.extractInteger(seq);
  }

  private extractExponent(derBuffer: Buffer): string {
    const seq = this.findSubSequence(derBuffer);
    // Skip past the first integer to find the second one (exponent)
    let offset = 0;
    // Skip first integer
    if (seq[offset] === 0x02) {
      offset++;
      const len = this.readDerLength(seq, offset);
      offset += len.bytesRead;
      offset += len.length;
    }
    // Read second integer
    return this.extractIntegerAt(seq, offset);
  }

  private findSubSequence(buf: Buffer): Buffer {
    // The BIT STRING contains the inner SEQUENCE
    let offset = 0;
    // Skip outer SEQUENCE header
    if (buf[offset] === 0x30) {
      offset++;
      const outerLen = this.readDerLength(buf, offset);
      offset += outerLen.bytesRead;
      // Skip AlgorithmIdentifier SEQUENCE
      if (buf[offset] === 0x30) {
        offset++;
        const algLen = this.readDerLength(buf, offset);
        offset += algLen.bytesRead + algLen.length;
      }
      // Skip BIT STRING header
      if (buf[offset] === 0x03) {
        offset++;
        const bsLen = this.readDerLength(buf, offset);
        offset += bsLen.bytesRead;
        offset++; // skip unused bits byte
        // Now we're at the inner SEQUENCE
        if (buf[offset] === 0x30) {
          offset++;
          const innerLen = this.readDerLength(buf, offset);
          offset += innerLen.bytesRead;
          return buf.subarray(offset, offset + innerLen.length);
        }
      }
    }
    return buf;
  }

  private extractInteger(buf: Buffer): string {
    return this.extractIntegerAt(buf, 0);
  }

  private extractIntegerAt(buf: Buffer, offset: number): string {
    if (buf[offset] !== 0x02) return '';
    offset++;
    const len = this.readDerLength(buf, offset);
    offset += len.bytesRead;
    const intBytes = buf.subarray(offset, offset + len.length);
    // Remove leading zero byte (sign byte)
    const start = intBytes[0] === 0x00 ? 1 : 0;
    return intBytes.subarray(start).toString('base64url');
  }

  private readDerLength(
    buf: Buffer,
    offset: number,
  ): { length: number; bytesRead: number } {
    const first = buf[offset];
    if (first < 0x80) {
      return { length: first, bytesRead: 1 };
    }
    const numBytes = first & 0x7f;
    let length = 0;
    for (let i = 0; i < numBytes; i++) {
      length = (length << 8) | buf[offset + 1 + i];
    }
    return { length, bytesRead: 1 + numBytes };
  }
}
