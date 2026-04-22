import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type {
  CreateNewsItemDto,
  NewsItemRecord,
  UpdateNewsItemDto
} from "@tk182/shared-types";

import type { AuthenticatedRequest } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { NewsService } from "./news.service";

@Controller("news")
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  listPublishedNewsItems(): Promise<NewsItemRecord[]> {
    return this.newsService.listPublishedNewsItems();
  }

  @Get("backoffice")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listBackofficeNewsItems(): Promise<NewsItemRecord[]> {
    return this.newsService.listBackofficeNewsItems();
  }

  @Post("backoffice")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  createNewsItem(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateNewsItemDto
  ): Promise<NewsItemRecord> {
    return this.newsService.createNewsItem(request.authSession!.user.id, payload);
  }

  @Patch("backoffice/:newsId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  updateNewsItem(
    @Req() request: AuthenticatedRequest,
    @Param("newsId") newsId: string,
    @Body() payload: UpdateNewsItemDto
  ): Promise<NewsItemRecord> {
    return this.newsService.updateNewsItem(request.authSession!.user.id, newsId, payload);
  }

  @Post("backoffice/:newsId/publish")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  publishNewsItem(
    @Req() request: AuthenticatedRequest,
    @Param("newsId") newsId: string
  ): Promise<NewsItemRecord> {
    return this.newsService.publishNewsItem(request.authSession!.user.id, newsId);
  }

  @Post("backoffice/:newsId/unpublish")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  unpublishNewsItem(
    @Req() request: AuthenticatedRequest,
    @Param("newsId") newsId: string
  ): Promise<NewsItemRecord> {
    return this.newsService.unpublishNewsItem(request.authSession!.user.id, newsId);
  }
}
