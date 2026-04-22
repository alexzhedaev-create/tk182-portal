import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import type {
  CommitteeBackofficeData,
  CommitteeEditableOrganizationRecord,
  CommitteeEditablePersonRecord,
  CommitteeRoleAssignmentRecord,
  CommitteeRoleSummary,
  CommitteeStructureResponse,
  CreateCommitteeOrganizationDto,
  CreateCommitteePersonDto,
  CreateCommitteeRoleAssignmentDto,
  CreateSubcommitteeDto,
  SubcommitteeSummary,
  UpdateCommitteeOrganizationDto,
  UpdateCommitteePersonDto,
  UpdateCommitteeRoleAssignmentDto,
  UpdateSubcommitteeDto
} from "@tk182/shared-types";

import type { AuthenticatedRequest } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CommitteeService } from "./committee.service";

@Controller("committee")
export class CommitteeController {
  constructor(
    @Inject(CommitteeService) private readonly committeeService: CommitteeService
  ) {}

  @Get()
  getStructure(): Promise<CommitteeStructureResponse> {
    return this.committeeService.getStructure();
  }

  @Get("subcommittees")
  listSubcommittees(): Promise<SubcommitteeSummary[]> {
    return this.committeeService.listSubcommittees();
  }

  @Get("backoffice")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  getBackofficeData(): Promise<CommitteeBackofficeData> {
    return this.committeeService.getBackofficeData();
  }

  @Get("backoffice/organizations")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listOrganizations(): Promise<CommitteeEditableOrganizationRecord[]> {
    return this.committeeService.listOrganizations();
  }

  @Post("backoffice/organizations")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  createOrganization(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateCommitteeOrganizationDto
  ): Promise<CommitteeEditableOrganizationRecord> {
    return this.committeeService.createOrganization(
      request.authSession!.user.id,
      payload
    );
  }

  @Patch("backoffice/organizations/:organizationId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  updateOrganization(
    @Req() request: AuthenticatedRequest,
    @Param("organizationId") organizationId: string,
    @Body() payload: UpdateCommitteeOrganizationDto
  ): Promise<CommitteeEditableOrganizationRecord> {
    return this.committeeService.updateOrganization(
      request.authSession!.user.id,
      organizationId,
      payload
    );
  }

  @Get("backoffice/people")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listPeople(): Promise<CommitteeEditablePersonRecord[]> {
    return this.committeeService.listPeople();
  }

  @Post("backoffice/people")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  createPerson(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateCommitteePersonDto
  ): Promise<CommitteeEditablePersonRecord> {
    return this.committeeService.createPerson(request.authSession!.user.id, payload);
  }

  @Patch("backoffice/people/:personId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  updatePerson(
    @Req() request: AuthenticatedRequest,
    @Param("personId") personId: string,
    @Body() payload: UpdateCommitteePersonDto
  ): Promise<CommitteeEditablePersonRecord> {
    return this.committeeService.updatePerson(
      request.authSession!.user.id,
      personId,
      payload
    );
  }

  @Get("backoffice/roles")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listRoles(): Promise<CommitteeRoleSummary[]> {
    return this.committeeService.listRoles();
  }

  @Get("backoffice/role-assignments")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listRoleAssignments(): Promise<CommitteeRoleAssignmentRecord[]> {
    return this.committeeService.listRoleAssignments();
  }

  @Post("backoffice/role-assignments")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  createRoleAssignment(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateCommitteeRoleAssignmentDto
  ): Promise<CommitteeRoleAssignmentRecord> {
    return this.committeeService.createRoleAssignment(
      request.authSession!.user.id,
      payload
    );
  }

  @Patch("backoffice/role-assignments/:assignmentId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  updateRoleAssignment(
    @Req() request: AuthenticatedRequest,
    @Param("assignmentId") assignmentId: string,
    @Body() payload: UpdateCommitteeRoleAssignmentDto
  ): Promise<CommitteeRoleAssignmentRecord> {
    return this.committeeService.updateRoleAssignment(
      request.authSession!.user.id,
      assignmentId,
      payload
    );
  }

  @Get("backoffice/subcommittees")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  listBackofficeSubcommittees(): Promise<SubcommitteeSummary[]> {
    return this.committeeService.listSubcommittees();
  }

  @Post("backoffice/subcommittees")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  createSubcommittee(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateSubcommitteeDto
  ): Promise<SubcommitteeSummary> {
    return this.committeeService.createSubcommittee(
      request.authSession!.user.id,
      payload
    );
  }

  @Patch("backoffice/subcommittees/:subcommitteeId")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles("SECRETARIAT", "ADMIN")
  updateSubcommittee(
    @Req() request: AuthenticatedRequest,
    @Param("subcommitteeId") subcommitteeId: string,
    @Body() payload: UpdateSubcommitteeDto
  ): Promise<SubcommitteeSummary> {
    return this.committeeService.updateSubcommittee(
      request.authSession!.user.id,
      subcommitteeId,
      payload
    );
  }
}
