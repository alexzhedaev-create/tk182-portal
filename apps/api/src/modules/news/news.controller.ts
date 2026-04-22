import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import type {
  BackofficeNewsItemRecord,
  ContentMigrationStatus,
  CreateNewsItemDto,
  LegacyContentSection,
  NewsItemRecord,
  PublicNewsFilters,
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
  listPublishedNewsItems(
    @Query("q") q?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string
  ): Promise<NewsItemRecord[]> {
    const filters: PublicNewsFilters = {
      ...(q ? { q } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {})
    };

    return this.newsService.listPublishedNewsItems(filters);
  }

  @Get("backoffice")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listBackofficeNewsItems(
    @Query("migrationStatus") migrationStatus?: string,
    @Query("legacySection") legacySection?: string
  ): Promise<BackofficeNewsItemRecord[]> {
    return this.newsService.listBackofficeNewsItems({
      ...(migrationStatus
        ? { migrationStatus: migrationStatus as ContentMigrationStatus }
        : {}),
      ...(legacySection ? { legacySection: legacySection as LegacyContentSection } : {})
    });
  }

  @Post("backoffice")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  createNewsItem(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateNewsItemDto
  ): Promise<BackofficeNewsItemRecord> {
    return this.newsService.createNewsItem(request.authSession!.user.id, payload);
  }

  @Patch("backoffice/:newsId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  updateNewsItem(
    @Req() request: AuthenticatedRequest,
    @Param("newsId") newsId: string,
    @Body() payload: UpdateNewsItemDto
  ): Promise<BackofficeNewsItemRecord> {
    return this.newsService.updateNewsItem(request.authSession!.user.id, newsId, payload);
  }

  @Post("backoffice/:newsId/publish")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  publishNewsItem(
    @Req() request: AuthenticatedRequest,
    @Param("newsId") newsId: string
  ): Promise<BackofficeNewsItemRecord> {
    return this.newsService.publishNewsItem(request.authSession!.user.id, newsId);
  }

  @Post("backoffice/:newsId/unpublish")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  unpublishNewsItem(
    @Req() request: AuthenticatedRequest,
    @Param("newsId") newsId: string
  ): Promise<BackofficeNewsItemRecord> {
    return this.newsService.unpublishNewsItem(request.authSession!.user.id, newsId);
  }

  @Get(":newsId")
  getPublishedNewsItem(@Param("newsId") newsId: string): Promise<NewsItemRecord> {
    return this.newsService.getPublishedNewsItem(newsId);
  }
}
