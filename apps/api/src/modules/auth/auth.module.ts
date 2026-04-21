import { Body, Controller, Get, Injectable, Module, Post } from "@nestjs/common";

import type {
  AuthSummaryResponse,
  LoginRequestDto,
  LoginResponseDto,
  SessionResponseDto
} from "@tk182/shared-types";

@Injectable()
class AuthService {
  getSummary(): AuthSummaryResponse {
    return {
      provider: "local-credentials",
      supportedRoles: ["participant", "secretariat"],
      loginPath: "/auth/login",
      sessionPath: "/auth/session",
      configured: false
    };
  }

  getSession(): SessionResponseDto {
    return {
      authenticated: false,
      user: null
    };
  }

  login(_credentials: LoginRequestDto): LoginResponseDto {
    return {
      status: "stub",
      message:
        "Authentication is scaffolded but not implemented yet. Local credentials will be added in the next phase.",
      user: null
    };
  }
}

@Controller("auth")
class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  getSummary(): AuthSummaryResponse {
    return this.authService.getSummary();
  }

  @Get("session")
  getSession(): SessionResponseDto {
    return this.authService.getSession();
  }

  @Post("login")
  login(@Body() credentials: LoginRequestDto): LoginResponseDto {
    return this.authService.login(credentials);
  }
}

@Module({
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}
