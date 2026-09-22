import { Test, TestingModule } from '@nestjs/testing';
import { OllamaService } from './ollama.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OllamaService (TDD)', () => {
  let service: OllamaService;

  beforeEach(async () => {
    // Clear mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [OllamaService],
    })
      .useMocker(() => ({}))
      .compile();

    service = module.get<OllamaService>(OllamaService);
    // Suppress logger output in tests
    jest.spyOn(service['logger'], 'log').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('HTTP Client Integration (Axios)', () => {
    beforeEach(() => {
      // Mock checkAvailability's GET request so service.available becomes true
      mockedAxios.get.mockResolvedValue({ data: { models: [] } });
    });

    it('should use axios.post for generateJSON', async () => {
      // Arrange
      const mockResponse = { data: { response: '{"isDuplicate": false}' } };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.generateJSON({ prompt: 'test prompt' });

      // Assert
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:11434/api/generate'),
        expect.objectContaining({
          prompt: 'test prompt',
          format: 'json',
          stream: false,
        }),
        expect.objectContaining({ timeout: expect.any(Number) }),
      );
      expect(result).toEqual({ isDuplicate: false });
    });

    it('should handle ECONNABORTED (Timeout) gracefully', async () => {
      // Arrange
      const error = new Error('Timeout') as any;
      error.code = 'ECONNABORTED';
      mockedAxios.post.mockRejectedValueOnce(error);

      // Act
      const result = await service.generateJSON({
        prompt: 'test',
        timeoutMs: 100,
      });

      // Assert
      expect(result).toBeNull();
    });
  });
});
