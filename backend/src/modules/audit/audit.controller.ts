import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditService } from './audit.service';

@ApiTags('Auditoría & Trazabilidad (Admin)')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'support')
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Consultar logs de auditoría automáticos (Admin / Support)' })
  async getAuditLogs(
    @Query('tableName') tableName?: string,
    @Query('recordId') recordId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getAuditLogs(tableName, recordId, limit ? Number(limit) : 50);
  }
}
