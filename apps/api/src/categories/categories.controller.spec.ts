import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { ServerScopeGuard } from '../members/server-scope.guard';
import type { AuthSession } from '../auth/auth.types';
import { StorageService } from '../common/storage';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

const user: AuthSession['user'] = {
  id: 'u1',
  email: 'u1@nookapp.test',
  name: 'User One',
  emailVerified: true,
  createdAt: new Date('2025-01-01'),
};

const uploaded = { filename: 'pic.png', path: '/tmp/pic.png', mimetype: 'image/png' };

const mockCategoriesService = {
  listCategories: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
};

const mockStorage = {
  urlFor: jest.fn(),
  deleteByUrl: jest.fn(),
};

const allowAll = { canActivate: () => true };

describe('CategoriesController', () => {
  let controller: CategoriesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: CategoriesService, useValue: mockCategoriesService },
        { provide: StorageService, useValue: mockStorage },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(allowAll)
      .overrideGuard(ServerScopeGuard)
      .useValue(allowAll)
      .compile();
    controller = module.get(CategoriesController);
  });

  it('lists categories scoped to the server from the path', async () => {
    mockCategoriesService.listCategories.mockResolvedValue([]);

    await controller.list(user, 's1');
    expect(mockCategoriesService.listCategories).toHaveBeenCalledWith('s1', 'u1');
  });

  it('creates a category with the server scope and the acting user', async () => {
    mockCategoriesService.createCategory.mockResolvedValue({ id: 'cat1' });

    await controller.create(user, 's1', { name: 'Lounge' });
    expect(mockCategoriesService.createCategory).toHaveBeenCalledWith('s1', 'u1', {
      name: 'Lounge',
    });
  });

  it('updates a category with both path params in the documented order', async () => {
    mockCategoriesService.updateCategory.mockResolvedValue({ id: 'cat1' });

    await controller.update(user, 's1', 'cat1', { name: 'Renamed' });
    expect(mockCategoriesService.updateCategory).toHaveBeenCalledWith('s1', 'cat1', 'u1', {
      name: 'Renamed',
    });
  });

  it('deletes a category with the server scope and the acting user', async () => {
    mockCategoriesService.deleteCategory.mockResolvedValue(undefined);

    await controller.remove(user, 's1', 'cat1');
    expect(mockCategoriesService.deleteCategory).toHaveBeenCalledWith('s1', 'cat1', 'u1');
  });

  describe('uploadIcon', () => {
    it('rejects a request without a file', async () => {
      await expect(controller.uploadIcon(user, 's1', 'cat1', undefined)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockCategoriesService.updateCategory).not.toHaveBeenCalled();
    });

    it('persists the storage url on the scoped category', async () => {
      mockStorage.urlFor.mockReturnValue('/uploads/category-icons/pic.png');
      mockCategoriesService.updateCategory.mockResolvedValue({ id: 'cat1' });

      await controller.uploadIcon(user, 's1', 'cat1', uploaded);
      expect(mockStorage.urlFor).toHaveBeenCalledWith('category-icons', 'pic.png');
      expect(mockCategoriesService.updateCategory).toHaveBeenCalledWith('s1', 'cat1', 'u1', {
        iconUrl: '/uploads/category-icons/pic.png',
      });
    });
  });

  describe('uploadBanner', () => {
    it('rejects a request without a file', async () => {
      await expect(controller.uploadBanner(user, 's1', 'cat1', undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('persists the storage url on the scoped category', async () => {
      mockStorage.urlFor.mockReturnValue('/uploads/category-banners/pic.png');
      mockCategoriesService.updateCategory.mockResolvedValue({ id: 'cat1' });

      await controller.uploadBanner(user, 's1', 'cat1', uploaded);
      expect(mockStorage.urlFor).toHaveBeenCalledWith('category-banners', 'pic.png');
      expect(mockCategoriesService.updateCategory).toHaveBeenCalledWith('s1', 'cat1', 'u1', {
        bannerUrl: '/uploads/category-banners/pic.png',
      });
    });

    it('propagates a missing category from the service', async () => {
      mockStorage.urlFor.mockReturnValue('/uploads/category-banners/pic.png');
      mockCategoriesService.updateCategory.mockRejectedValue(new NotFoundException());

      await expect(controller.uploadBanner(user, 's1', 'cat1', uploaded)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
