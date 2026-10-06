import { Test, TestingModule } from '@nestjs/testing';
import { FileAssetsController } from './file-assets.controller';
import { FileAssetsService } from './file-assets.service';
import { FastifyReply } from 'fastify';

describe('FileAssetsController - Inline Preview (TC-WP-04)', () => {
  let controller: FileAssetsController;
  let mockFileAssetsService: any;
  let mockReply: any;

  beforeEach(async () => {
    mockFileAssetsService = {
      getFileStreamByLinkId: jest.fn().mockResolvedValue({
        stream: 'mock-stream',
        asset: {
          mimeType: 'application/pdf',
          originalName: 'Bien_ban_kiem_toan.pdf',
        },
      }),
      getFileStreamByAssetId: jest.fn().mockResolvedValue({
        stream: 'mock-stream-2',
        asset: {
          mimeType: 'image/png',
          originalName: 'Bang_chung_anh.png',
        },
      }),
    };

    mockReply = {
      type: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      send: jest.fn().mockImplementation((data) => data),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileAssetsController],
      providers: [
        {
          provide: FileAssetsService,
          useValue: mockFileAssetsService,
        },
      ],
    }).compile();

    controller = module.get<FileAssetsController>(FileAssetsController);
  });

  it('should return Content-Disposition inline when inline="true" query is passed', async () => {
    await controller.downloadByLink(101, mockReply as FastifyReply, 'true');

    expect(mockReply.type).toHaveBeenCalledWith('application/pdf');
    expect(mockReply.header).toHaveBeenCalledWith(
      'Content-Disposition',
      'inline; filename="Bien_ban_kiem_toan.pdf"',
    );
    expect(mockReply.send).toHaveBeenCalledWith('mock-stream');
  });

  it('should return Content-Disposition attachment when inline query is omitted', async () => {
    await controller.downloadByLink(101, mockReply as FastifyReply, undefined);

    expect(mockReply.header).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="Bien_ban_kiem_toan.pdf"',
    );
  });

  it('should return Content-Disposition inline for assetId download when inline="1"', async () => {
    await controller.downloadByAsset(202, mockReply as FastifyReply, '1');

    expect(mockReply.type).toHaveBeenCalledWith('image/png');
    expect(mockReply.header).toHaveBeenCalledWith(
      'Content-Disposition',
      'inline; filename="Bang_chung_anh.png"',
    );
  });
});
