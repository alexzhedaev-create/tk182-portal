import { Body, Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type {
  AuthSummaryResponse,
  LoginRequestDto,
  LoginResponseDto,
  LogoutResponseDto,
  SessionResponseDto
} from "@tk182/shared-types";

import { AuthService } from "./auth.service";
import type { CookieRequest, SetHeaderResponse } from "./auth.types";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Get()
  getSummary(): AuthSummaryResponse {
    return this.authService.getSummary();
  }

  @Get("session")
  getSession(@Req() request: CookieRequest): Promise<SessionResponseDto> {
    return this.authService.getSession(request);
  }

  @Post("login")
  async login(
    @Body() credentials: LoginRequestDto,
    @Res({ passthrough: true }) response: SetHeaderResponse
  ): Promise<LoginResponseDto> {
    const result = await this.authService.login(credentials);
    response.setHeader("Set-Cookie", result.setCookieHeader);
    return result.response;
  }

  @Post("logout")
  async logout(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: SetHeaderResponse
  ): Promise<LogoutResponseDto> {
    const result = await this.authService.logout(request);
    response.setHeader("Set-Cookie", result.setCookieHeader);
    return result.response;
  }
}
