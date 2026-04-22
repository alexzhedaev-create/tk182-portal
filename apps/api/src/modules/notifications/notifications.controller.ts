import { Controller, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";

import type {
  MarkAllNotificationsReadResponse,
  NotificationRecord,
  NotificationUnreadCountDto
} from "@tk182/shared-types";

import { SessionAuthGuard } from "../auth/session-auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(SessionAuthGuard)
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService
  ) {}

  @Get()
  listMyNotifications(
    @Req() request: AuthenticatedRequest
  ): Promise<NotificationRecord[]> {
    return this.notificationsService.listNotificationsForUser(
      request.authSession!.user.id
    );
  }

  @Get("summary")
  getSummary() {
    return this.notificationsService.getSummary();
  }

  @Get("unread-count")
  getUnreadCount(
    @Req() request: AuthenticatedRequest
  ): Promise<NotificationUnreadCountDto> {
    return this.notificationsService.getUnreadCount(request.authSession!.user.id);
  }

  @Post(":notificationId/read")
  markNotificationRead(
    @Req() request: AuthenticatedRequest,
    @Param("notificationId") notificationId: string
  ): Promise<NotificationRecord> {
    return this.notificationsService.markNotificationRead(
      request.authSession!.user.id,
      notificationId
    );
  }

  @Post("read-all")
  markAllRead(
    @Req() request: AuthenticatedRequest
  ): Promise<MarkAllNotificationsReadResponse> {
    return this.notificationsService.markAllNotificationsRead(
      request.authSession!.user.id
    );
  }
}
