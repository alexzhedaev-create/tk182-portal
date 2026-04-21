import { Module } from "@nestjs/common";

import { AppController } from "./app.controller";
import { DatabaseModule } from "./common/database/database.module";
import { ApprovalModule } from "./modules/approval/approval.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { HealthModule } from "./modules/health/health.module";
import { MeetingsModule } from "./modules/meetings/meetings.module";
import { NewsModule } from "./modules/news/news.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { PagesModule } from "./modules/pages/pages.module";
import { StandardsModule } from "./modules/standards/standards.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  controllers: [AppController],
  imports: [
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    PagesModule,
    NewsModule,
    DocumentsModule,
    StandardsModule,
    MeetingsModule,
    ApprovalModule,
    NotificationsModule,
    AuditModule
  ]
})
export class AppModule {}
