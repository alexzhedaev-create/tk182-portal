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
      status: "stub",
      provider: "local-credentials",
      supportedRoles: ["participant", "secretariat"],
      loginPath: "/auth/login",
      sessionPath: "/auth/session",
      notes: [
        "External auth providers are intentionally excluded from the MVP.",
        "Participant and secretariat access will use locally managed credentials and role checks.",
        "Password storage, session persistence, and authorization guards are the next implementation step."
      ]
    };
  }

  getSession(): SessionResponseDto {
    return {
      status: "stub",
      message:
        "No active session is available yet. Session persistence will be added with local credential auth.",
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
