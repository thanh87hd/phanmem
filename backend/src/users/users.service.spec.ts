import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;

  const mockUserRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    })
      .useMocker(() => ({}))
      .compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should create a user and hash password', async () => {
    const userData = { username: 'newuser', password: 'plainpassword' };
    mockUserRepo.create.mockReturnValue(userData);
    mockUserRepo.save.mockResolvedValue({ ...userData, id: 1 });

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

    const result = await service.create(userData as any);
    expect(result).toBeDefined();
    expect(mockUserRepo.save).toHaveBeenCalled();
  });

  it('should find user by username', async () => {
    mockUserRepo.findOne.mockResolvedValue({ username: 'test' });
    const result = await service.findOneByUsername('test');
    expect(result?.username).toBe('test');
  });
});
