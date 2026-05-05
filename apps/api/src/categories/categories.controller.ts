import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createCategoryInputSchema, updateCategoryInputSchema } from '@nookapp/protocol';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthSession } from '../auth/auth.types';
import { ZodPipe } from '../common/zod.pipe';
import { ServerScopeGuard } from '../members/server-scope.guard';
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@Controller('servers/:serverId/categories')
@UseGuards(AuthGuard, ServerScopeGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  list(@CurrentUser() user: AuthSession['user'], @Param('serverId') serverId: string) {
    return this.categoriesService.listCategories(serverId, user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Body(new ZodPipe(createCategoryInputSchema))
    body: ReturnType<typeof createCategoryInputSchema.parse>,
  ) {
    return this.categoriesService.createCategory(serverId, user.id, body);
  }

  @Patch(':categoryId')
  update(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('categoryId') categoryId: string,
    @Body(new ZodPipe(updateCategoryInputSchema))
    body: ReturnType<typeof updateCategoryInputSchema.parse>,
  ) {
    return this.categoriesService.updateCategory(serverId, categoryId, user.id, body);
  }

  @Delete(':categoryId')
  remove(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.categoriesService.deleteCategory(serverId, categoryId, user.id);
  }
}
