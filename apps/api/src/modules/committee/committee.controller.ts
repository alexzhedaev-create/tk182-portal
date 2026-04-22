import { Controller, Get } from "@nestjs/common";
import type { CommitteeStructureResponse, SubcommitteeSummary } from "@tk182/shared-types";

import { CommitteeService } from "./committee.service";

@Controller("committee")
export class CommitteeController {
  constructor(private readonly committeeService: CommitteeService) {}

  @Get()
  getStructure(): Promise<CommitteeStructureResponse> {
    return this.committeeService.getStructure();
  }

  @Get("subcommittees")
  listSubcommittees(): Promise<SubcommitteeSummary[]> {
    return this.committeeService.listSubcommittees();
  }
}
