import { Injectable } from "@nestjs/common";
import type {
  CreateNewsItemDto,
  NewsItemRecord,
  UpdateNewsItemDto
} from "@tk182/shared-types";

import { ContentService } from "../content/content.service";

@Injectable()
export class NewsService {
  constructor(private readonly contentService: ContentService) {}

  listPublishedNewsItems(): Promise<NewsItemRecord[]> {
    return this.contentService.listPublishedNewsItems();
  }

  listBackofficeNewsItems(): Promise<NewsItemRecord[]> {
    return this.contentService.listBackofficeNewsItems();
  }

  createNewsItem(userId: string, payload: CreateNewsItemDto): Promise<NewsItemRecord> {
    return this.contentService.createNewsItem(userId, payload);
  }

  updateNewsItem(
    userId: string,
    newsId: string,
    payload: UpdateNewsItemDto
  ): Promise<NewsItemRecord> {
    return this.contentService.updateNewsItem(userId, newsId, payload);
  }

  publishNewsItem(userId: string, newsId: string): Promise<NewsItemRecord> {
    return this.contentService.publishNewsItem(userId, newsId);
  }

  unpublishNewsItem(userId: string, newsId: string): Promise<NewsItemRecord> {
    return this.contentService.unpublishNewsItem(userId, newsId);
  }
}
