import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('System')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API Root & System Status' })
  getRoot() {
    return {
      name: 'MaskayPet API',
      status: 'online',
      version: '1.0.0',
      docs: '/docs',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'System Health Check' })
  getHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
