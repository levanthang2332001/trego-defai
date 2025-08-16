import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

interface IJwtPayload {
  walletAddress: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromCookie(request);

    if (!token) {
      throw new UnauthorizedException(
        'Authentication required. Please sign in with your Tasmil account.',
      );
    }

    try {
      const payload = this.jwtService.verify<IJwtPayload>(token);

      if (!payload?.walletAddress) {
        throw new UnauthorizedException('Invalid token format');
      }

      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token verification failed', error);
    }
  }

  private extractTokenFromCookie(request: Request): string | undefined {
    return request.cookies?.['tasmil-token'] as string;
  }
}
