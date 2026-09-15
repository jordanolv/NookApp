import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { createCategoryInputSchema, updateCategoryInputSchema } from '@nookapp/protocol';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthSession } from '../auth/auth.types';
import { imageUploadOptions, StorageService } from '../common/storage';
import { ZodPipe } from '../common/zod.pipe';
import { ServerScopeGuard } from '../members/server-scope.guard';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CategoriesService } from './categories.service';

interface UploadedFileMeta {
  filename: string;
  path: string;
  mimetype: string;
}

@ApiTags('categories')
@Controller('servers/:serverId/categories')
@UseGuards(AuthGuard, ServerScopeGuard)
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly storageService: StorageService,
    private readonly gateway: RealtimeGateway,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthSession['user'], @Param('serverId') serverId: string) {
    return this.categoriesService.listCategories(serverId, user.id);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Body(new ZodPipe(createCategoryInputSchema))
    body: ReturnType<typeof createCategoryInputSchema.parse>,
  ) {
    const created = await this.categoriesService.createCategory(serverId, user.id, body);
    this.gateway.emitToServer(serverId, 'channels:changed', { actorId: user.id });
    return created;
  }

  @Patch(':categoryId')
  async update(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('categoryId') categoryId: string,
    @Body(new ZodPipe(updateCategoryInputSchema))
    body: ReturnType<typeof updateCategoryInputSchema.parse>,
  ) {
    const updated = await this.categoriesService.updateCategory(
      serverId,
      categoryId,
      user.id,
      body,
    );
    this.gateway.emitToServer(serverId, 'channels:changed', { actorId: user.id });
    return updated;
  }

  @Delete(':categoryId')
  async remove(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('categoryId') categoryId: string,
  ) {
    await this.categoriesService.deleteCategory(serverId, categoryId, user.id);
    this.gateway.emitToServer(serverId, 'channels:changed', { actorId: user.id });
  }

  @Post(':categoryId/icon')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions({ scope: 'category-icons' })))
  async uploadIcon(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('categoryId') categoryId: string,
    @UploadedFile() file: UploadedFileMeta | undefined,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = this.storageService.urlFor('category-icons', file.filename);
    const updated = await this.categoriesService.updateCategory(serverId, categoryId, user.id, {
      iconUrl: url,
    });
    this.gateway.emitToServer(serverId, 'channels:changed', { actorId: user.id });
    return updated;
  }

  @Post(':categoryId/banner')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions({ scope: 'category-banners' })))
  async uploadBanner(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('categoryId') categoryId: string,
    @UploadedFile() file: UploadedFileMeta | undefined,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = this.storageService.urlFor('category-banners', file.filename);
    const updated = await this.categoriesService.updateCategory(serverId, categoryId, user.id, {
      bannerUrl: url,
    });
    this.gateway.emitToServer(serverId, 'channels:changed', { actorId: user.id });
    return updated;
  }
}
