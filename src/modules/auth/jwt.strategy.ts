import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Login returns Supabase's session access_token, so verify with the Supabase project's JWT secret.
      // shortcut: HS256 legacy secret only; if the project uses asymmetric signing keys, switch to its JWKS endpoint
      secretOrKey: configService.getOrThrow<string>('SUPABASE_JWT_SECRET'),
      audience: 'authenticated',
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      // Supabase's top-level `role` is always "authenticated"; the app role lives in user_metadata
      role: payload.user_metadata?.role ?? payload.role,
    };
  }
}